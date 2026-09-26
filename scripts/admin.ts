#!/usr/bin/env tsx
/**
 * Admin utility scripts for PashuSeva
 * Run with: npx tsx scripts/admin.ts <command>
 */



import { db } from "@/db";
import { users, providerProfiles, credentialReviews, animals, serviceRequests, vaccinationRecords, medicalRecords, milkYieldEntries } from "@/db/schema";
import { eq, and, sql, desc, asc, count, gte, lte, inArray, isNull } from "drizzle-orm";
import { hashPIN } from "@/lib/auth/pin";

interface Command {
  name: string;
  description: string;
  handler: (args: string[]) => Promise<void>;
}

const commands: Command[] = [
  {
    name: "list-users",
    description: "List all users with their roles and status",
    handler: async () => {
      const allUsers = await db.select().from(users).orderBy(users.createdAt);
      console.table(allUsers.map(u => ({
        id: u.id.slice(0, 8) + "...",
        name: u.name,
        phone: u.phone,
        role: u.role,
        status: u.status,
        language: u.preferredLocale,
        created: u.createdAt.toISOString().split("T")[0],
      })));
    },
  },
  {
    name: "list-providers",
    description: "List all provider profiles with verification status",
    handler: async () => {
      const providers = await db
        .select({
          id: providerProfiles.userId,
          name: users.name,
          phone: users.phone,
          type: users.role,
          regNumber: providerProfiles.registrationNumber,
          qualification: providerProfiles.qualification,
          specialization: providerProfiles.bio,
          experience: providerProfiles.qualification,
          verification: providerProfiles.verificationStatus,
          duty: providerProfiles.dutyStatus,
          baseFee: providerProfiles.baseVisitFeePaise,
          perKmFee: providerProfiles.perKmFeePaise,
          radius: sql<string>`'N/A'`.as("radius"),
        })
        .from(providerProfiles)
        .innerJoin(users, eq(providerProfiles.userId, users.id))
        .orderBy(providerProfiles.verificationStatus);

      console.table(providers.map(p => ({
        id: p.id.slice(0, 8) + "...",
        name: p.name,
        type: p.type,
        regNumber: p.regNumber,
        specialization: p.specialization,
        exp: p.experience,
        verified: p.verification,
        duty: p.duty,
        baseFee: `₹${(Number(p.baseFee) / 100).toFixed(0)}`,
        perKm: `₹${(Number(p.perKmFee) / 100).toFixed(0)}`,
        radius: p.radius === 'N/A' ? 'N/A' : `${(Number(p.radius) / 1000).toFixed(1)}km`,
      })));
    },
  },
  {
    name: "list-requests",
    description: "List all service requests with status",
    handler: async () => {
      const requests = await db
        .select({
          id: serviceRequests.id,
          type: serviceRequests.kind,
          status: serviceRequests.status,
          urgency: sql<string>`'N/A'`.as("urgency"),
          farmer: users.name,
          farmerPhone: users.phone,
          animal: animals.name,
          animalTag: animals.tagId,
          estimated: sql<string>`'N/A'`.as("estimated"),
          created: serviceRequests.createdAt,
          providerId: serviceRequests.acceptedProviderId,
        })
        .from(serviceRequests)
        .innerJoin(users, eq(serviceRequests.farmerId, users.id))
        .leftJoin(animals, eq(serviceRequests.animalId, animals.id))
        .orderBy(desc(serviceRequests.createdAt));

      console.table(requests.map(r => ({
        id: r.id.slice(0, 8) + "...",
        type: r.type,
        status: r.status,
        urgency: r.urgency,
        farmer: r.farmer,
        animal: `${r.animalTag} (${r.animal})`,
        estimated: `₹${(Number(r.estimated) / 100).toFixed(0)}`,
        provider: r.providerId?.slice(0, 8) + "..." || "unassigned",
        created: r.created.toISOString().split("T")[0],
      })));
    },
  },
  {
    name: "verify-provider",
    description: "Verify a provider by user ID",
    handler: async (args) => {
      const userId = args[0];
      if (!userId) {
        console.error("Usage: verify-provider <userId>");
        return;
      }

      const [provider] = await db
        .select()
        .from(providerProfiles)
        .where(eq(providerProfiles.userId, userId))
        .limit(1);

      if (!provider) {
        console.error(`Provider not found: ${userId}`);
        return;
      }

      await db.transaction(async (tx) => {
        await tx.insert(credentialReviews).values({
          providerId: userId,
          decision: "VERIFIED",
          reviewerReference: "admin-cli",
          evidenceReference: "Manual Admin Action",
          notes: "Verified via admin CLI",
        });

        await tx
          .update(providerProfiles)
          .set({
            verificationStatus: "VERIFIED",
            verificationReviewedAt: new Date(),
            verificationReason: "Verified via admin CLI",
          })
          .where(eq(providerProfiles.userId, userId));
      });

      console.log(`✅ Provider ${userId} verified`);
    },
  },
  {
    name: "unverify-provider",
    description: "Unverify a provider by user ID",
    handler: async (args) => {
      const userId = args[0];
      if (!userId) {
        console.error("Usage: unverify-provider <userId>");
        return;
      }

      await db.transaction(async (tx) => {
        await tx.insert(credentialReviews).values({
          providerId: userId,
          decision: "PENDING",
          reviewerReference: "admin-cli",
          evidenceReference: "Manual Admin Action",
          notes: "Unverified via admin CLI",
        });

        await tx
          .update(providerProfiles)
          .set({
            verificationStatus: "PENDING",
            dutyStatus: "OFF_DUTY",
            dutyExpiresAt: null,
            verificationReason: "Unverified via admin CLI",
          })
          .where(eq(providerProfiles.userId, userId));
      });

      console.log(`✅ Provider ${userId} unverified (set to PENDING and OFF_DUTY)`);
    },
  },
  {
    name: "toggle-duty",
    description: "Toggle provider duty status",
    handler: async (args) => {
      const userId = args[0];
      if (!userId) {
        console.error("Usage: toggle-duty <userId>");
        return;
      }

      const [provider] = await db
        .select({ dutyStatus: providerProfiles.dutyStatus })
        .from(providerProfiles)
        .where(eq(providerProfiles.userId, userId))
        .limit(1);

      if (!provider) {
        console.error(`Provider not found: ${userId}`);
        return;
      }

      const newStatus = provider.dutyStatus === "ON_DUTY" ? "OFF_DUTY" : "ON_DUTY";

      await db
        .update(providerProfiles)
        .set({ dutyStatus: newStatus })
        .where(eq(providerProfiles.userId, userId));

      console.log(`✅ Provider ${userId} duty status: ${newStatus}`);
    },
  },
  {
    name: "stats",
    description: "Show system statistics",
    handler: async () => {
      const [userCount] = await db.select({ count: count() }).from(users);
      const [farmerCount] = await db
        .select({ count: count() })
        .from(users)
        .where(eq(users.role, "FARMER"));
      const [vetCount] = await db
        .select({ count: count() })
        .from(users)
        .where(eq(users.role, "VET_DOCTOR"));
      const [paraCount] = await db
        .select({ count: count() })
        .from(users)
        .where(eq(users.role, "PARAVET_WORKER"));

      const [providerCount] = await db.select({ count: count() }).from(providerProfiles);
      const [verifiedCount] = await db
        .select({ count: count() })
        .from(providerProfiles)
        .where(eq(providerProfiles.verificationStatus, "VERIFIED"));
      const [onDutyCount] = await db
        .select({ count: count() })
        .from(providerProfiles)
        .where(eq(providerProfiles.dutyStatus, "ON_DUTY"));

      const [animalCount] = await db.select({ count: count() }).from(animals);
      const [requestCount] = await db.select({ count: count() }).from(serviceRequests);
      const [pendingRequests] = await db
        .select({ count: count() })
        .from(serviceRequests)
        .where(eq(serviceRequests.status, "PENDING"));
      const [vaccCount] = await db.select({ count: count() }).from(vaccinationRecords);
      const [medCount] = await db.select({ count: count() }).from(medicalRecords);
      const [milkCount] = await db.select({ count: count() }).from(milkYieldEntries);

      console.log("\n📊 PashuSeva System Statistics");
      console.log("═".repeat(40));
      console.log("Users:");
      console.log(`  Total: ${userCount.count}`);
      console.log(`  Farmers: ${farmerCount.count}`);
      console.log(`  Veterinarians: ${vetCount.count}`);
      console.log(`  Paravet Workers: ${paraCount.count}`);
      console.log("\nProviders:");
      console.log(`  Total Profiles: ${providerCount.count}`);
      console.log(`  Verified: ${verifiedCount.count}`);
      console.log(`  On Duty: ${onDutyCount.count}`);
      console.log("\nAnimals: " + animalCount.count);
      console.log("\nService Requests:");
      console.log(`  Total: ${requestCount.count}`);
      console.log(`  Pending: ${pendingRequests.count}`);
      console.log("\nHealth Records:");
      console.log(`  Vaccinations: ${vaccCount.count}`);
      console.log(`  Medical Records: ${medCount.count}`);
      console.log(`  Milk Yield Entries: ${milkCount.count}`);
    },
  },
  {
    name: "reset-pin",
    description: "Reset user PIN",
    handler: async (args) => {
      const userId = args[0];
      const newPin = args[1] || "demo123";

      if (!userId) {
        console.error("Usage: reset-pin <userId> [newPin]");
        return;
      }

      const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
      if (!user) {
        console.error(`User not found: ${userId}`);
        return;
      }

      const pinHash = await hashPIN(newPin);
      await db.update(users).set({ pinHash }).where(eq(users.id, userId));

      console.log(`✅ PIN reset for ${user.name} (${user.phone}) successful`);
    },
  },
  {
    name: "cleanup-old-requests",
    description: "Mark old pending requests as expired",
    handler: async (args) => {
      const days = parseInt(args[0]) || 7;
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      const result = await db
        .update(serviceRequests)
        .set({ status: "EXPIRED" })
        .where(
          and(
            eq(serviceRequests.status, "PENDING"),
            lte(serviceRequests.createdAt, cutoffDate)
          )
        );

      console.log(`✅ Marked ${result.rowCount} old pending requests as EXPIRED (older than ${days} days)`);
    },
  },
  {
    name: "overdue-vaccinations",
    description: "List animals with overdue vaccinations",
    handler: async () => {
      const today = new Date().toISOString().split("T")[0];

      const overdue = await db
        .select({
          animalName: animals.name,
          animalTag: animals.tagId,
          farmerName: users.name,
          farmerPhone: users.phone,
          vaccine: vaccinationRecords.vaccineName,
          disease: vaccinationRecords.diseaseTarget,
          nextDue: vaccinationRecords.nextDueOn,
        })
        .from(vaccinationRecords)
        .innerJoin(animals, eq(vaccinationRecords.animalId, animals.id))
        .innerJoin(users, eq(animals.farmerId, users.id))
        .where(
          and(
            lte(vaccinationRecords.nextDueOn, today),
            isNull(vaccinationRecords.administeredOn)
          )
        )
        .orderBy(vaccinationRecords.nextDueOn);

      if (overdue.length === 0) {
        console.log("✅ No overdue vaccinations found!");
        return;
      }

      console.log(`\n⚠️  Found ${overdue.length} overdue vaccination(s):`);
      console.table(overdue.map(v => ({
        animal: `${v.animalTag} (${v.animalName})`,
        farmer: v.farmerName,
        phone: v.farmerPhone,
        vaccine: v.vaccine,
        disease: v.disease,
        dueDate: v.nextDue,
      })));
    },
  },
];

async function main() {
  const args = process.argv.slice(2);
  const commandName = args[0];

  if (!commandName || commandName === "help" || commandName === "-h") {
    console.log("\n🔧 PashuSeva Admin Utilities");
    console.log("═".repeat(40));
    console.log("Usage: npx tsx scripts/admin.ts <command> [args...]\n");
    console.log("Available commands:");
    for (const cmd of commands) {
      console.log(`  ${cmd.name.padEnd(20)} ${cmd.description}`);
    }
    console.log();
    return;
  }

  const command = commands.find(c => c.name === commandName);
  if (!command) {
    console.error(`Unknown command: ${commandName}`);
    console.log("Run 'npx tsx scripts/admin.ts help' for available commands");
    process.exit(1);
  }

  try {
    await command.handler(args.slice(1));
    process.exit(0);
  } catch (error) {
    console.error("❌ Command failed:", error);
    process.exit(1);
  }
}

main();