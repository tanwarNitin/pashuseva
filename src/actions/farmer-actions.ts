"use server";

import { z } from "zod";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db, users, emergencyRequests } from "@/db";
import { getNearbyVets, type NearbyVet } from "@/lib/geo";
import { getCurrentUser } from "@/lib/auth";

// ─── Types ──────────────────────────────────────────────────────────────────

export type { NearbyVet };

export interface FarmerActionResult {
  success: boolean;
  error?: string;
}

// ─── Validation Schemas ─────────────────────────────────────────────────────

const createEmergencySchema = z.object({
  cattleType: z.enum(["COW", "BUFFALO", "GOAT", "SHEEP", "OTHER"]),
  urgency: z.enum(["EMERGENCY_SOS", "ROUTINE"]),
  emergencyType: z.enum([
    "DYSTOCIA",
    "BLOAT",
    "HIGH_FEVER",
    "PROLAPSE",
    "FRACTURE_INJURY",
    "GENERAL_CHECKUP",
  ]),
  description: z.string().max(500).optional().default(""),
  farmerLatitude: z.coerce.number().min(-90).max(90),
  farmerLongitude: z.coerce.number().min(-180).max(180),
  farmerAddress: z.string().max(300).optional().default(""),
  cattleId: z.string().uuid().optional(),
});

// ─── Search Nearby Vets ─────────────────────────────────────────────────────

/**
 * Searches for on-duty verified vets within radius of the farmer's location.
 * Wraps the geo engine and adds any extra access-control logic.
 */
export async function searchNearbyVetsAction(
  lat: number,
  lng: number,
  maxRadiusKm: number = 25,
  roleFilter?: "VET_DOCTOR" | "PARAVET_WORKER"
): Promise<NearbyVet[]> {
  if (
    typeof lat !== "number" ||
    typeof lng !== "number" ||
    isNaN(lat) ||
    isNaN(lng)
  ) {
    return [];
  }

  return getNearbyVets(lat, lng, maxRadiusKm, roleFilter);
}

// ─── Create Emergency Request ────────────────────────────────────────────────

/**
 * Creates a new emergency or routine request from the farmer.
 * Requires an active session; sets the farmer's userId automatically.
 */
export async function createEmergencyRequestAction(
  formData: FormData
): Promise<FarmerActionResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "Please log in to raise a request." };
  }
  if (user.role !== "FARMER") {
    return {
      success: false,
      error: "Only farmers can raise emergency requests.",
    };
  }

  const raw = {
    cattleType: formData.get("cattleType"),
    urgency: formData.get("urgency"),
    emergencyType: formData.get("emergencyType"),
    description: formData.get("description"),
    farmerLatitude: formData.get("farmerLatitude"),
    farmerLongitude: formData.get("farmerLongitude"),
    farmerAddress: formData.get("farmerAddress"),
    cattleId: formData.get("cattleId") || undefined,
  };

  const parsed = createEmergencySchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Validation failed",
    };
  }

  const data = parsed.data;

  await db.insert(emergencyRequests).values({
    farmerId: user.userId,
    cattleId: data.cattleId ?? null,
    cattleType: data.cattleType,
    urgency: data.urgency,
    emergencyType: data.emergencyType,
    description: data.description || null,
    farmerLatitude: data.farmerLatitude,
    farmerLongitude: data.farmerLongitude,
    farmerAddress: data.farmerAddress || null,
    status: "PENDING",
  });

  revalidatePath("/");
  revalidatePath("/vet/dashboard");
  return { success: true };
}
