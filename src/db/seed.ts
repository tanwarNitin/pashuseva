/**
 * Seed script — pre-populates demo data for development.
 * Run with: npx tsx src/db/seed.ts
 *
 * Creates:
 * - 1 demo farmer (Ramesh Kumar, Jaipur)
 * - 3 verified demo vets at realistic Indian coordinates
 * - All PINs set to "1234" for demo convenience
 */

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import bcrypt from "bcryptjs";
import { users, vetProfiles } from "./schema";
import { config } from "dotenv";

config({ path: ".env.local" });

async function seed() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("❌ DATABASE_URL is not set. Add it to .env.local");
    process.exit(1);
  }

  const client = postgres(databaseUrl, { prepare: false });
  const db = drizzle(client);

  const PIN_HASH = await bcrypt.hash("1234", 10);

  console.log("🌱 Seeding PashuSeva database...\n");

  // ─── 1. Demo Farmer ────────────────────────────────────────────────────────

  const [farmer] = await db
    .insert(users)
    .values({
      phone: "9876543210",
      name: "Ramesh Kumar",
      role: "FARMER",
      languagePref: "hi",
      pinHash: PIN_HASH,
    })
    .onConflictDoNothing({ target: users.phone })
    .returning();

  if (farmer) {
    console.log(`✅ Farmer: ${farmer.name} (${farmer.phone})`);
  } else {
    console.log("⏭️  Farmer already exists, skipping.");
  }

  // ─── 2. Demo Vet Doctors ───────────────────────────────────────────────────

  const vetData = [
    {
      user: {
        phone: "9001234001",
        name: "Dr. Priya Sharma",
        role: "VET_DOCTOR" as const,
        languagePref: "hi" as const,
        pinHash: PIN_HASH,
      },
      profile: {
        qualification: "BVSc & AH",
        registrationNo: "RJ-VCI-2019-4521",
        clinicName: "Sharma Pashu Chikitsalaya",
        experienceYears: 7,
        isVerified: true,
        isOnDuty: true,
        latitude: 26.9124,  // Jaipur
        longitude: 75.7873,
        addressText: "Near Vidyadhar Nagar, Jaipur, Rajasthan 302039",
        baseVisitFee: 200,
        perKmFee: 10,
        serviceRadiusKm: 25,
      },
    },
    {
      user: {
        phone: "9001234002",
        name: "Dr. Arun Yadav",
        role: "VET_DOCTOR" as const,
        languagePref: "en" as const,
        pinHash: PIN_HASH,
      },
      profile: {
        qualification: "MVSc (Surgery)",
        registrationNo: "UP-VCI-2017-7892",
        clinicName: "Yadav Veterinary Hospital",
        experienceYears: 10,
        isVerified: true,
        isOnDuty: true,
        latitude: 26.8467,  // Lucknow
        longitude: 80.9462,
        addressText: "Gomti Nagar, Lucknow, Uttar Pradesh 226010",
        baseVisitFee: 300,
        perKmFee: 12,
        serviceRadiusKm: 30,
      },
    },
    {
      user: {
        phone: "9001234003",
        name: "Dr. Sunita Patel",
        role: "PARAVET_WORKER" as const,
        languagePref: "hi" as const,
        pinHash: PIN_HASH,
      },
      profile: {
        qualification: "Diploma in Animal Husbandry",
        registrationNo: "MP-AHD-2021-3345",
        clinicName: undefined,
        experienceYears: 3,
        isVerified: true,
        isOnDuty: true,
        latitude: 23.2599,  // Bhopal
        longitude: 77.4126,
        addressText: "Habibganj, Bhopal, Madhya Pradesh 462024",
        baseVisitFee: 150,
        perKmFee: 8,
        serviceRadiusKm: 20,
      },
    },
    {
      user: {
        phone: "9001234004",
        name: "Dr. Rajesh Saini",
        role: "VET_DOCTOR" as const,
        languagePref: "hi" as const,
        pinHash: PIN_HASH,
      },
      profile: {
        qualification: "BVSc & AH (Senior Vet)",
        registrationNo: "RJ-VCI-2015-8821",
        clinicName: "Saini Veterinary Clinic Chomu",
        experienceYears: 9,
        isVerified: true,
        isOnDuty: true,
        latitude: 27.1712,  // Chomu, Jaipur
        longitude: 75.7205,
        addressText: "Radhaswami Bagh, Chomu, Jaipur, Rajasthan 303702",
        baseVisitFee: 250,
        perKmFee: 10,
        serviceRadiusKm: 30,
      },
    },
    {
      user: {
        phone: "9001234005",
        name: "Vikram Choudhary (Gopal Mitra)",
        role: "PARAVET_WORKER" as const,
        languagePref: "hi" as const,
        pinHash: PIN_HASH,
      },
      profile: {
        qualification: "Certified Paravet (Pashu Mitra)",
        registrationNo: "RJ-AHD-2020-1104",
        clinicName: "Chomu Animal Care Center",
        experienceYears: 5,
        isVerified: true,
        isOnDuty: true,
        latitude: 27.1765,  // Chomu Main Road, Jaipur
        longitude: 75.7280,
        addressText: "Main Bus Stand Road, Chomu, Jaipur, Rajasthan 303702",
        baseVisitFee: 120,
        perKmFee: 8,
        serviceRadiusKm: 25,
      },
    },
    {
      user: {
        phone: "9001234006",
        name: "Dr. Mukesh Kumar Verma",
        role: "VET_DOCTOR" as const,
        languagePref: "hi" as const,
        pinHash: PIN_HASH,
      },
      profile: {
        qualification: "MVSc (Cattle Medicine)",
        registrationNo: "RJ-VCI-2018-3319",
        clinicName: "Verma Pashu Swasthya Kendra",
        experienceYears: 6,
        isVerified: true,
        isOnDuty: true,
        latitude: 27.1620,  // Tankarda Road, Chomu
        longitude: 75.7110,
        addressText: "Tankarda Road, Chomu, Jaipur, Rajasthan 303702",
        baseVisitFee: 200,
        perKmFee: 10,
        serviceRadiusKm: 35,
      },
    },
  ];

  for (const vet of vetData) {
    const [insertedUser] = await db
      .insert(users)
      .values(vet.user)
      .onConflictDoNothing({ target: users.phone })
      .returning();

    if (insertedUser) {
      await db.insert(vetProfiles).values({
        userId: insertedUser.id,
        ...vet.profile,
      });
      console.log(
        `✅ Vet: ${insertedUser.name} (${vet.profile.qualification}) — ${vet.profile.addressText}`
      );
    } else {
      console.log(`⏭️  Vet ${vet.user.name} already exists, skipping.`);
    }
  }

  console.log("\n🎉 Seed complete!");
  await client.end();
  process.exit(0);
}

seed().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
