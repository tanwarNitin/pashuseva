import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

import { db } from "../src/db";
import { users, serviceRequests, providerProfiles, serviceRequestEvents } from "../src/db/schema";
import {
  createServiceRequest,
  acceptServiceRequest,
  startServiceRequest,
  markServiceRequestDone,
  confirmServiceRequest,
  disputeServiceRequest,
  resolveDisputeServiceRequest,
  cancelServiceRequest,
  expireServiceRequests
} from "../src/services/request.service";
import { eq, desc } from "drizzle-orm";
import crypto from "crypto";

async function runTest() {
  console.log("🚀 Starting State Machine Test...");

  // 1. Create a mock farmer and provider if they don't exist
  let [farmer] = await db.select().from(users).where(eq(users.role, "FARMER")).limit(1);
  if (!farmer) {
    const id = crypto.randomUUID();
    [farmer] = await db.insert(users).values({
      id,
      phone: "+91" + Math.floor(1000000000 + Math.random() * 9000000000).toString(),
      name: "Test Farmer",
      role: "FARMER",
      pinHash: "dummy",
    }).returning();
  }

  // Always create a fresh provider for testing
  const providerId = crypto.randomUUID();
  const [provider] = await db.insert(users).values({
    id: providerId,
    phone: "+91" + Math.floor(1000000000 + Math.random() * 9000000000).toString(),
    name: "Test Vet " + Date.now(),
    role: "VET_DOCTOR",
    pinHash: "dummy",
    status: "ACTIVE",
  }).returning();

  await db.insert(providerProfiles).values({
    userId: provider.id,
    qualification: "BVSc",
    registrationNumber: "VET" + Date.now(),
    registrationNumberNormalized: "VET" + Date.now(),
    registrationAuthority: "Test Auth",
    verificationStatus: "VERIFIED",
    baseVisitFeePaise: 10000,
    perKmFeePaise: 500
  });

  // Helper to print state
  const printState = async (id: string, step: string) => {
    const [req] = await db.select({ status: serviceRequests.status }).from(serviceRequests).where(eq(serviceRequests.id, id));
    console.log(`[${step}] Request status: ${req.status}`);
  };

  // Test 1: Happy Path (OPEN -> ACCEPTED -> IN_PROGRESS -> COMPLETED)
  console.log("\n--- TEST 1: Happy Path ---");
  const { id: req1Id } = await createServiceRequest({
    farmerId: farmer.id,
    kind: "SOS",
    serviceCode: "EMERGENCY",
    conditionSummary: "Test emergency",
    latitude: "28.0",
    longitude: "77.0",
    locationSource: "GPS",
    expiresAt: new Date(Date.now() + 1000000), // Future
    clientRequestId: crypto.randomUUID(),
    idempotencyPayloadHash: "hash1"
  }, farmer.id);
  await printState(req1Id, "Created");

  await acceptServiceRequest(req1Id, provider.id, provider.id);
  await printState(req1Id, "Accepted");

  await startServiceRequest(req1Id, provider.id, provider.id);
  await printState(req1Id, "Started");

  await markServiceRequestDone(req1Id, provider.id, provider.id);
  await printState(req1Id, "Marked Done");

  await confirmServiceRequest(req1Id, farmer.id, farmer.id);
  await printState(req1Id, "Confirmed");

  // Verify events
  const events = await db.select().from(serviceRequestEvents).where(eq(serviceRequestEvents.requestId, req1Id)).orderBy(serviceRequestEvents.createdAt);
  console.log(`Events recorded: ${events.map(e => e.eventType).join(" -> ")}`);

  // Test 2: Illegal Transitions
  console.log("\n--- TEST 2: Illegal Transitions ---");
  const { id: req2Id } = await createServiceRequest({
    farmerId: farmer.id,
    kind: "SOS",
    serviceCode: "EMERGENCY",
    conditionSummary: "Test emergency 2",
    latitude: "28.0",
    longitude: "77.0",
    locationSource: "GPS",
    expiresAt: new Date(Date.now() + 1000000), // Future
    clientRequestId: crypto.randomUUID(),
    idempotencyPayloadHash: "hash2"
  }, farmer.id);

  try {
    await startServiceRequest(req2Id, provider.id, provider.id);
    console.error("❌ FAILED: Should not be able to start an OPEN request");
  } catch (e: any) {
    console.log("✅ Passed: Blocked start of OPEN request (" + e.message + ")");
  }

  try {
    await markServiceRequestDone(req2Id, provider.id, provider.id);
    console.error("❌ FAILED: Should not be able to complete an OPEN request");
  } catch (e: any) {
    console.log("✅ Passed: Blocked complete of OPEN request (" + e.message + ")");
  }

  // Test 3: Expiry
  console.log("\n--- TEST 3: Expiry ---");
  const { id: req3Id } = await createServiceRequest({
    farmerId: farmer.id,
    kind: "SOS",
    serviceCode: "EMERGENCY",
    conditionSummary: "Test emergency 3",
    latitude: "28.0",
    longitude: "77.0",
    locationSource: "GPS",
    expiresAt: new Date(Date.now() - 10000), // Past
    clientRequestId: crypto.randomUUID(),
    idempotencyPayloadHash: "hash3"
  }, farmer.id);

  try {
    await acceptServiceRequest(req3Id, provider.id, provider.id);
    console.error("❌ FAILED: Should not be able to accept an expired request");
  } catch (e: any) {
    console.log("✅ Passed: Blocked accept of expired request (" + e.message + ")");
  }

  // Run expire utility
  const expiredCount = await expireServiceRequests();
  console.log(`✅ Expired ${expiredCount} requests automatically`);
  await printState(req3Id, "After expireServiceRequests()");

  // Test 4: Cancellation
  console.log("\n--- TEST 4: Cancellation ---");
  const { id: req4Id } = await createServiceRequest({
    farmerId: farmer.id,
    kind: "SOS",
    serviceCode: "EMERGENCY",
    conditionSummary: "Test emergency 4",
    latitude: "28.0",
    longitude: "77.0",
    locationSource: "GPS",
    expiresAt: new Date(Date.now() + 1000000),
    clientRequestId: crypto.randomUUID(),
    idempotencyPayloadHash: "hash4"
  }, farmer.id);

  await cancelServiceRequest(req4Id, farmer.id, "FARMER", "Not needed");
  await printState(req4Id, "Cancelled");

  try {
    await acceptServiceRequest(req4Id, provider.id, provider.id);
    console.error("❌ FAILED: Should not be able to accept cancelled request");
  } catch (e: any) {
    console.log("✅ Passed: Blocked accept of cancelled request (" + e.message + ")");
  }

  console.log("\n✅ All tests completed successfully!");

  // Test 5: Negative confirmation flow tests
  console.log("\n--- TEST 5: Negative Confirmation Flow Tests ---");

  // Create another farmer
  const otherFarmerId = crypto.randomUUID();
  const [otherFarmer] = await db.insert(users).values({
    id: otherFarmerId,
    phone: "+91" + Math.floor(1000000000 + Math.random() * 9000000000).toString(),
    name: "Other Farmer",
    role: "FARMER",
    pinHash: "dummy",
    status: "ACTIVE",
  }).returning();

  // Create an admin
  const adminId = crypto.randomUUID();
  const [admin] = await db.insert(users).values({
    id: adminId,
    phone: "+91" + Math.floor(1000000000 + Math.random() * 9000000000).toString(),
    name: "Test Admin",
    role: "ADMIN",
    pinHash: "dummy",
    status: "ACTIVE",
  }).returning();

  const { id: req5Id } = await createServiceRequest({
    farmerId: farmer.id,
    kind: "SOS",
    serviceCode: "EMERGENCY",
    conditionSummary: "Test negative flow",
    latitude: "28.0",
    longitude: "77.0",
    locationSource: "GPS",
    expiresAt: new Date(Date.now() + 1000000),
    clientRequestId: crypto.randomUUID(),
    idempotencyPayloadHash: "hash5"
  }, farmer.id);

  await acceptServiceRequest(req5Id, provider.id, provider.id);
  await startServiceRequest(req5Id, provider.id, provider.id);

  // 5a. direct IN_PROGRESS -> COMPLETED rejected
  try {
    await confirmServiceRequest(req5Id, farmer.id, farmer.id);
    console.error("❌ FAILED: Should not be able to confirm IN_PROGRESS request");
  } catch (e: any) {
    console.log("✅ Passed: Blocked direct IN_PROGRESS -> COMPLETED (" + e.message + ")");
  }

  await markServiceRequestDone(req5Id, provider.id, provider.id);

  // 5b. farmer confirming/disputing another farmer's request rejected
  try {
    await confirmServiceRequest(req5Id, farmer.id, otherFarmer.id);
    console.error("❌ FAILED: Should not be able to confirm someone else's request");
  } catch (e: any) {
    console.log("✅ Passed: Blocked confirming another's request (" + e.message + ")");
  }

  try {
    await disputeServiceRequest(req5Id, farmer.id, otherFarmer.id, "Invalid claim");
    console.error("❌ FAILED: Should not be able to dispute someone else's request");
  } catch (e: any) {
    console.log("✅ Passed: Blocked disputing another's request (" + e.message + ")");
  }

  // 5c. double-confirm rejected
  await confirmServiceRequest(req5Id, farmer.id, farmer.id);
  try {
    await confirmServiceRequest(req5Id, farmer.id, farmer.id);
    console.error("❌ FAILED: Should not be able to double confirm");
  } catch (e: any) {
    console.log("✅ Passed: Blocked double confirm (" + e.message + ")");
  }

  // 5d. non-admin dispute resolution rejected
  const { id: req6Id } = await createServiceRequest({
    farmerId: farmer.id,
    kind: "SOS",
    serviceCode: "EMERGENCY",
    conditionSummary: "Test negative flow dispute",
    latitude: "28.0",
    longitude: "77.0",
    locationSource: "GPS",
    expiresAt: new Date(Date.now() + 1000000),
    clientRequestId: crypto.randomUUID(),
    idempotencyPayloadHash: "hash6"
  }, farmer.id);

  await acceptServiceRequest(req6Id, provider.id, provider.id);
  await startServiceRequest(req6Id, provider.id, provider.id);
  await markServiceRequestDone(req6Id, provider.id, provider.id);
  await disputeServiceRequest(req6Id, farmer.id, farmer.id, "Did not show up");

  try {
    await resolveDisputeServiceRequest(req6Id, provider.id, "COMPLETED", "I am provider!");
    console.error("❌ FAILED: Non-admin should not be able to resolve dispute");
  } catch (e: any) {
    console.log("✅ Passed: Blocked non-admin dispute resolution (" + e.message + ")");
  }

  // 5e. Admin dispute resolution to COMPLETED
  await resolveDisputeServiceRequest(req6Id, admin.id, "COMPLETED", "Admin resolved: visit verified via phone");
  const [resolvedReq6] = await db.select({ status: serviceRequests.status }).from(serviceRequests).where(eq(serviceRequests.id, req6Id));
  if (resolvedReq6.status !== "COMPLETED") {
    throw new Error(`Expected COMPLETED, got ${resolvedReq6.status}`);
  }
  console.log("✅ Passed: Admin resolved DISPUTED -> COMPLETED");

  // 5f. Admin dispute resolution to CANCELLED
  const { id: req7Id } = await createServiceRequest({
    farmerId: farmer.id,
    kind: "SOS",
    serviceCode: "EMERGENCY",
    conditionSummary: "Test negative flow dispute 2",
    latitude: "28.0",
    longitude: "77.0",
    locationSource: "GPS",
    expiresAt: new Date(Date.now() + 1000000),
    clientRequestId: crypto.randomUUID(),
    idempotencyPayloadHash: "hash7"
  }, farmer.id);

  await acceptServiceRequest(req7Id, provider.id, provider.id);
  await startServiceRequest(req7Id, provider.id, provider.id);
  await markServiceRequestDone(req7Id, provider.id, provider.id);
  await disputeServiceRequest(req7Id, farmer.id, farmer.id, "Provider never reached location");
  await resolveDisputeServiceRequest(req7Id, admin.id, "CANCELLED", "Admin resolved: provider did not attend");
  const [resolvedReq7] = await db.select({ status: serviceRequests.status }).from(serviceRequests).where(eq(serviceRequests.id, req7Id));
  if (resolvedReq7.status !== "CANCELLED") {
    throw new Error(`Expected CANCELLED, got ${resolvedReq7.status}`);
  }
  console.log("✅ Passed: Admin resolved DISPUTED -> CANCELLED");

  console.log("\n✅ All tests completed successfully!");
  process.exit(0);
}

runTest().catch(e => {
  console.error("Test execution failed:", e);
  process.exit(1);
});
