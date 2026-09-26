import { NextResponse } from "next/server";
import { db } from "@/db";
import { milkYieldEntries, animals } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { requireSession } from "@/lib/auth/session";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string; mid: string }> }
) {
  try {
    const session = await requireSession();
    const { id, mid } = await params;

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
      .update(milkYieldEntries)
      .set({
        recordedOn,
        litersPerDay,
        notes,
      })
      .where(and(eq(milkYieldEntries.id, mid), eq(milkYieldEntries.animalId, id)))
      .returning();

    if (!entry) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json(entry);
  } catch (err) {
    console.error("Milk yields PUT error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; mid: string }> }
) {
  try {
    const session = await requireSession();
    const { id, mid } = await params;

    const [animal] = await db
      .select()
      .from(animals)
      .where(and(eq(animals.id, id), eq(animals.farmerId, session.user.id)))
      .limit(1);

    if (!animal) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await db
      .delete(milkYieldEntries)
      .where(and(eq(milkYieldEntries.id, mid), eq(milkYieldEntries.animalId, id)));

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Milk yields DELETE error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}