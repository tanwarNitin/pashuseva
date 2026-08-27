"use server";

import { z } from "zod";
import { eq, and, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db, users, vetProfiles, emergencyRequests } from "@/db";
import { getCurrentUser, type SessionPayload } from "@/lib/auth";

// ─── Response Type ──────────────────────────────────────────────────────────

export interface VetActionResult {
  success: boolean;
  error?: string;
}

// ─── Validation Schemas ─────────────────────────────────────────────────────

const vetProfileSchema = z.object({
  qualification: z
    .string()
    .min(2, "Qualification is required")
    .max(100),
  registrationNo: z
    .string()
    .min(2, "Registration number is required")
    .max(50),
  clinicName: z.string().max(150).optional().default(""),
  experienceYears: z.coerce
    .number()
    .int()
    .min(0, "Experience must be 0 or more")
    .max(60),
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  addressText: z.string().min(5, "Address is required"),
  baseVisitFee: z.coerce
    .number()
    .int()
    .min(0, "Fee must be 0 or more")
    .max(10000),
  perKmFee: z.coerce
    .number()
    .int()
    .min(0, "Per-km fee must be 0 or more")
    .max(500),
  serviceRadiusKm: z.coerce
    .number()
    .int()
    .min(1, "Radius must be at least 1 km")
    .max(100),
});

// ─── Helper: Get Authenticated Vet ──────────────────────────────────────────

async function requireVetUser(): Promise<SessionPayload> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Unauthorized: Please log in.");
  }
  if (user.role !== "VET_DOCTOR" && user.role !== "PARAVET_WORKER") {
    throw new Error("Forbidden: Only vet/paravet accounts can access this.");
  }
  return user;
}

// ─── Update Vet Profile ─────────────────────────────────────────────────────

/**
 * Creates or updates the vet profile (clinic, qualifications, GPS, fees).
 */
export async function updateVetProfile(
  formData: FormData
): Promise<VetActionResult> {
  const user = await requireVetUser();

  const raw = {
    qualification: formData.get("qualification"),
    registrationNo: formData.get("registrationNo"),
    clinicName: formData.get("clinicName"),
    experienceYears: formData.get("experienceYears"),
    latitude: formData.get("latitude"),
    longitude: formData.get("longitude"),
    addressText: formData.get("addressText"),
    baseVisitFee: formData.get("baseVisitFee"),
    perKmFee: formData.get("perKmFee"),
    serviceRadiusKm: formData.get("serviceRadiusKm"),
  };

  const parsed = vetProfileSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Validation failed",
    };
  }

  const data = parsed.data;

  // Check if profile already exists
  const existing = await db
    .select({ id: vetProfiles.id })
    .from(vetProfiles)
    .where(eq(vetProfiles.userId, user.userId))
    .limit(1);

  if (existing.length > 0) {
    // Update existing profile
    await db
      .update(vetProfiles)
      .set({
        qualification: data.qualification,
        registrationNo: data.registrationNo,
        clinicName: data.clinicName || null,
        experienceYears: data.experienceYears,
        latitude: data.latitude,
        longitude: data.longitude,
        addressText: data.addressText,
        baseVisitFee: data.baseVisitFee,
        perKmFee: data.perKmFee,
        serviceRadiusKm: data.serviceRadiusKm,
      })
      .where(eq(vetProfiles.userId, user.userId));
  } else {
    // Create new profile
    await db.insert(vetProfiles).values({
      userId: user.userId,
      qualification: data.qualification,
      registrationNo: data.registrationNo,
      clinicName: data.clinicName || null,
      experienceYears: data.experienceYears,
      latitude: data.latitude,
      longitude: data.longitude,
      addressText: data.addressText,
      baseVisitFee: data.baseVisitFee,
      perKmFee: data.perKmFee,
      serviceRadiusKm: data.serviceRadiusKm,
    });
  }

  revalidatePath("/vet/dashboard");
  return { success: true };
}

// ─── Toggle Duty Status ─────────────────────────────────────────────────────

/**
 * Instantly toggles the vet's on-duty / off-duty status.
 */
export async function toggleDutyStatus(
  isOnDuty: boolean
): Promise<VetActionResult> {
  const user = await requireVetUser();

  const result = await db
    .update(vetProfiles)
    .set({ isOnDuty: isOnDuty })
    .where(eq(vetProfiles.userId, user.userId))
    .returning({ id: vetProfiles.id });

  if (result.length === 0) {
    return {
      success: false,
      error: "Profile not found. Please complete your registration first.",
    };
  }

  revalidatePath("/vet/dashboard");
  return { success: true };
}

// ─── Get Vet Profile ────────────────────────────────────────────────────────

/**
 * Fetches the current vet's profile data.
 */
export async function getVetProfile() {
  const user = await requireVetUser();

  const [profile] = await db
    .select()
    .from(vetProfiles)
    .where(eq(vetProfiles.userId, user.userId))
    .limit(1);

  return profile ?? null;
}

// ─── Incoming Emergency Feed ────────────────────────────────────────────────

