import { NextResponse } from "next/server";
import { getProviderRequests } from "@/services/request.service";
import { requireSession } from "@/lib/auth/session";
import { isAppError } from "@/lib/errors";

export async function GET() {
  try {
    const session = await requireSession();

    if (session.user.role !== "VET_DOCTOR" && session.user.role !== "PARAVET_WORKER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const requests = await getProviderRequests(session.user.id, session.user.id);

    return NextResponse.json(requests, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (err: any) {
    if (err?.code === "UNAUTHENTICATED" || (isAppError(err) && err.code === "UNAUTHENTICATED")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Provider requests API error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}