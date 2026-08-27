"use server";

import { z } from "zod";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db, cattleRecords } from "@/db";
import { getCurrentUser } from "@/lib/auth";

export interface CattleActionResult {
  success: boolean;
  error?: string;
}

// ─── Schemas ────────────────────────────────────────────────────────────────

const createCattleSchema = z.object({
  tagNumber: z.string().min(2, "Tag number is required").max(50),
  cattleType: z.enum(["COW", "BUFFALO", "GOAT", "SHEEP", "OTHER"]),
  breedName: z.string().max(50).optional().default(""),
  ageMonths: z.coerce.number().int().min(0).max(360).optional(),
  isMilking: z.coerce.boolean().optional().default(false),
  dailyMilkYieldLiters: z.coerce.number().min(0).max(100).optional().default(0),
});

const vaccinationSchema = z.object({
  cattleId: z.string().uuid(),
  vaccineName: z.string().min(2, "Vaccine name is required"),
  dateGiven: z.string().min(2, "Date is required"),
  nextDue: z.string().min(2, "Next due date is required"),
});

const treatmentSchema = z.object({
  cattleId: z.string().uuid(),
  vetName: z.string().min(2, "Vet name is required"),
  diagnosis: z.string().min(2, "Diagnosis is required"),
  prescription: z.string().min(2, "Prescription is required"),
});

// ─── Actions ────────────────────────────────────────────────────────────────

export async function createCattleRecord(
  formData: FormData
): Promise<CattleActionResult> {
  const user = await getCurrentUser();
  if (!user || user.role !== "FARMER") {
    return { success: false, error: "Only farmers can add cattle." };
  }

  const raw = {
    tagNumber: formData.get("tagNumber"),
    cattleType: formData.get("cattleType"),
    breedName: formData.get("breedName"),
    ageMonths: formData.get("ageMonths"),
    isMilking: formData.get("isMilking") === "on",
    dailyMilkYieldLiters: formData.get("dailyMilkYieldLiters"),
  };

  const parsed = createCattleSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Validation failed",
    };
  }

  const data = parsed.data;

  try {
    await db.insert(cattleRecords).values({
      farmerId: user.userId,
      tagNumber: data.tagNumber,
      cattleType: data.cattleType,
      breedName: data.breedName || null,
      ageMonths: data.ageMonths,
      isMilking: data.isMilking,
      dailyMilkYieldLiters: data.dailyMilkYieldLiters.toString(),
      vaccinationHistory: [],
      medicalNotes: [],
    });
    revalidatePath("/farmer/cattle");
    return { success: true };
  } catch (error: any) {
    if (error.code === "23505") { // Unique violation
      return { success: false, error: "Tag number already exists." };
    }
    return { success: false, error: "Failed to create cattle record." };
  }
}

export async function addVaccinationRecord(
  formData: FormData
): Promise<CattleActionResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Unauthorized" };

  const parsed = vaccinationSchema.safeParse({
    cattleId: formData.get("cattleId"),
    vaccineName: formData.get("vaccineName"),
    dateGiven: formData.get("dateGiven"),
    nextDue: formData.get("nextDue"),
  });

  if (!parsed.success) {
    return { success: false, error: "Validation failed" };
  }

  const data = parsed.data;

  const [cattle] = await db
    .select({
      vaccinationHistory: cattleRecords.vaccinationHistory,
    })
    .from(cattleRecords)
    .where(eq(cattleRecords.id, data.cattleId))
    .limit(1);

  if (!cattle) return { success: false, error: "Cattle not found" };

  const newHistory = cattle.vaccinationHistory || [];
  newHistory.push({
    name: data.vaccineName,
    date: data.dateGiven,
    next_due: data.nextDue,
  });

  await db
    .update(cattleRecords)
    .set({ vaccinationHistory: newHistory })
    .where(eq(cattleRecords.id, data.cattleId));

  revalidatePath("/farmer/cattle");
  return { success: true };
}

export async function addTreatmentRecord(
  formData: FormData
): Promise<CattleActionResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Unauthorized" };

  const parsed = treatmentSchema.safeParse({
    cattleId: formData.get("cattleId"),
    vetName: formData.get("vetName"),
    diagnosis: formData.get("diagnosis"),
    prescription: formData.get("prescription"),
  });

  if (!parsed.success) {
    return { success: false, error: "Validation failed" };
  }

  const data = parsed.data;

  const [cattle] = await db
    .select({
      medicalNotes: cattleRecords.medicalNotes,
    })
    .from(cattleRecords)
    .where(eq(cattleRecords.id, data.cattleId))
    .limit(1);

  if (!cattle) return { success: false, error: "Cattle not found" };

  const newNotes = cattle.medicalNotes || [];
  newNotes.push({
    date: new Date().toISOString(),
    vet_name: data.vetName,
    diagnosis: data.diagnosis,
    prescription: data.prescription,
  });

  await db
    .update(cattleRecords)
    .set({ medicalNotes: newNotes })
    .where(eq(cattleRecords.id, data.cattleId));

  revalidatePath("/farmer/cattle");
  return { success: true };
}

export async function getCattleRecordsByFarmer(farmerId?: string) {
  const user = await getCurrentUser();
  const idToUse = farmerId || user?.userId;
  
  if (!idToUse) return [];

  const records = await db
    .select()
    .from(cattleRecords)
    .where(eq(cattleRecords.farmerId, idToUse))
    .orderBy(cattleRecords.createdAt);
    
  return records;
}
