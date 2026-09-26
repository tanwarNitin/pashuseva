import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users, providerProfiles, serviceRequestRecipients } from "@/db/schema";
import { eq } from "drizzle-orm";
import { createServiceRequest, acceptServiceRequest, declineServiceRequest, cancelServiceRequest } from "@/services/request.service";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const flow = searchParams.get("flow") || "happy";

    const [farmer] = await db.select().from(users).where(eq(users.role, "FARMER")).limit(1);
    const providers = await db.select().from(providerProfiles);
    const provider = providers.find(p => p.verificationStatus === "VERIFIED" && p.dutyStatus === "ON_DUTY");

    if (!farmer || !provider) {
      return NextResponse.json({ error: "Missing seed data" }, { status: 400 });
    }

    // For expiry flow, set expiresAt to a past time
    const expiresAt = flow === "expire" ? new Date(Date.now() - 30 * 60000) : new Date(Date.now() + 30 * 60000);

    const requestInput = {
      farmerId: farmer.id,
      kind: "SOS" as const,
      serviceCode: "EMERGENCY",
      conditionSummary: `Test emergency request (${flow} flow)`,
      latitude: "28.6139",
      longitude: "77.2090",
      locationSource: "GPS",
      expiresAt: expiresAt,
      clientRequestId: crypto.randomUUID(),
      idempotencyPayloadHash: "hash"
    };

    const { id: requestId } = await createServiceRequest(requestInput, farmer.id);
    const recipients = await db.select().from(serviceRequestRecipients).where(eq(serviceRequestRecipients.requestId, requestId));
    const assignedRecipient = recipients[0];

    if (assignedRecipient) {
      if (flow === "decline") {
        await declineServiceRequest(requestId, assignedRecipient.providerId, assignedRecipient.providerId, "Busy");
      } else if (flow === "cancel") {
        await acceptServiceRequest(requestId, assignedRecipient.providerId, assignedRecipient.providerId);
        await cancelServiceRequest(requestId, farmer.id, "FARMER", "Changed mind");
      } else if (flow === "expire") {
        try {
          await acceptServiceRequest(requestId, assignedRecipient.providerId, assignedRecipient.providerId);
        } catch (e: any) {
          return NextResponse.json({ requestId, flow, error: e.message, status: "Caught expected expiry error" });
        }
      }
    }

    return NextResponse.json({
      requestId,
      flow,
      farmer: farmer.name,
      recipients: recipients.length,
      assignedProvider: assignedRecipient?.providerId
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
