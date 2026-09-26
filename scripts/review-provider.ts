#!/usr/bin/env tsx
/**
 * CLI Credential Review Tool for PashuSeva
 * Spec §9.2: Trusted CLI review workflow for provider credentials.
 *
 * Usage:
 *   npm run provider:review -- --provider-id "<uuid>" --decision VERIFIED --reviewer "<ref>" --evidence "<ref>" [--notes "<notes>"]
 */

import { db } from "../src/db";
import { users, providerProfiles, credentialReviews } from "../src/db/schema";
import { eq, and, ne } from "drizzle-orm";

function parseArgs(args: string[]) {
  const parsed: Record<string, string> = {};
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith("--")) {
      const key = arg.slice(2);
      const val = args[i + 1];
      if (val && !val.startsWith("--")) {
        parsed[key] = val;
        i++;
      } else {
        parsed[key] = "true";
      }
    }
  }
  return parsed;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  const providerId = args["provider-id"] || args["providerId"] || args["id"];
  const decision = (args["decision"] || "").toUpperCase();
  const reviewer = args["reviewer"];
  const evidence = args["evidence"];
  const notes = args["notes"] || "";

  if (!providerId || !decision || !reviewer) {
    console.error(`
Error: Missing required arguments.

Usage:
  npm run provider:review -- \\
    --provider-id "<uuid>" \\
    --decision <VERIFIED|REJECTED|SUSPENDED|PENDING> \\
    --reviewer "<operator-reference>" \\
    --evidence "<registry-or-manual-check-reference>" \\
    [--notes "<optional review notes>"]
    `);
    process.exit(1);
  }

  const validDecisions = ["VERIFIED", "REJECTED", "SUSPENDED", "PENDING"];
  if (!validDecisions.includes(decision)) {
    console.error(`Error: Invalid decision '${decision}'. Must be one of: ${validDecisions.join(", ")}`);
    process.exit(1);
  }

  // 1. Validate provider exists and has a provider role
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, providerId))
    .limit(1);

  if (!user) {
    console.error(`Error: User with ID ${providerId} not found.`);
    process.exit(1);
  }

  if (user.role !== "VET_DOCTOR" && user.role !== "PARAVET_WORKER") {
    console.error(`Error: User ${user.name} (${user.id}) has role ${user.role}, which is not a provider role.`);
    process.exit(1);
  }

  const [profile] = await db
    .select()
    .from(providerProfiles)
    .where(eq(providerProfiles.userId, providerId))
    .limit(1);

  if (!profile) {
    console.error(`Error: Provider profile not found for user ${user.id}.`);
    process.exit(1);
  }

  // 2. Validate complete role-specific credentials when verifying
  if (decision === "VERIFIED") {
    if (!profile.registrationNumber || !profile.registrationAuthority || !profile.qualification) {
      console.error("Error: Incomplete provider credentials. Registration number, authority, and qualification are required for VERIFIED status.");
      process.exit(1);
    }

    // Check credential uniqueness among already verified providers
    const [duplicateVerified] = await db
      .select({ id: providerProfiles.userId })
      .from(providerProfiles)
      .where(
        and(
          eq(providerProfiles.registrationNumberNormalized, profile.registrationNumberNormalized),
          eq(providerProfiles.verificationStatus, "VERIFIED"),
          ne(providerProfiles.userId, providerId)
        )
      )
      .limit(1);

    if (duplicateVerified) {
      console.error(`Error: Registration number '${profile.registrationNumber}' is already verified for another provider (${duplicateVerified.id}).`);
      process.exit(1);
    }
  }

  console.log(`
--- Credential Review Summary ---
Provider ID:    ${providerId}
Name:           ${user.name}
Role:           ${user.role}
Phone:          ${user.phone}
Registration:   ${profile.registrationNumber} (${profile.registrationAuthority})
Document Path:  ${profile.registrationDocumentPath || "None"}
Current Status: ${profile.verificationStatus}
New Decision:   ${decision}
Reviewer:       ${reviewer}
Evidence Ref:   ${evidence || "N/A"}
Notes:          ${notes || "None"}
---------------------------------
  `);

  // 3. Database transaction
  await db.transaction(async (tx) => {
    // Write append-only review audit record
    await tx.insert(credentialReviews).values({
      providerId: providerId,
      decision: decision,
      reviewerReference: reviewer,
      evidenceReference: evidence || null,
      notes: notes || null,
    });

    const updateFields: {
      verificationStatus: string;
      verificationReviewedAt: Date;
      verificationReason: string | null;
      dutyStatus?: string;
      dutyExpiresAt?: Date | null;
    } = {
      verificationStatus: decision,
      verificationReviewedAt: new Date(),
      verificationReason: notes || `Reviewed by ${reviewer}`,
    };

    // If REJECTED, SUSPENDED, or PENDING, turn duty off immediately and clear lease
    if (decision !== "VERIFIED") {
      updateFields.dutyStatus = "OFF_DUTY";
      updateFields.dutyExpiresAt = null;
    }

    await tx
      .update(providerProfiles)
      .set(updateFields)
      .where(eq(providerProfiles.userId, providerId));
  });

  console.log(`✅ Success: Provider ${user.name} (${providerId}) status updated to ${decision}.`);
  process.exit(0);
}

main().catch((err) => {
  console.error("Fatal error during credential review:", err);
  process.exit(1);
});
