import {
  pgTable,
  uuid,
  text,
  timestamp,
  date,
  integer,
  boolean,
  index,
  unique,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { users } from "./users";
import { providerProfiles } from "./providers";
import { serviceRequests } from "./requests";

/**
 * Animals table
 * Livestock owned by farmers
 */
export const animals = pgTable(
  "animals",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    farmerId: uuid("farmer_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    // Identification
    tagId: text("tag_id"), // Tag ID preserved as string for leading zeros
    name: text("name"),

    // Animal details
    species: text("species").notNull(), // cattle, buffalo, goat, sheep, etc.
    breed: text("breed"),
    sex: text("sex").notNull(), // MALE, FEMALE, UNKNOWN

    // Age information
    dateOfBirth: date("date_of_birth"),
    approximateAgeMonths: integer("approximate_age_months"),

    // Description
    colorOrIdentifyingMarks: text("color_or_identifying_marks"),
    notes: text("notes"),

    // Archival (soft delete)
    archivedAt: timestamp("archived_at", { withTimezone: true }),

    // Timestamps
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    farmerIdIdx: index("animals_farmer_id_idx").on(table.farmerId),
    speciesIdx: index("animals_species_idx").on(table.species),
    archivedAtIdx: index("animals_archived_at_idx").on(table.archivedAt),

    // Unique tag ID within farmer's herd (normalized)
    farmerTagUnique: unique("animals_farmer_tag_unique").on(
      table.farmerId,
      table.tagId
    ),
  })
);

/**
 * Milk yield entries table
 * Daily milk production records
 */
export const milkYieldEntries = pgTable(
  "milk_yield_entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    animalId: uuid("animal_id")
      .notNull()
      .references(() => animals.id, { onDelete: "cascade" }),

    farmerId: uuid("farmer_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    recordedOn: date("recorded_on").notNull(),
    litersPerDay: text("liters_per_day").notNull(), // Stored as text decimal for precision
    notes: text("notes"),
    source: text("source").notNull().default("FARMER_REPORTED"), // FARMER_REPORTED, PROVIDER_ENTERED

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    animalIdIdx: index("milk_yield_entries_animal_id_idx").on(table.animalId),
    farmerIdIdx: index("milk_yield_entries_farmer_id_idx").on(table.farmerId),
    recordedOnIdx: index("milk_yield_entries_recorded_on_idx").on(
      table.recordedOn
    ),
  })
);

/**
 * Vaccination records table
 * Tracks vaccinations administered to animals
 */
export const vaccinationRecords = pgTable(
  "vaccination_records",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    animalId: uuid("animal_id")
      .notNull()
      .references(() => animals.id, { onDelete: "cascade" }),

    farmerId: uuid("farmer_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    // Vaccine details
    vaccineName: text("vaccine_name").notNull(),
    diseaseTarget: text("disease_target"),

    // Administration
    administeredOn: date("administered_on").notNull(),
    nextDueOn: date("next_due_on"),
    batchNumber: text("batch_number"),
    administeredByText: text("administered_by_text"),
    providerUserId: uuid("provider_user_id").references(() => providerProfiles.userId),

    // Source
    source: text("source").notNull(), // FARMER_REPORTED, PROVIDER_ENTERED
    createdByUserId: uuid("created_by_user_id")
      .notNull()
      .references(() => users.id),

    notes: text("notes"),

    // Reminders
    reminderDismissed: boolean("reminder_dismissed").notNull().default(false),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    animalIdIdx: index("vaccination_records_animal_id_idx").on(table.animalId),
    farmerIdIdx: index("vaccination_records_farmer_id_idx").on(table.farmerId),
    administeredOnIdx: index("vaccination_records_administered_on_idx").on(
      table.administeredOn
    ),
    nextDueOnIdx: index("vaccination_records_next_due_on_idx").on(
      table.nextDueOn
    ),
    sourceIdx: index("vaccination_records_source_idx").on(table.source),
  })
);

/**
 * Medical records table
 * Health history and clinical notes
 */
export const medicalRecords = pgTable(
  "medical_records",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    animalId: uuid("animal_id")
      .notNull()
      .references(() => animals.id, { onDelete: "cascade" }),

    farmerId: uuid("farmer_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    // Optional link to service request
    serviceRequestId: uuid("service_request_id").references(
      () => serviceRequests.id
    ),

    // Record details
    recordedOn: date("recorded_on").notNull(),
    recordType: text("record_type").notNull(), // FARMER_NOTE, PROVIDER_VISIT, FOLLOW_UP
    symptoms: text("symptoms").notNull(),
    diagnosis: text("diagnosis"),
    treatment: text("treatment"),
    followUpDate: date("follow_up_date"),

    // Attribution
    source: text("source").notNull(), // FARMER_REPORTED, PROVIDER_ENTERED
    createdByUserId: uuid("created_by_user_id")
      .notNull()
      .references(() => users.id),
    providerUserId: uuid("provider_user_id").references(() => providerProfiles.userId),

    // Notes
    notes: text("notes"),

    // Corrections (append-only, link to corrected record)
    correctsRecordId: uuid("corrects_record_id").references((): any => medicalRecords.id, { onDelete: "set null" }),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    animalIdIdx: index("medical_records_animal_id_idx").on(table.animalId),
    farmerIdIdx: index("medical_records_farmer_id_idx").on(table.farmerId),
    serviceRequestIdIdx: index("medical_records_service_request_id_idx").on(
      table.serviceRequestId
    ),
    recordedOnIdx: index("medical_records_recorded_on_idx").on(
      table.recordedOn
    ),
    sourceIdx: index("medical_records_source_idx").on(table.source),
  })
);

// Type exports
export type Animal = typeof animals.$inferSelect;
export type NewAnimal = typeof animals.$inferInsert;

export type MilkYieldEntry = typeof milkYieldEntries.$inferSelect;
export type NewMilkYieldEntry = typeof milkYieldEntries.$inferInsert;

export type VaccinationRecord = typeof vaccinationRecords.$inferSelect;
export type NewVaccinationRecord = typeof vaccinationRecords.$inferInsert;

export type MedicalRecord = typeof medicalRecords.$inferSelect;
export type NewMedicalRecord = typeof medicalRecords.$inferInsert;

/**
 * Health card consents table
 * Tracks access grants given by farmers to providers
 */
export const healthCardConsents = pgTable(
  "health_card_consents",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    animalId: uuid("animal_id")
      .notNull()
      .references(() => animals.id, { onDelete: "cascade" }),

    farmerId: uuid("farmer_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    providerId: uuid("provider_id")
      .notNull()
      .references(() => providerProfiles.userId, { onDelete: "cascade" }),

    grantedAt: timestamp("granted_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
      
    revokedAt: timestamp("revoked_at", { withTimezone: true }),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    animalIdIdx: index("health_card_consents_animal_id_idx").on(table.animalId),
    providerIdIdx: index("health_card_consents_provider_id_idx").on(table.providerId),
    
    // Only one active grant per animal+provider pair
    activeGrantUnique: uniqueIndex("health_card_consents_active_unique")
      .on(table.animalId, table.providerId)
      .where(sql`revoked_at IS NULL`),
  })
);

export type HealthCardConsent = typeof healthCardConsents.$inferSelect;
export type NewHealthCardConsent = typeof healthCardConsents.$inferInsert;
