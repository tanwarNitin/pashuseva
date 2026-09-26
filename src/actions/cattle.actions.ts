"use server";

import { requireSession } from "@/lib/auth/session";
import { db } from "@/db";
import { vaccinationRecords, healthCardConsents, users, providerProfiles, animals, medicalRecords } from "@/db/schema";
import { eq, and, isNull, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { normalizePhoneInput } from "@/lib/phone";

export async function dismissVaccinationReminder(vaccinationId: string) {
  try {
    const session = await requireSession();
    
    if (session.user.role !== "FARMER") {
      return { success: false, error: "Unauthorized" };
    }

    await db
      .update(vaccinationRecords)
      .set({ reminderDismissed: true })
      .where(
        and(
          eq(vaccinationRecords.id, vaccinationId),
          eq(vaccinationRecords.farmerId, session.user.id)
        )
      );

    revalidatePath("/[locale]/cattle", "page");
    return { success: true };
  } catch (error) {
    console.error("Failed to dismiss vaccination reminder:", error);
    return { success: false, error: "Failed to dismiss reminder" };
  }
}

export async function grantHealthCardAccess(animalId: string, providerPhoneInput: string) {
  try {
    const session = await requireSession();
    if (session.user.role !== "FARMER") return { success: false, error: "Unauthorized" };

    const normalizedPhone = normalizePhoneInput(providerPhoneInput);
    if (!normalizedPhone) return { success: false, error: "Invalid phone number format" };

    // Find the provider
    const [provider] = await db
      .select({
        userId: users.id,
        status: providerProfiles.verificationStatus
      })
      .from(users)
      .innerJoin(providerProfiles, eq(users.id, providerProfiles.userId))
      .where(
        and(
          eq(users.phone, normalizedPhone),
          eq(users.status, "ACTIVE")
        )
      )
      .limit(1);

    if (!provider) {
      return { success: false, error: "Provider not found" };
    }

    if (provider.status !== "VERIFIED") {
      return { success: false, error: "Provider is not currently verified" };
    }

    // Check if a grant already exists and is active
    const [existingGrant] = await db
      .select()
      .from(healthCardConsents)
      .where(
        and(
          eq(healthCardConsents.animalId, animalId),
          eq(healthCardConsents.providerId, provider.userId),
          isNull(healthCardConsents.revokedAt)
        )
      )
      .limit(1);

    if (existingGrant) {
      return { success: false, error: "Provider already has active access" };
    }

    // Ensure the farmer owns the animal
    const [animal] = await db
      .select()
      .from(animals)
      .where(and(eq(animals.id, animalId), eq(animals.farmerId, session.user.id)))
      .limit(1);

    if (!animal) {
      return { success: false, error: "Animal not found or you do not own it" };
    }

    // Insert grant
    await db.insert(healthCardConsents).values({
      animalId,
      farmerId: session.user.id,
      providerId: provider.userId,
    });

    revalidatePath("/[locale]/cattle/[id]", "page");
    return { success: true };
  } catch (error) {
    console.error("Failed to grant access:", error);
    return { success: false, error: "Failed to grant access" };
  }
}

export async function revokeHealthCardAccess(consentId: string) {
  try {
    const session = await requireSession();
    if (session.user.role !== "FARMER") return { success: false, error: "Unauthorized" };

    await db
      .update(healthCardConsents)
      .set({ revokedAt: new Date() })
      .where(
        and(
          eq(healthCardConsents.id, consentId),
          eq(healthCardConsents.farmerId, session.user.id),
          isNull(healthCardConsents.revokedAt)
        )
      );

    revalidatePath("/[locale]/cattle/[id]", "page");
    return { success: true };
  } catch (error) {
    console.error("Failed to revoke access:", error);
    return { success: false, error: "Failed to revoke access" };
  }
}

export async function getPastProviders(animalId: string) {
  try {
    const session = await requireSession();
    if (session.user.role !== "FARMER") return { success: false, providers: [] };

    // Get provider IDs from medical records
    const records = await db
      .select({ providerId: medicalRecords.providerUserId })
      .from(medicalRecords)
      .where(
        and(
          eq(medicalRecords.animalId, animalId),
          eq(medicalRecords.farmerId, session.user.id)
        )
      );

    // Get provider IDs from vaccinations
    const vaccinations = await db
      .select({ providerId: vaccinationRecords.providerUserId })
      .from(vaccinationRecords)
      .where(
        and(
          eq(vaccinationRecords.animalId, animalId),
          eq(vaccinationRecords.farmerId, session.user.id)
        )
      );

    const providerIdSet = new Set<string>();
    records.forEach(r => r.providerId && providerIdSet.add(r.providerId));
    vaccinations.forEach(v => v.providerId && providerIdSet.add(v.providerId));

    if (providerIdSet.size === 0) return { success: true, providers: [] };

    // Fetch details
    const providerIds = Array.from(providerIdSet);
    const pastProvidersQuery = await db
      .select({
        id: users.id,
        name: users.name,
        phone: users.phone,
        qualification: providerProfiles.qualification
      })
      .from(users)
      .innerJoin(providerProfiles, eq(users.id, providerProfiles.userId))
      .where(sql`${users.id} = ANY(${providerIds})`);

    return { success: true, providers: pastProvidersQuery };
  } catch (error) {
    console.error("Failed to get past providers:", error);
    return { success: false, providers: [] };
  }
}

export async function getActiveGrants(animalId: string) {
  try {
    const session = await requireSession();
    if (session.user.role !== "FARMER") return { success: false, grants: [] };

    const activeGrants = await db
      .select({
        id: healthCardConsents.id,
        grantedAt: healthCardConsents.grantedAt,
        provider: {
          id: users.id,
          name: users.name,
          phone: users.phone,
        }
      })
      .from(healthCardConsents)
      .innerJoin(users, eq(healthCardConsents.providerId, users.id))
      .where(
        and(
          eq(healthCardConsents.animalId, animalId),
          eq(healthCardConsents.farmerId, session.user.id),
          isNull(healthCardConsents.revokedAt)
        )
      )
      .orderBy(healthCardConsents.grantedAt);

    return { success: true, grants: activeGrants };
  } catch (error) {
    console.error("Failed to get active grants:", error);
    return { success: false, grants: [] };
  }
}

export async function getFarmerAnimalsAction() {
  try {
    const session = await requireSession();
    if (session.user.role !== "FARMER") return { success: false, animals: [] };

    const farmerAnimals = await db
      .select({
        id: animals.id,
        name: animals.name,
        tagId: animals.tagId,
        species: animals.species,
        breed: animals.breed,
      })
      .from(animals)
      .where(and(eq(animals.farmerId, session.user.id), isNull(animals.archivedAt)))
      .orderBy(animals.name);

    return { success: true, animals: farmerAnimals };
  } catch (error) {
    console.error("Failed to get farmer animals:", error);
    return { success: false, animals: [] };
  }
}
