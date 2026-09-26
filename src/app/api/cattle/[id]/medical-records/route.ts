
import { NextResponse } from "next/server";
import { db } from "@/db";
import { medicalRecords, animals } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { requireSession } from "@/lib/auth/session";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSession();
    const { id } = await params;

    const [animal] = await db
      .select()
      .from(animals)
      .where(and(eq(animals.id, id), eq(animals.farmerId, session.user.id)))
      .limit(1);

    if (!animal) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const records = await db
      .select()
      .from(medicalRecords)
      .where(eq(medicalRecords.animalId, id))
      .orderBy(desc(medicalRecords.recordedOn));

    return NextResponse.json(records);
  } catch (err) {
    console.error("Medical records GET error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSession();
    const { id } = await params;

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
      .insert(medicalRecords)
      .values({
        animalId: id,
        farmerId: session.user.id,
        recordedOn,
        recordType,
        symptoms,
        diagnosis,
        treatment,
        followUpDate,
        source,
        createdByUserId: session.user.id,
        notes,
      })
      .returning();

    return NextResponse.json(record, { status: 201 });
  } catch (err) {
    console.error("Medical records POST error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}