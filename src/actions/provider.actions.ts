
"use server";

import { db } from "@/db";
import { providerProfiles, users, serviceRequests } from "@/db/schema";
import { eq, and, sql, desc, gte } from "drizzle-orm";
import { requireSession } from "@/lib/auth/session";
import { success, error, type ActionResult } from "@/lib/result";
import { z } from "zod";
import { isAppError } from "@/lib/errors";
import { createOrUpdateProviderProfile } from "@/services/provider.service";
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

const onboardingSchema = z.object({
  qualification: z.string().min(2),
  registrationNumber: z.string().min(2),
  registrationAuthority: z.string().min(2),
  specializationArea: z.string().optional(),
  yearsOfExperience: z.coerce.number().int().min(0).optional(),
  serviceRadiusMeters: z.coerce.number().int().min(0).optional(),
  baseVisitFeePaise: z.coerce.number().int().min(0),
  perKmFeePaise: z.coerce.number().int().min(0),
  preferWhatsApp: z.preprocess((v) => v === "true" || v === "on" || v === true, z.boolean()),
});

/**
 * Handle provider onboarding and document upload
 */
export async function onboardingAction(
  formData: FormData
): Promise<ActionResult<void>> {
  try {
    const session = await requireSession();
    if (session.user.role !== "VET_DOCTOR" && session.user.role !== "PARAVET_WORKER") {
      return error("FORBIDDEN", "errors.FORBIDDEN");
    }

    const input = onboardingSchema.parse({
      qualification: formData.get("qualification"),
      registrationNumber: formData.get("registrationNumber"),
      registrationAuthority: formData.get("registrationAuthority"),
      specializationArea: formData.get("specializationArea") || undefined,
      yearsOfExperience: formData.get("yearsOfExperience") || undefined,
      serviceRadiusMeters: formData.get("serviceRadiusMeters") || undefined,
      baseVisitFeePaise: formData.get("baseVisitFeePaise"),
      perKmFeePaise: formData.get("perKmFeePaise"),
      preferWhatsApp: formData.get("preferWhatsApp"),
    });

    const file = formData.get("document") as File | null;
    let documentPath: string | undefined = undefined;
    let documentMimeType: string | undefined = undefined;

    if (file && file.size > 0) {
      if (file.size > 5 * 1024 * 1024) {
        return error("VALIDATION_ERROR", "File too large. Max 5MB allowed.");
      }
      const allowedTypes = ["application/pdf", "image/jpeg", "image/png"];
      if (!allowedTypes.includes(file.type)) {
        return error("VALIDATION_ERROR", "Invalid file type. Only PDF, JPG, and PNG are allowed.");
      }

      const storageDir = path.join(process.cwd(), "storage", "documents");
      await fs.mkdir(storageDir, { recursive: true });

      const ext = path.extname(file.name) || (file.type === "application/pdf" ? ".pdf" : ".jpg");
      const filename = `${session.user.id}_${crypto.randomBytes(4).toString("hex")}${ext}`;
      const filePath = path.join(storageDir, filename);

      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      await fs.writeFile(filePath, buffer);

      documentPath = filePath;
      documentMimeType = file.type;
    }

    const normalizedReg = input.registrationNumber.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");

    await createOrUpdateProviderProfile({
      userId: session.user.id,
      qualification: input.qualification,
      registrationNumber: input.registrationNumber,
      registrationNumberNormalized: normalizedReg,
      registrationAuthority: input.registrationAuthority,
      specializationArea: input.specializationArea,
      yearsOfExperience: input.yearsOfExperience,
      serviceRadiusMeters: input.serviceRadiusMeters,
      baseVisitFeePaise: input.baseVisitFeePaise,
      perKmFeePaise: input.perKmFeePaise,
      preferWhatsApp: input.preferWhatsApp,
      registrationDocumentPath: documentPath,
      registrationDocumentMimeType: documentMimeType,
    });

    return success(undefined);
  } catch (err) {
    if (isAppError(err)) {
      return error(err.code as any, err.message);
    }

    if (err instanceof z.ZodError) {
      const fieldErrors: Record<string, string[]> = {};
      for (const issue of err.issues) {
        const field = issue.path[0] as string;
        if (!fieldErrors[field]) fieldErrors[field] = [];
        fieldErrors[field].push(issue.message);
      }
      return error("VALIDATION_ERROR", "errors.VALIDATION_ERROR", { fieldErrors });
    }

    console.error("Onboarding error:", err);
    return error("INTERNAL_ERROR", "errors.INTERNAL_ERROR");
  }
}