export interface EmergencyFeedItem {
  id: string;
  farmerName: string;
  farmerPhone: string;
  cattleType: string;
  emergencyType: string;
  urgency: string;
  description: string | null;
  farmerLatitude: number;
  farmerLongitude: number;
  farmerAddress: string | null;
  distanceKm: number;
  createdAt: Date;
  timeElapsed: string;
}

/**
 * Fetches live PENDING emergency requests within the vet's service radius.
 * Uses Haversine formula for distance calculation (PostGIS-free).
 */
export async function getIncomingEmergencyFeed(): Promise<EmergencyFeedItem[]> {
  const user = await requireVetUser();

  // Get vet's profile for location and radius
  const [profile] = await db
    .select()
    .from(vetProfiles)
    .where(eq(vetProfiles.userId, user.userId))
    .limit(1);

  if (!profile) {
    return [];
  }

  const { latitude: vetLat, longitude: vetLng, serviceRadiusKm } = profile;

  // Query pending emergencies within the vet's service radius
  const rows = await db.execute(sql`
    SELECT
      er.id,
      u.name AS "farmerName",
      u.phone AS "farmerPhone",
      er.cattle_type AS "cattleType",
      er.emergency_type AS "emergencyType",
      er.urgency,
      er.description,
      er.farmer_latitude AS "farmerLatitude",
      er.farmer_longitude AS "farmerLongitude",
      er.farmer_address AS "farmerAddress",
      er.created_at AS "createdAt",
      ROUND(
        (6371 * acos(
          LEAST(1.0, GREATEST(-1.0,
            cos(radians(${vetLat})) * cos(radians(er.farmer_latitude)) *
            cos(radians(er.farmer_longitude) - radians(${vetLng})) +
            sin(radians(${vetLat})) * sin(radians(er.farmer_latitude))
          ))
        ))::numeric,
        1
      ) AS "distanceKm"
    FROM emergency_requests er
    INNER JOIN users u ON u.id = er.farmer_id
    WHERE er.status = 'PENDING'
      AND (6371 * acos(
        LEAST(1.0, GREATEST(-1.0,
          cos(radians(${vetLat})) * cos(radians(er.farmer_latitude)) *
          cos(radians(er.farmer_longitude) - radians(${vetLng})) +
          sin(radians(${vetLat})) * sin(radians(er.farmer_latitude))
        ))
      )) <= ${serviceRadiusKm}
    ORDER BY
      CASE WHEN er.urgency = 'EMERGENCY_SOS' THEN 0 ELSE 1 END,
      er.created_at DESC
  `);

  const now = new Date();

  return (rows as unknown as Record<string, unknown>[]).map((row) => {
    const createdAt = new Date(String(row.createdAt));
    const diffMs = now.getTime() - createdAt.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    let timeElapsed: string;
    if (diffMins < 1) {
      timeElapsed = "Just now";
    } else if (diffMins < 60) {
      timeElapsed = `${diffMins} min ago`;
    } else {
      const hours = Math.floor(diffMins / 60);
      timeElapsed = `${hours}h ${diffMins % 60}m ago`;
    }

    return {
      id: String(row.id),
      farmerName: String(row.farmerName),
      farmerPhone: String(row.farmerPhone),
      cattleType: String(row.cattleType),
      emergencyType: String(row.emergencyType),
      urgency: String(row.urgency),
      description: row.description ? String(row.description) : null,
      farmerLatitude: Number(row.farmerLatitude),
      farmerLongitude: Number(row.farmerLongitude),
      farmerAddress: row.farmerAddress ? String(row.farmerAddress) : null,
      distanceKm: Number(row.distanceKm),
      createdAt,
      timeElapsed,
    };
  });
}

// ─── Get Vet Dashboard Stats ────────────────────────────────────────────────

export interface VetDashboardStats {
  callsReceived: number;
  completedVisits: number;
  activeRadius: number;
  isOnDuty: boolean;
}

/**
 * Fetches quick stats for the vet dashboard.
 */
export async function getVetDashboardStats(): Promise<VetDashboardStats | null> {
  const user = await requireVetUser();

  const [profile] = await db
    .select({
      serviceRadiusKm: vetProfiles.serviceRadiusKm,
      isOnDuty: vetProfiles.isOnDuty,
    })
    .from(vetProfiles)
    .where(eq(vetProfiles.userId, user.userId))
    .limit(1);

  if (!profile) return null;

  // Count total requests (accepted + completed) as calls received
  const [callsResult] = await db.execute(sql`
    SELECT COUNT(*)::int AS count
    FROM emergency_requests
    WHERE accepted_by_vet_id = ${user.userId}
  `);

  // Count completed visits
  const [completedResult] = await db.execute(sql`
    SELECT COUNT(*)::int AS count
    FROM emergency_requests
    WHERE accepted_by_vet_id = ${user.userId}
      AND status = 'COMPLETED'
  `);

  return {
    callsReceived: Number((callsResult as Record<string, unknown>).count) || 0,
    completedVisits:
      Number((completedResult as Record<string, unknown>).count) || 0,
    activeRadius: profile.serviceRadiusKm,
    isOnDuty: profile.isOnDuty,
  };
}
