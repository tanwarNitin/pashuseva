// Bypass server-only check for standalone Node scripts
try {
  const serverOnlyPath = require.resolve("server-only");
  require.cache[serverOnlyPath] = {
    id: serverOnlyPath,
    filename: serverOnlyPath,
    loaded: true,
    exports: {},
    paths: [],
    children: [],
    parent: null,
  } as any;
} catch {}

import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());

import { db, pool } from "@/db";
import {
  users,
  providerProfiles,
  providerServices,
  animals,
  serviceRequests,
  vaccinationRecords,
  medicalRecords,
  milkYieldEntries,
} from "@/db/schema";
import { hashPIN } from "@/lib/auth/pin";

async function seed() {
  console.log("🌱 Starting database seed...");

  try {
    // Clear existing data (in order of foreign key dependencies)
    console.log("🧹 Clearing existing data...");
    await db.delete(milkYieldEntries).catch(() => {});
    await db.delete(medicalRecords).catch(() => {});
    await db.delete(vaccinationRecords).catch(() => {});
    await db.delete(serviceRequests).catch(() => {});
    await db.delete(animals).catch(() => {});
    await db.delete(providerServices).catch(() => {});
    await db.delete(providerProfiles).catch(() => {});
    await db.delete(users).catch(() => {});

    // Create demo users with scrypt PIN hash (PIN: "1234")
    console.log("👥 Creating demo users...");
    const pinHash = await hashPIN("1234");
    const adminPinHash = await hashPIN("0000");
    await db.insert(users).values({name: "System Admin", phone: "+919999999999", role: "ADMIN", status: "ACTIVE", pinHash: adminPinHash, preferredLocale: "en"});

    // 1. Farmer Users (3 farmers)
    const [farmer1] = await db
      .insert(users)
      .values({
        name: "Rajesh Kumar",
        phone: "+919876543210",
        role: "FARMER",
        status: "ACTIVE",
        pinHash,
        preferredLocale: "hi",
      })
      .returning();

    const [farmer2] = await db
      .insert(users)
      .values({
        name: "Priya Sharma",
        phone: "+919876543211",
        role: "FARMER",
        status: "ACTIVE",
        pinHash,
        preferredLocale: "en",
      })
      .returning();

    const [farmer3] = await db
      .insert(users)
      .values({
        name: "Sunil Verma",
        phone: "+919876543212",
        role: "FARMER",
        status: "ACTIVE",
        pinHash,
        preferredLocale: "hi",
      })
      .returning();

    // 2. Approved & Available Provider Users (2 Vets, 2 Paravets)
    const [vet1] = await db
      .insert(users)
      .values({
        name: "Dr. Amit Singh",
        phone: "+919876543200",
        role: "VET_DOCTOR",
        status: "ACTIVE",
        pinHash,
        preferredLocale: "en",
      })
      .returning();

    const [vet2] = await db
      .insert(users)
      .values({
        name: "Dr. Sunita Patel",
        phone: "+919876543201",
        role: "VET_DOCTOR",
        status: "ACTIVE",
        pinHash,
        preferredLocale: "hi",
      })
      .returning();

    const [paravet1] = await db
      .insert(users)
      .values({
        name: "Ramesh Yadav",
        phone: "+919876543202",
        role: "PARAVET_WORKER",
        status: "ACTIVE",
        pinHash,
        preferredLocale: "hi",
      })
      .returning();

    const [paravet2] = await db
      .insert(users)
      .values({
        name: "Vikram Chauhan",
        phone: "+919876543203",
        role: "PARAVET_WORKER",
        status: "ACTIVE",
        pinHash,
        preferredLocale: "en",
      })
      .returning();

    // 3. Excluded Provider Users (1 Pending, 1 Suspended)
    const [pendingVet] = await db
      .insert(users)
      .values({
        name: "Dr. Kavita Roy",
        phone: "+919876543204",
        role: "VET_DOCTOR",
        status: "ACTIVE",
        pinHash,
        preferredLocale: "en",
      })
      .returning();

    const [suspendedVet] = await db
      .insert(users)
      .values({
        name: "Dr. Suresh Gupta",
        phone: "+919876543205",
        role: "VET_DOCTOR",
        status: "SUSPENDED",
        pinHash,
        preferredLocale: "hi",
      })
      .returning();

    console.log("✅ Created 9 users (3 farmers, 4 verified providers, 1 pending provider, 1 suspended provider)");

    // Create provider profiles
    console.log("🏥 Creating provider profiles...");

    await db.insert(providerProfiles).values([
      // Available Provider 1: Central Vet (CP, New Delhi)
      {
        userId: vet1.id,
        registrationNumber: "VET/UP/2020/001",
        registrationNumberNormalized: "VETUP2020001",
        registrationAuthority: "Uttar Pradesh Veterinary Council",
        qualification: "BVSc & AH, MVSc (Surgery)",
        specializationArea: "Large Animal Surgery",
        yearsOfExperience: 12,
        bio: "Experienced veterinary surgeon specializing in cattle and buffalo surgeries. Available for emergency and routine procedures.",
        baseVisitFeePaise: 15000, // ₹150
        perKmFeePaise: 800, // ₹8/km
        serviceRadiusMeters: 50000, // 50 km
        preferWhatsApp: true,
        verificationStatus: "VERIFIED",
        dutyStatus: "ON_DUTY",
        latitude: "28.6139",
        longitude: "77.2090",
        locationSource: "GPS",
      },
      // Available Provider 2: North Vet (Rohini ~14.5km North)
      {
        userId: vet2.id,
        registrationNumber: "VET/UP/2018/045",
        registrationNumberNormalized: "VETUP2018045",
        registrationAuthority: "Uttar Pradesh Veterinary Council",
        qualification: "BVSc & AH, MVSc (Medicine)",
        specializationArea: "Bovine Medicine & Reproduction",
        yearsOfExperience: 15,
        bio: "Specialist in bovine medicine, reproduction, and herd health management. Fluent in Hindi and English.",
        baseVisitFeePaise: 20000, // ₹200
        perKmFeePaise: 1000, // ₹10/km
        serviceRadiusMeters: 75000, // 75 km
        preferWhatsApp: true,
        verificationStatus: "VERIFIED",
        dutyStatus: "ON_DUTY",
        latitude: "28.7041",
        longitude: "77.1025",
        locationSource: "GPS",
      },
      // Available Provider 3: East Paravet (Noida ~20.5km East)
      {
        userId: paravet1.id,
        registrationNumber: "PVT/UP/2021/012",
        registrationNumberNormalized: "PVTUP2021012",
        registrationAuthority: "Uttar Pradesh Animal Husbandry Department",
        qualification: "Diploma in Animal Husbandry",
        specializationArea: "Vaccination & Basic Treatment",
        yearsOfExperience: 5,
        bio: "Certified paravet worker for vaccinations, deworming, and basic animal care. Serving rural communities.",
        baseVisitFeePaise: 5000, // ₹50
        perKmFeePaise: 300, // ₹3/km
        serviceRadiusMeters: 30000, // 30 km
        preferWhatsApp: false,
        verificationStatus: "VERIFIED",
        dutyStatus: "ON_DUTY",
        latitude: "28.5355",
        longitude: "77.3910",
        locationSource: "GPS",
      },
      // Available Provider 4: South Paravet (Faridabad ~30.8km South)
      {
        userId: paravet2.id,
        registrationNumber: "PVT/UP/2022/088",
        registrationNumberNormalized: "PVTUP2022088",
        registrationAuthority: "Uttar Pradesh Animal Husbandry Department",
        qualification: "Diploma in Animal Husbandry",
        specializationArea: "Artificial Insemination & First Aid",
        yearsOfExperience: 7,
        bio: "Paravet technician specializing in artificial insemination and livestock emergency assistance.",
        baseVisitFeePaise: 6000, // ₹60
        perKmFeePaise: 400, // ₹4/km
        serviceRadiusMeters: 40000, // 40 km
        preferWhatsApp: true,
        verificationStatus: "VERIFIED",
        dutyStatus: "ON_DUTY",
        latitude: "28.3670",
        longitude: "77.3160",
        locationSource: "GPS",
      },
      // Unmatched Provider 1: PENDING Verification (Not Approved)
      {
        userId: pendingVet.id,
        registrationNumber: "VET/UP/2024/101",
        registrationNumberNormalized: "VETUP2024101",
        registrationAuthority: "Uttar Pradesh Veterinary Council",
        qualification: "BVSc & AH",
        specializationArea: "General Practice",
        yearsOfExperience: 2,
        bio: "Junior veterinary officer, credentials pending verification.",
        baseVisitFeePaise: 12000,
        perKmFeePaise: 500,
        serviceRadiusMeters: 25000,
        preferWhatsApp: true,
        verificationStatus: "PENDING",
        dutyStatus: "OFF_DUTY",
        latitude: "28.6250",
        longitude: "77.2150",
        locationSource: "GPS",
      },
      // Unmatched Provider 2: SUSPENDED Verification
      {
        userId: suspendedVet.id,
        registrationNumber: "VET/UP/2015/009",
        registrationNumberNormalized: "VETUP2015009",
        registrationAuthority: "Uttar Pradesh Veterinary Council",
        qualification: "BVSc & AH",
        specializationArea: "Equine & Bovine Medicine",
        yearsOfExperience: 10,
        bio: "Veterinary profile suspended pending inquiry.",
        baseVisitFeePaise: 18000,
        perKmFeePaise: 700,
        serviceRadiusMeters: 50000,
        preferWhatsApp: false,
        verificationStatus: "SUSPENDED",
        dutyStatus: "OFF_DUTY",
        latitude: "28.6180",
        longitude: "77.2050",
        locationSource: "GPS",
      },
    ]);

    console.log("✅ Created 6 provider profiles (4 VERIFIED & ON_DUTY, 1 PENDING, 1 SUSPENDED)");

    // Enable services for providers
    console.log("🛠️ Seeding provider services catalog...");
    await db.insert(providerServices).values([
      { providerId: vet1.id, serviceCode: "EMERGENCY", enabled: true, approved: true },
      { providerId: vet1.id, serviceCode: "CONSULTATION", enabled: true, approved: true },
      { providerId: vet1.id, serviceCode: "VACCINATION", enabled: true, approved: true },
      { providerId: vet2.id, serviceCode: "EMERGENCY", enabled: true, approved: true },
      { providerId: vet2.id, serviceCode: "ARTIFICIAL_INSEMINATION", enabled: true, approved: true },
      { providerId: paravet1.id, serviceCode: "VACCINATION", enabled: true, approved: true },
      { providerId: paravet1.id, serviceCode: "BASIC_LIVESTOCK_ASSISTANCE", enabled: true, approved: true },
      { providerId: paravet2.id, serviceCode: "ARTIFICIAL_INSEMINATION", enabled: true, approved: true },
      { providerId: paravet2.id, serviceCode: "BASIC_LIVESTOCK_ASSISTANCE", enabled: true, approved: true },
    ]);

    // Create animals
    console.log("🐄 Creating animals...");

    const [animal1] = await db
      .insert(animals)
      .values({
        farmerId: farmer1.id,
        tagId: "TAG001",
        name: "Gauri",
        species: "CATTLE",
        breed: "Holstein Friesian",
        sex: "FEMALE",
        dateOfBirth: "2020-03-15",
        colorOrIdentifyingMarks: "White with black patches, small white star on forehead",
        notes: "High-yielding dairy cow, calm temperament",
      })
      .returning();

    const [animal2] = await db
      .insert(animals)
      .values({
        farmerId: farmer1.id,
        tagId: "TAG002",
        name: "Shyam",
        species: "CATTLE",
        breed: "Sahiwal",
        sex: "MALE",
        dateOfBirth: "2019-07-22",
        colorOrIdentifyingMarks: "Reddish brown, white tail switch",
        notes: "Breeding bull, good genetics",
      })
      .returning();

    const [animal3] = await db
      .insert(animals)
      .values({
        farmerId: farmer1.id,
        tagId: "TAG003",
        name: "Lakshmi",
        species: "BUFFALO",
        breed: "Murrah",
        sex: "FEMALE",
        dateOfBirth: "2021-01-10",
        colorOrIdentifyingMarks: "Jet black, curved horns",
        notes: "First lactation, excellent milk quality",
      })
      .returning();

    const [animal4] = await db
      .insert(animals)
      .values({
        farmerId: farmer2.id,
        tagId: "BK001",
        name: "Munni",
        species: "GOAT",
        breed: "Beetal",
        sex: "FEMALE",
        dateOfBirth: "2022-02-14",
        colorOrIdentifyingMarks: "Brown with white patches, long ears",
        notes: "Pregnant, due in 2 months",
      })
      .returning();

    console.log("✅ Created 4 animals tied to farmers");

    // Create vaccination records
    console.log("💉 Creating vaccination records...");

    await db.insert(vaccinationRecords).values([
      {
        animalId: animal1.id,
        farmerId: farmer1.id,
        vaccineName: "FMD Vaccine (Raksha Triovac)",
        diseaseTarget: "Foot and Mouth Disease",
        administeredOn: "2024-01-15",
        nextDueOn: "2025-01-15",
        batchNumber: "FMD24015A",
        administeredByText: "Dr. Amit Singh",
        source: "PROVIDER_ENTERED",
        createdByUserId: vet1.id,
        providerUserId: vet1.id,
        notes: "Annual booster dose",
      },
      {
        animalId: animal1.id,
        farmerId: farmer1.id,
        vaccineName: "HS+BQ Vaccine",
        diseaseTarget: "Haemorrhagic Septicaemia & Black Quarter",
        administeredOn: "2024-06-01",
        nextDueOn: "2024-12-01",
        batchNumber: "HSBQ24061B",
        administeredByText: "Ramesh Yadav",
        source: "PROVIDER_ENTERED",
        createdByUserId: paravet1.id,
        providerUserId: paravet1.id,
        notes: "Combined vaccine, 6-monthly",
      },
      {
        animalId: animal2.id,
        farmerId: farmer1.id,
        vaccineName: "FMD Vaccine (Raksha Triovac)",
        diseaseTarget: "Foot and Mouth Disease",
        administeredOn: "2024-02-20",
        nextDueOn: "2025-02-20",
        batchNumber: "FMD24022A",
        administeredByText: "Dr. Amit Singh",
        source: "PROVIDER_ENTERED",
        createdByUserId: vet1.id,
        providerUserId: vet1.id,
        notes: "",
      },
      {
        animalId: animal3.id,
        farmerId: farmer1.id,
        vaccineName: "Brucella Vaccine (S19)",
        diseaseTarget: "Brucellosis",
        administeredOn: "2024-03-10",
        nextDueOn: "2025-03-10",
        batchNumber: "BRU24031C",
        administeredByText: "Dr. Sunita Patel",
        source: "PROVIDER_ENTERED",
        createdByUserId: vet2.id,
        providerUserId: vet2.id,
        notes: "Calfhood vaccination",
      },
      {
        animalId: animal4.id,
        farmerId: farmer2.id,
        vaccineName: "PPR Vaccine",
        diseaseTarget: "Peste des Petits Ruminants",
        administeredOn: "2024-04-05",
        nextDueOn: "2025-04-05",
        batchNumber: "PPR24045D",
        administeredByText: "Farmer Self",
        source: "FARMER_REPORTED",
        createdByUserId: farmer2.id,
        notes: "Purchased from local vet store",
      },
    ]);

    console.log("✅ Created 5 vaccination records");

    // Create medical records
    console.log("📋 Creating medical records...");

    await db.insert(medicalRecords).values([
      {
        animalId: animal1.id,
        farmerId: farmer1.id,
        recordedOn: "2024-05-20",
        recordType: "PROVIDER_VISIT",
        symptoms: "Reduced appetite, mild fever (39.5°C), decreased milk yield (15L from 25L)",
        diagnosis: "Early stage mastitis - subclinical",
        treatment: "Intramammary antibiotic (Ceftiofur) for 3 days, anti-inflammatory (Meloxicam) for 2 days, udder hygiene protocol",
        followUpDate: "2024-05-27",
        source: "PROVIDER_ENTERED",
        createdByUserId: vet1.id,
        providerUserId: vet1.id,
        notes: "Milk sample sent for culture. Isolate: Staph aureus. Full recovery expected.",
      },
      {
        animalId: animal1.id,
        farmerId: farmer1.id,
        recordedOn: "2024-05-27",
        recordType: "FOLLOW_UP",
        symptoms: "Appetite normal, temperature 38.5°C, milk yield improving (20L)",
        diagnosis: "Mastitis resolving well",
        treatment: "Continue udder hygiene, complete antibiotic course",
        followUpDate: "2024-06-03",
        source: "PROVIDER_ENTERED",
        createdByUserId: vet1.id,
        providerUserId: vet1.id,
        notes: "Somatic cell count dropped from 800k to 200k. Excellent response.",
      },
      {
        animalId: animal3.id,
        farmerId: farmer1.id,
        recordedOn: "2024-07-10",
        recordType: "PROVIDER_VISIT",
        symptoms: "Difficulty calving, prolonged labor (>4 hours), calf presented in anterior position but head deviated",
        diagnosis: "Dystocia - head deviation",
        treatment: "Manual correction of head position, assisted delivery with calf jack, oxytocin 20 IU IM post-delivery, antibiotics for 3 days",
        followUpDate: "2024-07-12",
        source: "PROVIDER_ENTERED",
        createdByUserId: vet2.id,
        providerUserId: vet2.id,
        notes: "Live male calf delivered (38 kg). Mother recovering well. Colostrum fed within 1 hour.",
      },
      {
        animalId: animal4.id,
        farmerId: farmer2.id,
        recordedOn: "2024-08-01",
        recordType: "FARMER_NOTE",
        symptoms: "Slight cough, clear nasal discharge, eating well",
        diagnosis: "",
        treatment: "Monitor for 3 days, steam inhalation with eucalyptus oil",
        followUpDate: "2024-08-04",
        source: "FARMER_REPORTED",
        createdByUserId: farmer2.id,
        notes: "Seasonal change, likely mild respiratory irritation. No fever.",
      },
    ]);

    console.log("✅ Created 4 medical records");

    // Create milk yield entries
    console.log("🥛 Creating milk yield entries...");

    const milkEntries = [];
    for (let i = 0; i < 30; i++) {
      const date = new Date("2024-08-01");
      date.setDate(date.getDate() - i);
      const baseYield = 25;
      const variation = (Math.random() - 0.5) * 4;
      const yieldLiters = Math.max(18, Math.min(30, baseYield + variation));

      milkEntries.push({
        animalId: animal1.id,
        farmerId: farmer1.id,
        recordedOn: date.toISOString().split("T")[0],
        litersPerDay: yieldLiters.toFixed(1),
        notes: i === 0 ? "Latest reading" : "",
      });
    }

    for (let i = 0; i < 15; i++) {
      const date = new Date("2024-08-01");
      date.setDate(date.getDate() - i * 2);
      const yieldLiters = 10 + Math.random() * 5;

      milkEntries.push({
        animalId: animal3.id,
        farmerId: farmer1.id,
        recordedOn: date.toISOString().split("T")[0],
        litersPerDay: yieldLiters.toFixed(1),
        notes: "",
      });
    }

    for (let i = 0; i < 10; i++) {
      const date = new Date("2024-08-01");
      date.setDate(date.getDate() - i * 3);
      const yieldLiters = 2 + Math.random() * 1.5;

      milkEntries.push({
        animalId: animal4.id,
        farmerId: farmer2.id,
        recordedOn: date.toISOString().split("T")[0],
        litersPerDay: yieldLiters.toFixed(1),
        notes: "",
      });
    }

    await db.insert(milkYieldEntries).values(milkEntries);
    console.log(`✅ Created ${milkEntries.length} milk yield entries`);

    // Create service requests
    console.log("📋 Creating service requests...");

    await db.insert(serviceRequests).values([
      {
        animalId: animal1.id,
        farmerId: farmer1.id,
        kind: "ROUTINE",
        serviceCode: "VACCINATION",
        conditionSummary: "Annual FMD booster vaccination and general health checkup for Gauri",
        latitude: "28.6139",
        longitude: "77.2090",
        locationSource: "GPS",
        scheduledFor: new Date(Date.now() + 24 * 60 * 60 * 1000), // Scheduled tomorrow
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        status: "OPEN",
        clientRequestId: "seed-req-001",
        idempotencyPayloadHash: "seed-hash-001",
      },
      {
        animalId: animal3.id,
        farmerId: farmer1.id,
        kind: "SOS",
        serviceCode: "EMERGENCY",
        conditionSummary: "Lakshmi (Murrah buffalo) in labor for 3+ hours, possible dystocia. Need immediate assistance!",
        latitude: "28.6139",
        longitude: "77.2090",
        locationSource: "GPS",
        expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000),
        status: "OPEN",
        clientRequestId: "seed-req-002",
        idempotencyPayloadHash: "seed-hash-002",
      },
      {
        animalId: animal4.id,
        farmerId: farmer2.id,
        kind: "ROUTINE",
        serviceCode: "CONSULTATION",
        conditionSummary: "Munni is pregnant (2 months), needs deworming and pregnancy verification",
        latitude: "28.6500",
        longitude: "77.2300",
        locationSource: "GPS",
        scheduledFor: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // Scheduled in 2 days
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        status: "OPEN",
        clientRequestId: "seed-req-003",
        idempotencyPayloadHash: "seed-hash-003",
      },
    ]);

    console.log("✅ Created 3 service requests");

    console.log("\n🎉 Seed completed successfully!");
    console.log("\n📋 Demo Accounts (PIN: 1234):");
    console.log("  👨‍🌾 Farmers:");
    console.log(`     - Rajesh Kumar: +919876543210 (ID: ${farmer1.id})`);
    console.log(`     - Priya Sharma: +919876543211 (ID: ${farmer2.id})`);
    console.log(`     - Sunil Verma:  +919876543212 (ID: ${farmer3.id})`);
    console.log("  👨‍⚕️ Available/Approved Providers (VERIFIED & ON_DUTY):");
    console.log(`     - Dr. Amit Singh (Vet):   +919876543200 (CP / Center: Lat 28.6139, Lng 77.2090)`);
    console.log(`     - Dr. Sunita Patel (Vet):  +919876543201 (Rohini / North: Lat 28.7041, Lng 77.1025)`);
    console.log(`     - Ramesh Yadav (Paravet):  +919876543202 (Noida / East: Lat 28.5355, Lng 77.3910)`);
    console.log(`     - Vikram Chauhan (Paravet):+919876543203 (Faridabad / South: Lat 28.3670, Lng 77.3160)`);
    console.log("  🚫 Excluded / Unmatched Providers:");
    console.log(`     - Dr. Kavita Roy (PENDING):  +919876543204 (Lat 28.6250, Lng 77.2150)`);
    console.log(`     - Dr. Suresh Gupta (SUSPENDED): +919876543205 (Lat 28.6180, Lng 77.2050)`);
  } catch (error) {
    console.error("❌ Seed failed:", error);
    throw error;
  } finally {
    await pool.end().catch(() => {});
  }
}

seed()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));