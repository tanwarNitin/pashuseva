
import { NextResponse } from "next/server";
import { db } from "@/db";
import { medicalRecords, animals } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { requireSession } from "@/lib/auth/session";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string; mrid: string }> }
) {
  try {
    const session = await requireSession();
    const { id, mrid } = await params;

    const [animal] = await db
      .select()
      .from(animals)
      .where(and(eq(animals.id, id), eq(animals.farmerId, session.user.id)))
      .limit(1);

    if (!animal) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const body = await request.json();
    const { recordedOn, recordType, symptoms, diagnosis, treatment, followUpDate, source, notes } = body;

    const [record] = await db
      .update(medicalRecords)
      .set({
        recordedOn,
        recordType,
        symptoms,
        diagnosis,
        treatment,
        followUpDate,
        source,
        notes,
      })
      .where(and(eq(medicalRecords.id, mrid), eq(medicalRecords.animalId, id)))
      .returning();

    if (!record) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json(record);
  } catch (err) {
    console.error("Medical records PUT error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; mrid: string }> }
) {
  try {
    const session = await requireSession();
    const { id, mrid } = await params;

    const [animal] = await db
      .select()
      .from(animals)
      .where(and(eq(animals.id, id), eq(animals.farmerId, session.user.id)))
      .limit(1);

    if (!animal) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await db
      .delete(medicalRecords)
      .where(and(eq(medicalRecords.id, mrid), eq(medicalRecords.animalId, id)));

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Medical records DELETE error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}