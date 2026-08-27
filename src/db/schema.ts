import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  integer,
  numeric,
  doublePrecision,
  timestamp,
  jsonb,
  pgEnum,
} from "drizzle-orm/pg-core";

// ─── Enums ──────────────────────────────────────────────────────────────────

export const userRoleEnum = pgEnum("user_role", [
  "FARMER",
  "VET_DOCTOR",
  "PARAVET_WORKER",
]);

export const languagePrefEnum = pgEnum("language_pref", ["hi", "en"]);

export const cattleTypeEnum = pgEnum("cattle_type", [
  "COW",
  "BUFFALO",
  "GOAT",
  "SHEEP",
  "OTHER",
]);

export const urgencyEnum = pgEnum("urgency", ["EMERGENCY_SOS", "ROUTINE"]);

export const emergencyTypeEnum = pgEnum("emergency_type", [
  "DYSTOCIA",
  "BLOAT",
  "HIGH_FEVER",
  "PROLAPSE",
  "FRACTURE_INJURY",
  "GENERAL_CHECKUP",
]);

export const requestStatusEnum = pgEnum("request_status", [
  "PENDING",
  "ACCEPTED",
  "COMPLETED",
  "CANCELLED",
]);

// ─── Users ──────────────────────────────────────────────────────────────────

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  phone: varchar("phone", { length: 10 }).unique().notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  role: userRoleEnum("role").notNull().default("FARMER"),
  languagePref: languagePrefEnum("language_pref").default("hi"),
  pinHash: text("pin_hash").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Vet Profiles ───────────────────────────────────────────────────────────

export const vetProfiles = pgTable("vet_profiles", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .references(() => users.id)
    .unique()
    .notNull(),
  qualification: varchar("qualification", { length: 100 }).notNull(),
  registrationNo: varchar("registration_no", { length: 50 }).notNull(),
  clinicName: varchar("clinic_name", { length: 150 }),
  experienceYears: integer("experience_years").notNull().default(1),
  isVerified: boolean("is_verified").default(false).notNull(),
  isOnDuty: boolean("is_on_duty").default(true).notNull(),
  latitude: doublePrecision("latitude").notNull(),
  longitude: doublePrecision("longitude").notNull(),
  addressText: text("address_text").notNull(),
  baseVisitFee: integer("base_visit_fee").notNull().default(200),
  perKmFee: integer("per_km_fee").notNull().default(10),
  serviceRadiusKm: integer("service_radius_km").notNull().default(25),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Cattle Records ─────────────────────────────────────────────────────────

/**
 * Vaccination history entry shape (stored in jsonb):
 * { name: string; date: string; next_due: string }
 *
 * Medical notes entry shape (stored in jsonb):
 * { date: string; vet_name: string; diagnosis: string; prescription: string }
 */
export const cattleRecords = pgTable("cattle_records", {
  id: uuid("id").primaryKey().defaultRandom(),
  farmerId: uuid("farmer_id")
    .references(() => users.id)
    .notNull(),
  tagNumber: varchar("tag_number", { length: 50 }).unique().notNull(),
  cattleType: cattleTypeEnum("cattle_type").notNull(),
  breedName: varchar("breed_name", { length: 50 }),
  ageMonths: integer("age_months"),
  isMilking: boolean("is_milking").default(false),
  dailyMilkYieldLiters: numeric("daily_milk_yield_liters", {
    precision: 4,
    scale: 1,
  }).default("0.0"),
  vaccinationHistory: jsonb("vaccination_history").$type<
    Array<{ name: string; date: string; next_due: string }>
  >(),
  medicalNotes: jsonb("medical_notes").$type<
    Array<{
      date: string;
      vet_name: string;
      diagnosis: string;
      prescription: string;
    }>
  >(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Emergency Requests ─────────────────────────────────────────────────────

export const emergencyRequests = pgTable("emergency_requests", {
  id: uuid("id").primaryKey().defaultRandom(),
  farmerId: uuid("farmer_id")
    .references(() => users.id)
    .notNull(),
  cattleId: uuid("cattle_id").references(() => cattleRecords.id),
  cattleType: varchar("cattle_type", { length: 20 }).notNull(),
  urgency: urgencyEnum("urgency").notNull(),
  emergencyType: emergencyTypeEnum("emergency_type").notNull(),
  description: text("description"),
  farmerLatitude: doublePrecision("farmer_latitude").notNull(),
  farmerLongitude: doublePrecision("farmer_longitude").notNull(),
  farmerAddress: text("farmer_address"),
  status: requestStatusEnum("status").notNull().default("PENDING"),
  acceptedByVetId: uuid("accepted_by_vet_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Type Exports ───────────────────────────────────────────────────────────

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type VetProfile = typeof vetProfiles.$inferSelect;
export type NewVetProfile = typeof vetProfiles.$inferInsert;
export type CattleRecord = typeof cattleRecords.$inferSelect;
export type NewCattleRecord = typeof cattleRecords.$inferInsert;
export type EmergencyRequest = typeof emergencyRequests.$inferSelect;
export type NewEmergencyRequest = typeof emergencyRequests.$inferInsert;
