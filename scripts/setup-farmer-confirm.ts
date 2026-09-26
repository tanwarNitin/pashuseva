import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

import { db } from "../src/db";
import { users } from "../src/db/schema";
import { createServiceRequest, acceptServiceRequest, startServiceRequest, markServiceRequestDone } from "../src/services/request.service";
import crypto from "crypto";
import { eq } from "drizzle-orm";

async function setup() {
  const [farmer] = await db.select().from(users).where(eq(users.role, "FARMER")).limit(1);
  const [provider] = await db.select().from(users).where(eq(users.role, "VET_DOCTOR")).limit(1);

  // Flow 1: Confirm
  const req1 = await createServiceRequest({
    farmerId: farmer.id,
    kind: "SOS",
    serviceCode: "EMERGENCY",
    conditionSummary: "Needs confirm",
    latitude: "28.0",
    longitude: "77.0",
    locationSource: "GPS",
    expiresAt: new Date(Date.now() + 1000000), 
    clientRequestId: crypto.randomUUID(),
    idempotencyPayloadHash: crypto.randomUUID()
  }, farmer.id);
  await acceptServiceRequest(req1.id, provider.id, provider.id);
  await startServiceRequest(req1.id, provider.id, provider.id);
  await markServiceRequestDone(req1.id, provider.id, provider.id);

  // Flow 2: Dispute
  const req2 = await createServiceRequest({
    farmerId: farmer.id,
    kind: "SOS",
    serviceCode: "EMERGENCY",
    conditionSummary: "Needs dispute",
    latitude: "28.0",
    longitude: "77.0",
    locationSource: "GPS",
    expiresAt: new Date(Date.now() + 1000000), 
    clientRequestId: crypto.randomUUID(),
    idempotencyPayloadHash: crypto.randomUUID()
  }, farmer.id);
  await acceptServiceRequest(req2.id, provider.id, provider.id);
  await startServiceRequest(req2.id, provider.id, provider.id);
  await markServiceRequestDone(req2.id, provider.id, provider.id);

  console.log(`FARMER PHONE: ${farmer.phone}`);
  console.log(`REQ1 (Confirm): ${req1.id}`);
  console.log(`REQ2 (Dispute): ${req2.id}`);
  process.exit(0);
}
setup();
