import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { isAppError } from "@/lib/errors";
import { getProviderRoutineBookings } from "@/actions/routine.actions";

export async function GET() {
  try {
    const session = await requireSession();

    if (session.user.role !== "VET_DOCTOR" && session.user.role !== "PARAVET_WORKER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const bookings = await getProviderRoutineBookings();

    return NextResponse.json(bookings, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (err: any) {
    if (err?.code === "UNAUTHENTICATED" || (isAppError(err) && err.code === "UNAUTHENTICATED")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Provider routine requests API error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
