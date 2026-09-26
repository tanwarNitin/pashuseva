import "server-only";
import { db } from "@/db";
import { providerProfiles, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { AppError } from "@/lib/errors";

export interface CreateProviderProfileInput {
  userId: string;
  qualification: string;
  bio?: string;
  district?: string;
  state?: string;
  villageOrServiceArea?: string;
  registrationNumber: string;
  registrationNumberNormalized: string;
  registrationAuthority: string;
  certificateNumber?: string;
  certificateIssuer?: string;
  specializationArea?: string;
  yearsOfExperience?: number;
  serviceRadiusMeters?: number;
  preferWhatsApp: boolean;
  baseVisitFeePaise: number;
  perKmFeePaise: number;
  registrationDocumentPath?: string;
  registrationDocumentMimeType?: string;
}

/**
 * Creates a new provider profile or updates an existing one if onboarding was incomplete.
 * Checks for duplicate normalized registration numbers.
 */
export async function createOrUpdateProviderProfile(
  input: CreateProviderProfileInput
): Promise<void> {
  // 1. Verify user exists and is a provider
  const [user] = await db
    .select({ role: users.role })
    .from(users)
    .where(eq(users.id, input.userId))
    .limit(1);

  if (!user) {
    throw new AppError("NOT_FOUND", "User not found");
  }

  if (user.role !== "VET_DOCTOR" && user.role !== "PARAVET_WORKER") {
    throw new AppError("FORBIDDEN", "User is not a provider");
  }

  // 2. Check for duplicate registration number
  const [existingDuplicate] = await db
    .select({ id: providerProfiles.userId })
    .from(providerProfiles)
    .where(eq(providerProfiles.registrationNumberNormalized, input.registrationNumberNormalized))
    .limit(1);

  if (existingDuplicate && existingDuplicate.id !== input.userId) {
    throw new AppError("CONFLICT", "Registration number is already in use by another provider");
  }

  // 3. Create or update profile
  await db.insert(providerProfiles).values({
    userId: input.userId,
    qualification: input.qualification,
    bio: input.bio,
    district: input.district,
    state: input.state,
    villageOrServiceArea: input.villageOrServiceArea,
    registrationNumber: input.registrationNumber,
    registrationNumberNormalized: input.registrationNumberNormalized,
    registrationAuthority: input.registrationAuthority,
    certificateNumber: input.certificateNumber,
    certificateIssuer: input.certificateIssuer,
    specializationArea: input.specializationArea,
    yearsOfExperience: input.yearsOfExperience,
    serviceRadiusMeters: input.serviceRadiusMeters,
    preferWhatsApp: input.preferWhatsApp,
    baseVisitFeePaise: input.baseVisitFeePaise,
    perKmFeePaise: input.perKmFeePaise,
    registrationDocumentPath: input.registrationDocumentPath,
    registrationDocumentMimeType: input.registrationDocumentMimeType,
    // Onboarding sets defaults to PENDING and OFF_DUTY automatically via schema defaults
  }).onConflictDoUpdate({
    target: providerProfiles.userId,
    set: {
      qualification: input.qualification,
      bio: input.bio,
      district: input.district,
      state: input.state,
      villageOrServiceArea: input.villageOrServiceArea,
      registrationNumber: input.registrationNumber,
      registrationNumberNormalized: input.registrationNumberNormalized,
      registrationAuthority: input.registrationAuthority,
      certificateNumber: input.certificateNumber,
      certificateIssuer: input.certificateIssuer,
      specializationArea: input.specializationArea,
      yearsOfExperience: input.yearsOfExperience,
      serviceRadiusMeters: input.serviceRadiusMeters,
      preferWhatsApp: input.preferWhatsApp,
      baseVisitFeePaise: input.baseVisitFeePaise,
      perKmFeePaise: input.perKmFeePaise,
      registrationDocumentPath: input.registrationDocumentPath,
      registrationDocumentMimeType: input.registrationDocumentMimeType,
      verificationStatus: "PENDING",
      dutyStatus: "OFF_DUTY",
      updatedAt: new Date(),
    }
  });
}
