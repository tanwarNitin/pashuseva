import { NextResponse } from "next/server";
import { db } from "@/db";
import { vaccinationRecords, animals } from "@/db/schema";
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
      .from(vaccinationRecords)
      .where(eq(vaccinationRecords.animalId, id))
      .orderBy(desc(vaccinationRecords.administeredOn));

    return NextResponse.json(records);
  } catch (err) {
    console.error("Vaccinations GET error:", err);
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
    const { vaccineName, diseaseTarget, administeredOn, nextDueOn, batchNumber, administeredByText, source, notes } = body;

    const [record] = await db
      .insert(vaccinationRecords)
      .values({
        animalId: id,
        farmerId: session.user.id,
        vaccineName,
        diseaseTarget,
        administeredOn,
        nextDueOn,
        batchNumber,
        administeredByText,
        source,
        createdByUserId: session.user.id,
        notes,
      })
      .returning();

    return NextResponse.json(record, { status: 201 });
  } catch (err) {
    console.error("Vaccinations POST error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}