#!/usr/bin/env tsx
/**
 * Verification script for PashuSeva
 * Checks that all components are properly configured
 */

import { db } from "@/db";
import { users, providerProfiles, animals, serviceRequests } from "@/db/schema";
import { eq, count, sql } from "drizzle-orm";

async function verify() {
  console.log("🔍 Verifying PashuSeva setup...\n");
  let allPassed = true;

  // 1. Check database connection
  try {
    await db.execute(sql`SELECT 1`);
    console.log("✅ Database connection: OK");
  } catch (error) {
    console.log("❌ Database connection: FAILED");
    console.error(error);
    allPassed = false;
  }

  // 2. Check tables exist
  try {
    const tables = [
      { name: "users", model: users },
      { name: "provider_profiles", model: providerProfiles },
      { name: "animals", model: animals },
      { name: "service_requests", model: serviceRequests },
    ];

    for (const table of tables) {
      const [result] = await db.select({ count: count() }).from(table.model);
      console.log(`✅ Table ${table.name}: ${result.count} rows`);
    }
  } catch (error) {
    console.log("❌ Table check: FAILED");
    console.error(error);
    allPassed = false;
  }

  // 3. Check critical config
  const requiredEnv = [
    "DATABASE_URL",
    "NEXTAUTH_SECRET",
    "JWT_SECRET",
  ];

  for (const env of requiredEnv) {
    if (process.env[env]) {
      console.log(`✅ Environment ${env}: SET`);
    } else {
      console.log(`❌ Environment ${env}: MISSING`);
      allPassed = false;
    }
  }

  // 4. Check for demo data
  try {
    const [farmerCount] = await db.select({ count: count() }).from(users).where(eq(users.role, "FARMER"));
    const [providerCount] = await db.select({ count: count() }).from(providerProfiles).where(eq(providerProfiles.verificationStatus, "VERIFIED"));
    const [animalCount] = await db.select({ count: count() }).from(animals);

    if (farmerCount.count > 0) {
      console.log(`✅ Demo farmers: ${farmerCount.count}`);
    } else {
      console.log("⚠️  No demo farmers found (run db:seed)");
    }

    if (providerCount.count > 0) {
      console.log(`✅ Verified providers: ${providerCount.count}`);
    } else {
      console.log("⚠️  No verified providers found (run db:seed)");
    }

    if (animalCount.count > 0) {
      console.log(`✅ Demo animals: ${animalCount.count}`);
    } else {
      console.log("⚠️  No demo animals found (run db:seed)");
    }
  } catch (error) {
    console.log("❌ Demo data check: FAILED");
    console.error(error);
    allPassed = false;
  }

  // 5. Check Next.js build
  try {
    const fs = await import("fs");
    if (fs.existsSync(".next")) {
      console.log("✅ Next.js build: EXISTS");
    } else {
      console.log("⚠️  Next.js build: NOT FOUND (run npm run build)");
    }
  } catch (error) {
    console.log("⚠️  Next.js build check: SKIPPED");
  }

  console.log("\n" + "=".repeat(40));
  if (allPassed) {
    console.log("🎉 All critical checks passed!");
    process.exit(0);
  } else {
    console.log("❌ Some checks failed. Please review above.");
    process.exit(1);
  }
}

verify();