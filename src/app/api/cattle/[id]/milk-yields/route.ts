import { NextResponse } from "next/server";
import { db } from "@/db";
import { milkYieldEntries, animals } from "@/db/schema";
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

    const entries = await db
      .select()
      .from(milkYieldEntries)
      .where(eq(milkYieldEntries.animalId, id))
      .orderBy(desc(milkYieldEntries.recordedOn));

    return NextResponse.json(entries);
  } catch (err) {
    console.error("Milk yields GET error:", err);
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
    const { recordedOn, litersPerDay, notes } = body;

    const [entry] = await db
      .insert(milkYieldEntries)
      .values({
        animalId: id,
        farmerId: session.user.id,
        recordedOn,
        litersPerDay,
        notes,
      })
      .returning();

    return NextResponse.json(entry, { status: 201 });
  } catch (err) {
    console.error("Milk yields POST error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}