const toggleDutySchema = z.object({
  dutyStatus: z.enum(["ON_DUTY", "OFF_DUTY"]),
  latitude: z.string().optional(),
  longitude: z.string().optional(),
});

const getProfileSchema = z.object({
  providerId: z.string().uuid().optional(),
});

const updateLocationSchema = z.object({
  latitude: z.string(),
  longitude: z.string(),
  accuracyM: z.string().optional(),
});

export type ToggleDutyInput = z.infer<typeof toggleDutySchema>;
export type GetProfileInput = z.infer<typeof getProfileSchema>;

export type ProviderProfileResult = {
  id: string;
  userId: string;
  name: string;
  phone: string;
  role: "VET_DOCTOR" | "PARAVET_WORKER";
  registrationNumber: string;
  registrationNumberNormalized: string;
  registrationAuthority: string;
  certificateNumber: string | null;
  certificateIssuer: string | null;
  qualification: string;
  specializationArea: string | null;
  yearsOfExperience: number | null;
  bio: string | null;
  district: string | null;
  state: string | null;
  villageOrServiceArea: string | null;
  baseVisitFeePaise: number | null;
  perKmFeePaise: number | null;
  serviceRadiusMeters: number | null;
  preferWhatsApp: boolean;
  verificationStatus: string;
  verificationReviewedAt: Date | null;
  verificationReason: string | null;
  dutyStatus: string;
  dutyExpiresAt: Date | null;
  latitude: string | null;
  longitude: string | null;
  locationConfirmedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

/**
 * Toggle provider duty status with 8-hour lease
 */
export async function toggleDutyStatusAction(
  formData: FormData
): Promise<ActionResult<ProviderProfileResult>> {
  try {
    const input = toggleDutySchema.parse({
      dutyStatus: formData.get("dutyStatus"),
      latitude: formData.get("latitude") || undefined,
      longitude: formData.get("longitude") || undefined,
    });

    const session = await requireSession();
    if (session.user.role !== "VET_DOCTOR" && session.user.role !== "PARAVET_WORKER") {
      return error("UNAUTHENTICATED", "errors.UNAUTHENTICATED");
    }

    const [provider] = await db
      .select({
        userId: providerProfiles.userId,
        verificationStatus: providerProfiles.verificationStatus,
        latitude: providerProfiles.latitude,
        longitude: providerProfiles.longitude,
      })
      .from(providerProfiles)
      .where(eq(providerProfiles.userId, session.user.id))
      .limit(1);

    if (!provider) {
      return error("NOT_FOUND", "errors.NOT_FOUND");
    }

    if (input.dutyStatus === "ON_DUTY") {
      if (provider.verificationStatus !== "VERIFIED") {
        return error("FORBIDDEN", "Only verified providers can go on duty");
      }

      const effectiveLat = input.latitude || provider.latitude;
      const effectiveLng = input.longitude || provider.longitude;

      if (!effectiveLat || !effectiveLng) {
        return error("VALIDATION_ERROR", "A valid confirmed location is required to go on duty");
      }
    }

    const isGoingOnDuty = input.dutyStatus === "ON_DUTY";
    const now = new Date();
    const dutyExpiresAt = isGoingOnDuty ? new Date(now.getTime() + 8 * 60 * 60 * 1000) : null;

    const updateData: {
      dutyStatus: string;
      dutyExpiresAt: Date | null;
      updatedAt: Date;
      latitude?: string;
      longitude?: string;
      locationConfirmedAt?: Date;
    } = {
      dutyStatus: input.dutyStatus,
      dutyExpiresAt,
      updatedAt: now,
    };

    if (input.latitude && input.longitude) {
      updateData.latitude = input.latitude;
      updateData.longitude = input.longitude;
      updateData.locationConfirmedAt = now;
    } else if (isGoingOnDuty) {
      updateData.locationConfirmedAt = now;
    }

    const [updated] = await db
      .update(providerProfiles)
      .set(updateData)
      .where(eq(providerProfiles.userId, session.user.id))
      .returning();

    if (!updated) {
      return error("INTERNAL_ERROR", "errors.INTERNAL_ERROR");
    }

    const [user] = await db
      .select({ name: users.name, phone: users.phone, role: users.role })
      .from(users)
      .where(eq(users.id, session.user.id))
      .limit(1);

    return success({
      id: updated.userId,
      userId: updated.userId,
      name: user?.name || "",
      phone: user?.phone || "",
      role: user?.role as "VET_DOCTOR" | "PARAVET_WORKER",
      registrationNumber: updated.registrationNumber,
      registrationNumberNormalized: updated.registrationNumberNormalized,
      registrationAuthority: updated.registrationAuthority,
      certificateNumber: updated.certificateNumber,
      certificateIssuer: updated.certificateIssuer,
      qualification: updated.qualification,
      specializationArea: updated.specializationArea,
      yearsOfExperience: updated.yearsOfExperience,
      bio: updated.bio,
      district: updated.district,
      state: updated.state,
      villageOrServiceArea: updated.villageOrServiceArea,
      baseVisitFeePaise: updated.baseVisitFeePaise,
      perKmFeePaise: updated.perKmFeePaise,
      serviceRadiusMeters: updated.serviceRadiusMeters,
      preferWhatsApp: updated.preferWhatsApp,
      verificationStatus: updated.verificationStatus,
      verificationReviewedAt: updated.verificationReviewedAt,
      verificationReason: updated.verificationReason,
      dutyStatus: updated.dutyStatus,
      dutyExpiresAt: updated.dutyExpiresAt,
      latitude: updated.latitude,
      longitude: updated.longitude,
      locationConfirmedAt: updated.locationConfirmedAt,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    });
  } catch (err) {
    if (isAppError(err)) {
      return error(err.code as any, `errors.${err.code}`);
    }

    if (err instanceof z.ZodError) {
      const fieldErrors: Record<string, string[]> = {};
      for (const issue of err.issues) {
        const field = issue.path[0] as string;
        if (!fieldErrors[field]) fieldErrors[field] = [];
        fieldErrors[field].push(issue.message);
      }
      return error("VALIDATION_ERROR", "errors.VALIDATION_ERROR", { fieldErrors });
    }

    console.error("Toggle duty error:", err);
    return error("INTERNAL_ERROR", "errors.INTERNAL_ERROR");
  }
}

/**
 * Get provider profile
 */
export async function getProviderProfileAction(
  formData: FormData
): Promise<ActionResult<ProviderProfileResult>> {
  try {
    const input = getProfileSchema.parse({
      providerId: formData.get("providerId") || undefined,
    });

    const session = await requireSession();
    const targetProviderId = input.providerId || session.user.id;

    // Allow providers to view only their own profile
    if (targetProviderId !== session.user.id) {
      return error("FORBIDDEN", "errors.FORBIDDEN");
    }

    const [profile] = await db
      .select({
        id: providerProfiles.userId,
        userId: providerProfiles.userId,
        name: users.name,
        phone: users.phone,
        role: users.role,
        registrationNumber: providerProfiles.registrationNumber,
        registrationNumberNormalized: providerProfiles.registrationNumberNormalized,
        registrationAuthority: providerProfiles.registrationAuthority,
        certificateNumber: providerProfiles.certificateNumber,
        certificateIssuer: providerProfiles.certificateIssuer,
        qualification: providerProfiles.qualification,
        specializationArea: providerProfiles.specializationArea,
        yearsOfExperience: providerProfiles.yearsOfExperience,
        bio: providerProfiles.bio,
        district: providerProfiles.district,
        state: providerProfiles.state,
        villageOrServiceArea: providerProfiles.villageOrServiceArea,
        baseVisitFeePaise: providerProfiles.baseVisitFeePaise,
        perKmFeePaise: providerProfiles.perKmFeePaise,
        serviceRadiusMeters: providerProfiles.serviceRadiusMeters,
        preferWhatsApp: providerProfiles.preferWhatsApp,
        latitude: providerProfiles.latitude,
        longitude: providerProfiles.longitude,
        locationConfirmedAt: providerProfiles.locationConfirmedAt,
        dutyStatus: providerProfiles.dutyStatus,
        dutyExpiresAt: providerProfiles.dutyExpiresAt,
        verificationStatus: providerProfiles.verificationStatus,
        verificationReviewedAt: providerProfiles.verificationReviewedAt,
        verificationReason: providerProfiles.verificationReason,
        createdAt: providerProfiles.createdAt,
        updatedAt: providerProfiles.updatedAt,
      })
      .from(providerProfiles)
      .innerJoin(users, eq(providerProfiles.userId, users.id))
      .where(eq(providerProfiles.userId, targetProviderId))
      .limit(1);

    if (!profile) {
      return error("NOT_FOUND", "errors.NOT_FOUND");
    }

    return success({
      id: profile.id,
      userId: profile.userId,
      name: profile.name,
      phone: profile.phone,
      role: profile.role as "VET_DOCTOR" | "PARAVET_WORKER",
      registrationNumber: profile.registrationNumber,
      registrationNumberNormalized: profile.registrationNumberNormalized,
      registrationAuthority: profile.registrationAuthority,
      certificateNumber: profile.certificateNumber,
      certificateIssuer: profile.certificateIssuer,
      qualification: profile.qualification,
      specializationArea: profile.specializationArea,
      yearsOfExperience: profile.yearsOfExperience,
      bio: profile.bio,
      district: profile.district,
      state: profile.state,
      villageOrServiceArea: profile.villageOrServiceArea,
      baseVisitFeePaise: profile.baseVisitFeePaise,
      perKmFeePaise: profile.perKmFeePaise,
      serviceRadiusMeters: profile.serviceRadiusMeters,
      preferWhatsApp: profile.preferWhatsApp,
      verificationStatus: profile.verificationStatus,
      verificationReviewedAt: profile.verificationReviewedAt,
      verificationReason: profile.verificationReason,
      dutyStatus: profile.dutyStatus,
      dutyExpiresAt: profile.dutyExpiresAt,
      latitude: profile.latitude,
      longitude: profile.longitude,
      locationConfirmedAt: profile.locationConfirmedAt,
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
    });
  } catch (err) {
    if (isAppError(err)) {
      return error(err.code as any, err.message);
    }

    if (err instanceof z.ZodError) {
      const fieldErrors: Record<string, string[]> = {};
      for (const issue of err.issues) {
        const field = issue.path[0] as string;
        if (!fieldErrors[field]) fieldErrors[field] = [];
        fieldErrors[field].push(issue.message);
      }
      return error("VALIDATION_ERROR", "errors.VALIDATION_ERROR", { fieldErrors });
    }

    console.error("Get provider profile error:", err);
    return error("INTERNAL_ERROR", "errors.INTERNAL_ERROR");
  }
}

/**
 * Renew 8-hour duty lease
 */
export async function renewDutyAction(): Promise<ActionResult<{ dutyExpiresAt: Date }>> {
  try {
    const session = await requireSession();
    if (session.user.role !== "VET_DOCTOR" && session.user.role !== "PARAVET_WORKER") {
      return error("UNAUTHENTICATED", "errors.UNAUTHENTICATED");
    }

    const [provider] = await db
      .select({
        verificationStatus: providerProfiles.verificationStatus,
        dutyStatus: providerProfiles.dutyStatus,
      })
      .from(providerProfiles)
      .where(eq(providerProfiles.userId, session.user.id))
      .limit(1);

    if (!provider) return error("NOT_FOUND", "errors.NOT_FOUND");
    if (provider.verificationStatus !== "VERIFIED") {
      return error("FORBIDDEN", "Only verified providers can renew duty");
    }

    const newExpiry = new Date(Date.now() + 8 * 60 * 60 * 1000);
    await db
      .update(providerProfiles)
      .set({
        dutyStatus: "ON_DUTY",
        dutyExpiresAt: newExpiry,
        locationConfirmedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(providerProfiles.userId, session.user.id));

    return success({ dutyExpiresAt: newExpiry });
  } catch (err) {
    console.error("Renew duty error:", err);
    return error("INTERNAL_ERROR", "errors.INTERNAL_ERROR");
  }
}

/**
 * Update provider location
 */
export async function updateLocationAction(
  formData: FormData
): Promise<ActionResult<{ locationConfirmedAt: Date }>> {
  try {
    const session = await requireSession();
    if (session.user.role !== "VET_DOCTOR" && session.user.role !== "PARAVET_WORKER") {
      return error("UNAUTHENTICATED", "errors.UNAUTHENTICATED");
    }

    const input = updateLocationSchema.parse({
      latitude: formData.get("latitude"),
      longitude: formData.get("longitude"),
      accuracyM: formData.get("accuracyM") || undefined,
    });

    const now = new Date();
    await db
      .update(providerProfiles)
      .set({
        latitude: input.latitude,
        longitude: input.longitude,
        locationAccuracyM: input.accuracyM,
        locationConfirmedAt: now,
        updatedAt: now,
      })
      .where(eq(providerProfiles.userId, session.user.id));

    return success({ locationConfirmedAt: now });
  } catch (err) {
    console.error("Update location error:", err);
    return error("INTERNAL_ERROR", "errors.INTERNAL_ERROR");
  }
}