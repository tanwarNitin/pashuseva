import { NextResponse } from "next/server";
import { db } from "@/db";
import { vaccinationRecords, animals } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { requireSession } from "@/lib/auth/session";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string; vid: string }> }
) {
  try {
    const session = await requireSession();
    const { id, vid } = await params;

    const [animal] = await db
      .select()
      .from(animals)
      .where(and(eq(animals.id, id), eq(animals.farmerId, session.user.id)))
      .limit(1);

    if (!animal) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const body = await request.json();
    const { vaccineName, diseaseTarget, administeredOn, nextDueOn, batchNumber, administeredByText, source, notes } = body;

    const [record] = await db
      .update(vaccinationRecords)
      .set({
        vaccineName,
        diseaseTarget,
        administeredOn,
        nextDueOn,
        batchNumber,
        administeredByText,
        source,
        notes,
        reminderDismissed: false,
      })
      .where(and(eq(vaccinationRecords.id, vid), eq(vaccinationRecords.animalId, id)))
      .returning();

    if (!record) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json(record);
  } catch (err) {
    console.error("Vaccinations PUT error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; vid: string }> }
) {
  try {
    const session = await requireSession();
    const { id, vid } = await params;

    const [animal] = await db
      .select()
      .from(animals)
      .where(and(eq(animals.id, id), eq(animals.farmerId, session.user.id)))
      .limit(1);

    if (!animal) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await db
      .delete(vaccinationRecords)
      .where(and(eq(vaccinationRecords.id, vid), eq(vaccinationRecords.animalId, id)));

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Vaccinations DELETE error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}