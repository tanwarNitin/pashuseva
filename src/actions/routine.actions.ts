"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { routineBookings, users, providerProfiles, animals } from "@/db/schema";
import { requireSession, requireRole } from "@/lib/auth/session";
import { eq, and, sql, desc, or, ne, gte, lte } from "drizzle-orm";
export type ActionState<T> = { ok: true, data?: T } | { ok: false, code: string, messageKey: string };

const bookingSchema = z.object({
  providerId: z.string().uuid("Invalid provider ID"),
  animalId: z.string().uuid("Invalid animal ID"),
  scheduledFor: z.string().datetime("Invalid ISO date string"),
  reason: z.string().min(3, "Reason must be at least 3 characters").max(500, "Reason too long"),
});

/**
 * Create a new routine booking (Farmer)
 */
export async function createRoutineBookingAction(
  prevState: ActionState<{ id: string }>,
  formData: FormData
): Promise<ActionState<{ id: string }>> {
  try {
    const session = await requireSession();
    await requireRole("FARMER");

    const data = {
      providerId: formData.get("providerId") as string,
      animalId: formData.get("animalId") as string,
      scheduledFor: formData.get("scheduledFor") as string,
      reason: formData.get("reason") as string,
    };

    const parsed = bookingSchema.parse(data);
    const scheduledDate = new Date(parsed.scheduledFor);
    const now = new Date();

    // 1. Validation: no past dates
    if (scheduledDate < now) {
      return { ok: false, code: "VALIDATION_ERROR", messageKey: "Cannot book a visit in the past" };
    }

    // 2. Validation: no bookings more than 60 days out
    const sixtyDaysFromNow = new Date();
    sixtyDaysFromNow.setDate(sixtyDaysFromNow.getDate() + 60);
    if (scheduledDate > sixtyDaysFromNow) {
      return { ok: false, code: "VALIDATION_ERROR", messageKey: "Cannot book more than 60 days in advance" };
    }

    // 3. Double-booking check: same provider, overlapping time (+/- 2 hours)
    const windowStart = new Date(scheduledDate.getTime() - 2 * 60 * 60 * 1000);
    const windowEnd = new Date(scheduledDate.getTime() + 2 * 60 * 60 * 1000);

    const overlappingBookings = await db
      .select({ id: routineBookings.id })
      .from(routineBookings)
      .where(
        and(
          eq(routineBookings.providerId, parsed.providerId),
          or(
            eq(routineBookings.status, "REQUESTED"),
            eq(routineBookings.status, "CONFIRMED")
          ),
          gte(routineBookings.scheduledFor, windowStart),
          lte(routineBookings.scheduledFor, windowEnd)
        )
      )
      .limit(1);

    if (overlappingBookings.length > 0) {
      return { ok: false, code: "CONFLICT", messageKey: "Provider already has a booking around this time. Please select another time." };
    }

    // Verify ownership of the animal
    const [animal] = await db
      .select({ id: animals.id })
      .from(animals)
      .where(and(eq(animals.id, parsed.animalId), eq(animals.farmerId, session.user.id)))
      .limit(1);

    if (!animal) {
      return { ok: false, code: "VALIDATION_ERROR", messageKey: "Invalid animal selection" };
    }

    const [booking] = await db
      .insert(routineBookings)
      .values({
        farmerId: session.user.id,
        providerId: parsed.providerId,
        animalId: parsed.animalId,
        scheduledFor: scheduledDate,
        reason: parsed.reason,
        status: "REQUESTED",
      })
      .returning({ id: routineBookings.id });

    revalidatePath("/[locale]/(farmer)/requests", "layout");
    revalidatePath("/[locale]/(provider)/dashboard", "page");

    return { ok: true, data: { id: booking.id } };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { ok: false, code: "VALIDATION_ERROR", messageKey: (error as any).errors[0].message };
    }
    return { ok: false, code: "INTERNAL_ERROR", messageKey: "Failed to create booking" };
  }
}

/**
 * Provider accepts a routine booking
 */
export async function acceptRoutineBookingAction(
  formData: FormData
): Promise<ActionState<void>> {
  try {
    const session = await requireSession();
    const id = formData.get("id") as string;
    
    if (!id) return { ok: false, code: "VALIDATION_ERROR", messageKey: "Missing ID" };

    const result = await db
      .update(routineBookings)
      .set({ status: "CONFIRMED", updatedAt: new Date() })
      .where(
        and(
          eq(routineBookings.id, id),
          eq(routineBookings.providerId, session.user.id),
          eq(routineBookings.status, "REQUESTED")
        )
      );

    if (result.rowCount === 0) {
      return { ok: false, code: "CONFLICT", messageKey: "Booking not found or already processed" };
    }

    revalidatePath("/[locale]/(provider)/dashboard", "page");
    return { ok: true, data: undefined };
  } catch (error) {
    return { ok: false, code: "INTERNAL_ERROR", messageKey: "Action failed" };
  }
}

