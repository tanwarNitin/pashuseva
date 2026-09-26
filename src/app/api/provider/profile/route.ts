
import { NextResponse } from "next/server";
import { db } from "@/db";
import { providerProfiles, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireSession } from "@/lib/auth/session";

import { isAppError } from "@/lib/errors";

export async function GET() {
  try {
    const session = await requireSession();

    if (session.user.role !== "VET_DOCTOR" && session.user.role !== "PARAVET_WORKER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [profile] = await db
      .select({
        id: providerProfiles.userId,
        userId: providerProfiles.userId,
        name: users.name,
        phone: users.phone,
        role: users.role,
        registrationNumber: providerProfiles.registrationNumber,
        registrationAuthority: providerProfiles.registrationAuthority,
        qualification: providerProfiles.qualification,
        specializationArea: providerProfiles.specializationArea,
        yearsOfExperience: providerProfiles.yearsOfExperience,
        bio: providerProfiles.bio,
        district: providerProfiles.district,
        state: providerProfiles.state,
        villageOrServiceArea: providerProfiles.villageOrServiceArea,
        baseVisitFeePaise: providerProfiles.baseVisitFeePaise,
        perKmFeePaise: providerProfiles.perKmFeePaise,
        serviceRadiusMeters: providerProfiles.serviceRadiusMeters,
        preferWhatsApp: providerProfiles.preferWhatsApp,
        latitude: providerProfiles.latitude,
        longitude: providerProfiles.longitude,
        locationConfirmedAt: providerProfiles.locationConfirmedAt,
        dutyStatus: providerProfiles.dutyStatus,
        dutyExpiresAt: providerProfiles.dutyExpiresAt,
        verificationStatus: providerProfiles.verificationStatus,
      })
      .from(providerProfiles)
      .innerJoin(users, eq(providerProfiles.userId, users.id))
      .where(eq(providerProfiles.userId, session.user.id))
      .limit(1);

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    return NextResponse.json(profile, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (err: any) {
    if (err?.code === "UNAUTHENTICATED" || (isAppError(err) && err.code === "UNAUTHENTICATED")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Provider profile API error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}