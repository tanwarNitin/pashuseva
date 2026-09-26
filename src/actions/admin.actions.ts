"use server";

import { db } from "@/db";
import { users, providerProfiles, credentialReviews } from "@/db/schema";
import { requireAdmin } from "@/lib/auth/session";
import { eq, and, ne, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function getProvidersAction(status?: string) {
  await requireAdmin();

  let query = db
    .select({
      id: users.id,
      name: users.name,
      role: users.role,
      phone: users.phone,
      qualification: providerProfiles.qualification,
      registrationNumber: providerProfiles.registrationNumber,
      registrationAuthority: providerProfiles.registrationAuthority,
      registrationDocumentPath: providerProfiles.registrationDocumentPath,
      verificationStatus: providerProfiles.verificationStatus,
      createdAt: providerProfiles.createdAt,
    })
    .from(users)
    .innerJoin(providerProfiles, eq(users.id, providerProfiles.userId));

  if (status) {
    query = query.where(eq(providerProfiles.verificationStatus, status as any)) as any;
  }

  const result = await query.orderBy(desc(providerProfiles.createdAt));
  return result;
}

export async function reviewProviderAction(params: {
  providerId: string;
  decision: "VERIFIED" | "REJECTED" | "SUSPENDED" | "PENDING";
  notes?: string;
  evidenceReference?: string;
}) {
  const { user: admin } = await requireAdmin();

  const { providerId, decision, notes, evidenceReference } = params;

  // Validate provider exists
  const [provider] = await db
    .select()
    .from(providerProfiles)
    .where(eq(providerProfiles.userId, providerId))
    .limit(1);

  if (!provider) {
    throw new Error("Provider not found");
  }

  if (decision === "VERIFIED") {
    if (!provider.registrationNumber || !provider.registrationAuthority || !provider.qualification) {
      throw new Error("Incomplete provider credentials for VERIFIED status");
    }

    const [duplicateVerified] = await db
      .select({ id: providerProfiles.userId })
      .from(providerProfiles)
      .where(
        and(
          eq(providerProfiles.registrationNumberNormalized, provider.registrationNumberNormalized!),
          eq(providerProfiles.verificationStatus, "VERIFIED"),
          ne(providerProfiles.userId, providerId)
        )
      )
      .limit(1);

    if (duplicateVerified) {
      throw new Error(`Registration number '${provider.registrationNumber}' is already verified for another provider.`);
    }
  }

  await db.transaction(async (tx) => {
    await tx.insert(credentialReviews).values({
      providerId: providerId,
      decision: decision,
      reviewerReference: admin.id,
      evidenceReference: evidenceReference || null,
      notes: notes || null,
    });

    const updateFields: any = {
      verificationStatus: decision,
      verificationReviewedAt: new Date(),
      verificationReason: notes || `Reviewed by admin ${admin.name}`,
    };

    if (decision !== "VERIFIED") {
      updateFields.dutyStatus = "OFF_DUTY";
      updateFields.dutyExpiresAt = null;
    }

    await tx
      .update(providerProfiles)
      .set(updateFields)
      .where(eq(providerProfiles.userId, providerId));
  });

  revalidatePath("/[locale]/admin/providers/verify", "page");
  return { success: true };
}