/**
 * Provider declines a routine booking
 */
export async function declineRoutineBookingAction(
  formData: FormData
): Promise<ActionState<void>> {
  try {
    const session = await requireSession();
    const id = formData.get("id") as string;
    
    if (!id) return { ok: false, code: "VALIDATION_ERROR", messageKey: "Missing ID" };

    const result = await db
      .update(routineBookings)
      .set({ status: "DECLINED", updatedAt: new Date() })
      .where(
        and(
          eq(routineBookings.id, id),
          eq(routineBookings.providerId, session.user.id),
          eq(routineBookings.status, "REQUESTED")
        )
      );

    if (result.rowCount === 0) {
      return { ok: false, code: "CONFLICT", messageKey: "Booking not found or already processed" };
    }

    revalidatePath("/[locale]/(provider)/dashboard", "page");
    return { ok: true, data: undefined };
  } catch (error) {
    return { ok: false, code: "INTERNAL_ERROR", messageKey: "Action failed" };
  }
}

/**
 * Farmer cancels a routine booking
 */
export async function cancelRoutineBookingAction(
  formData: FormData
): Promise<ActionState<void>> {
  try {
    const session = await requireSession();
    const id = formData.get("id") as string;
    
    if (!id) return { ok: false, code: "VALIDATION_ERROR", messageKey: "Missing ID" };

    const result = await db
      .update(routineBookings)
      .set({ status: "CANCELLED", updatedAt: new Date() })
      .where(
        and(
          eq(routineBookings.id, id),
          eq(routineBookings.farmerId, session.user.id),
          or(
            eq(routineBookings.status, "REQUESTED"),
            eq(routineBookings.status, "CONFIRMED")
          )
        )
      );

    if (result.rowCount === 0) {
      return { ok: false, code: "CONFLICT", messageKey: "Booking not found or already processed" };
    }

    revalidatePath("/[locale]/(farmer)/requests", "layout");
    revalidatePath("/[locale]/(provider)/dashboard", "page");
    return { ok: true, data: undefined };
  } catch (error) {
    return { ok: false, code: "INTERNAL_ERROR", messageKey: "Action failed" };
  }
}

/**
 * Provider completes a routine booking
 */
export async function completeRoutineBookingAction(
  formData: FormData
): Promise<ActionState<void>> {
  try {
    const session = await requireSession();
    const id = formData.get("id") as string;
    
    if (!id) return { ok: false, code: "VALIDATION_ERROR", messageKey: "Missing ID" };

    const result = await db
      .update(routineBookings)
      .set({ status: "COMPLETED", updatedAt: new Date() })
      .where(
        and(
          eq(routineBookings.id, id),
          eq(routineBookings.providerId, session.user.id),
          eq(routineBookings.status, "CONFIRMED")
        )
      );

    if (result.rowCount === 0) {
      return { ok: false, code: "CONFLICT", messageKey: "Booking not found or already processed" };
    }

    revalidatePath("/[locale]/(provider)/dashboard", "page");
    return { ok: true, data: undefined };
  } catch (error) {
    return { ok: false, code: "INTERNAL_ERROR", messageKey: "Action failed" };
  }
}

/**
 * Get routine bookings for farmer
 */
export async function getFarmerRoutineBookings() {
  const session = await requireSession();
  
  const bookings = await db
    .select({
      id: routineBookings.id,
      scheduledFor: routineBookings.scheduledFor,
      reason: routineBookings.reason,
      status: routineBookings.status,
      createdAt: routineBookings.createdAt,
      providerName: users.name,
      providerPhone: users.phone,
      animalName: animals.name,
      animalTagId: animals.tagId,
    })
    .from(routineBookings)
    .innerJoin(users, eq(routineBookings.providerId, users.id))
    .leftJoin(animals, eq(routineBookings.animalId, animals.id))
    .where(eq(routineBookings.farmerId, session.user.id))
    .orderBy(desc(routineBookings.scheduledFor));

  return bookings;
}

/**
 * Get routine bookings for provider
 */
export async function getProviderRoutineBookings() {
  const session = await requireSession();
  
  const bookings = await db
    .select({
      id: routineBookings.id,
      scheduledFor: routineBookings.scheduledFor,
      reason: routineBookings.reason,
      status: routineBookings.status,
      createdAt: routineBookings.createdAt,
      farmerName: users.name,
      farmerPhone: users.phone,
      animalName: animals.name,
      animalTagId: animals.tagId,
    })
    .from(routineBookings)
    .innerJoin(users, eq(routineBookings.farmerId, users.id))
    .leftJoin(animals, eq(routineBookings.animalId, animals.id))
    .where(eq(routineBookings.providerId, session.user.id))
    .orderBy(desc(routineBookings.scheduledFor));

  return bookings;
}
