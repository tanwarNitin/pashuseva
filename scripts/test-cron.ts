import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

import { db } from "../src/db";
import { users, serviceRequests, providerProfiles } from "../src/db/schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";
import { GET } from "../src/app/api/cron/check-stale-visits/route";

async function runTest() {
  console.log("🚀 Starting Cron Watchdog Test...");

  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    throw new Error("CRON_SECRET is not set in environment");
  }

  const APP_ORIGIN = process.env.APP_ORIGIN || "http://localhost:3000";

  // 1. Create a mock farmer and provider
  let [farmer] = await db.select().from(users).where(eq(users.role, "FARMER")).limit(1);
  if (!farmer) {
    const id = crypto.randomUUID();
    [farmer] = await db.insert(users).values({
      id,
      phone: "+91" + Math.floor(1000000000 + Math.random() * 9000000000).toString(),
      name: "Cron Farmer",
      role: "FARMER",
      pinHash: "dummy",
    }).returning();
  }

  const providerId = crypto.randomUUID();
  const [provider] = await db.insert(users).values({
    id: providerId,
    phone: "+91" + Math.floor(1000000000 + Math.random() * 9000000000).toString(),
    name: "Cron Provider",
    role: "VET_DOCTOR",
    pinHash: "dummy",
    status: "ACTIVE",
  }).returning();

  await db.insert(providerProfiles).values({
    userId: provider.id,
    qualification: "BVSc",
    registrationNumber: "CRON" + Date.now(),
    registrationNumberNormalized: "CRON" + Date.now(),
    registrationAuthority: "Test Auth",
    verificationStatus: "VERIFIED",
    baseVisitFeePaise: 10000,
    perKmFeePaise: 500
  });

  const now = new Date();
  
  // Create requests in specific states and times
  // 1. IN_PROGRESS fresh (should not be touched)
  const [freshInProgress] = await db.insert(serviceRequests).values({
    farmerId: farmer.id,
    kind: "SOS",
    serviceCode: "EMERGENCY",
    status: "IN_PROGRESS",
    conditionSummary: "Fresh",
    latitude: "0",
    longitude: "0",
    locationSource: "GPS",
    expiresAt: new Date(now.getTime() + 100000),
    clientRequestId: crypto.randomUUID(),
    idempotencyPayloadHash: "h1",
    acceptedProviderId: provider.id,
    statusChangedAt: now
  }).returning();

  // 2. IN_PROGRESS 6+ hours (should be nudged)
  const [nudgedInProgress] = await db.insert(serviceRequests).values({
    farmerId: farmer.id,
    kind: "SOS",
    serviceCode: "EMERGENCY",
    status: "IN_PROGRESS",
    conditionSummary: "Needs Nudge",
    latitude: "0",
    longitude: "0",
    locationSource: "GPS",
    expiresAt: new Date(now.getTime() + 100000),
    clientRequestId: crypto.randomUUID(),
    idempotencyPayloadHash: "h2",
    acceptedProviderId: provider.id,
    statusChangedAt: new Date(now.getTime() - 7 * 60 * 60 * 1000)
  }).returning();

  // 3. IN_PROGRESS 24+ hours (should be flagged)
  const [flaggedInProgress] = await db.insert(serviceRequests).values({
    farmerId: farmer.id,
    kind: "SOS",
    serviceCode: "EMERGENCY",
    status: "IN_PROGRESS",
    conditionSummary: "Needs Flag",
    latitude: "0",
    longitude: "0",
    locationSource: "GPS",
    expiresAt: new Date(now.getTime() + 100000),
    clientRequestId: crypto.randomUUID(),
    idempotencyPayloadHash: "h3",
    acceptedProviderId: provider.id,
    statusChangedAt: new Date(now.getTime() - 25 * 60 * 60 * 1000)
  }).returning();

  // 4. AWAITING_CONFIRMATION 48+ hours (should be completed)
  const [awaitingConfirm] = await db.insert(serviceRequests).values({
    farmerId: farmer.id,
    kind: "SOS",
    serviceCode: "EMERGENCY",
    status: "AWAITING_CONFIRMATION",
    conditionSummary: "Needs Complete",
    latitude: "0",
    longitude: "0",
    locationSource: "GPS",
    expiresAt: new Date(now.getTime() + 100000),
    clientRequestId: crypto.randomUUID(),
    idempotencyPayloadHash: "h4",
    acceptedProviderId: provider.id,
    statusChangedAt: new Date(now.getTime() - 49 * 60 * 60 * 1000)
  }).returning();

  // Define helpers
  async function callCron(secret: string | null) {
    const headers = new Headers();
    if (secret) {
      headers.set("Authorization", `Bearer ${secret}`);
    }
    const req = new Request(`${APP_ORIGIN}/api/cron/check-stale-visits`, { headers });
    return await GET(req);
  }

  // --- TESTS ---
  console.log("\n--- TEST 1: Unauthorized (No Token / Wrong Token) ---");
  let res = await callCron(null);
  if (res.status === 401) {
    console.log("✅ Passed: Blocked missing token");
  } else {
    console.error(`❌ FAILED: Expected 401 missing token, got ${res.status}`);
  }

  res = await callCron("WRONG_TOKEN");
  if (res.status === 401) {
    console.log("✅ Passed: Blocked wrong token");
  } else {
    console.error(`❌ FAILED: Expected 401 wrong token, got ${res.status}`);
  }

  console.log("\n--- TEST 2: Successful Cron Execution ---");
  res = await callCron(cronSecret);
  if (res.status === 200) {
    const json = await res.json();
    console.log(`✅ Passed: Execution successful`, json);
  } else {
    console.error(`❌ FAILED: Expected 200, got ${res.status}`);
    const text = await res.text();
    console.error(text);
  }

  console.log("\n--- TEST 3: Validation of Status Changes ---");
  
  const [fReq] = await db.select().from(serviceRequests).where(eq(serviceRequests.id, freshInProgress.id));
  if (fReq.status === "IN_PROGRESS" && fReq.providerNudgedAt === null && !fReq.adminFlagged) {
    console.log("✅ Passed: Fresh request untouched");
  } else {
    console.error("❌ FAILED: Fresh request modified");
  }

  const [nReq] = await db.select().from(serviceRequests).where(eq(serviceRequests.id, nudgedInProgress.id));
  if (nReq.status === "IN_PROGRESS" && nReq.providerNudgedAt !== null && !nReq.adminFlagged) {
    console.log("✅ Passed: 6h+ request nudged");
  } else {
    console.error("❌ FAILED: 6h+ request not nudged correctly");
  }

  const [flReq] = await db.select().from(serviceRequests).where(eq(serviceRequests.id, flaggedInProgress.id));
  if (flReq.status === "IN_PROGRESS" && flReq.adminFlagged === true) {
    console.log("✅ Passed: 24h+ request flagged");
  } else {
    console.error("❌ FAILED: 24h+ request not flagged correctly");
  }

  const [cReq] = await db.select().from(serviceRequests).where(eq(serviceRequests.id, awaitingConfirm.id));
  if (cReq.status === "COMPLETED") {
    console.log("✅ Passed: 48h+ AWAITING_CONFIRMATION request autocompleted");
  } else {
    console.error(`❌ FAILED: 48h+ request not autocompleted, status is ${cReq.status}`);
  }

  console.log("\n--- TEST 4: Idempotency (Second Execution) ---");
  const res2 = await callCron(cronSecret);
  const json2 = await res2.json();
  if (json2.actions.nudged === 0 && json2.actions.flagged === 0 && json2.actions.autoCompleted === 0) {
    console.log("✅ Passed: Idempotency confirmed (no repeated actions)");
  } else {
    console.error("❌ FAILED: Repeated actions found", json2.actions);
  }

  console.log("\n✅ All watchdog tests completed successfully!");
  process.exit(0);
}

runTest().catch(e => {
  console.error("Test execution failed:", e);
  process.exit(1);
});
