import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  integer,
  index,
  check,
  unique,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { users } from "./users";

/**
 * Provider profiles table
 * One profile per provider user (VET_DOCTOR or PARAVET_WORKER)
 */
export const providerProfiles = pgTable(
  "provider_profiles",
  {
    // Primary key is user_id (one profile per provider user)
    userId: uuid("user_id")
      .primaryKey()
      .references(() => users.id, { onDelete: "cascade" }),

    // Qualification and bio
    qualification: text("qualification").notNull(),
    bio: text("bio"),

    // Service area
    district: text("district"),
    state: text("state"),
    villageOrServiceArea: text("village_or_service_area"),

    // Credentials
    registrationNumber: text("registration_number").notNull(),
    registrationNumberNormalized: text("registration_number_normalized").notNull(),
    registrationAuthority: text("registration_authority").notNull(),
    certificateNumber: text("certificate_number"),
    certificateIssuer: text("certificate_issuer"),
    registrationDocumentPath: text("registration_document_path"),
    registrationDocumentMimeType: text("registration_document_mime_type"),

    // Verification
    verificationStatus: text("verification_status").notNull().default("PENDING"), // PENDING, VERIFIED, REJECTED, SUSPENDED
    verificationReviewedAt: timestamp("verification_reviewed_at", {
      withTimezone: true,
    }),
    verificationReason: text("verification_reason"),

    // Duty status
    dutyStatus: text("duty_status").notNull().default("OFF_DUTY"), // ON_DUTY, OFF_DUTY
    dutyExpiresAt: timestamp("duty_expires_at", { withTimezone: true }),

    // Location (both nullable or both valid)
    latitude: text("latitude"),
    longitude: text("longitude"),
    locationSource: text("location_source"), // GPS, MAP_PIN, APPROXIMATE
    locationAccuracyM: text("location_accuracy_m"),
    locationConfirmedAt: timestamp("location_confirmed_at", {
      withTimezone: true,
    }),

    // Specialization and experience
    specializationArea: text("specialization_area"),
    yearsOfExperience: integer("years_of_experience"),
    serviceRadiusMeters: integer("service_radius_meters"),

    // Contact preferences
    preferWhatsApp: boolean("prefer_whats_app").notNull().default(false),

    // Fees (in paise, non-negative)
    baseVisitFeePaise: integer("base_visit_fee_paise").notNull(),
    perKmFeePaise: integer("per_km_fee_paise").notNull(),

    // Consent
    publicContactConsentAt: timestamp("public_contact_consent_at", {
      withTimezone: true,
    }),
    publicMapConsentAt: timestamp("public_map_consent_at", {
      withTimezone: true,
    }),

    // Timestamps
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    verificationStatusIdx: index("provider_profiles_verification_status_idx").on(
      table.verificationStatus
    ),
    dutyStatusIdx: index("provider_profiles_duty_status_idx").on(
      table.dutyStatus
    ),
    dutyExpiresAtIdx: index("provider_profiles_duty_expires_at_idx").on(
      table.dutyExpiresAt
    ),
    locationConfirmedAtIdx: index(
      "provider_profiles_location_confirmed_at_idx"
    ).on(table.locationConfirmedAt),

    // Note: Verified credential uniqueness enforced via application logic
    // Partial unique index will be added via raw SQL migration

    // Check: latitude/longitude both null or both valid
    locationCheck: check(
      "provider_profiles_location_check",
      sql`(latitude IS NULL AND longitude IS NULL) OR (latitude IS NOT NULL AND longitude IS NOT NULL)`
    ),

    // Check: fees are non-negative
    baseFeeCheck: check(
      "provider_profiles_base_fee_check",
      sql`base_visit_fee_paise >= 0 AND base_visit_fee_paise <= 10000000`
    ),
    perKmFeeCheck: check(
      "provider_profiles_per_km_fee_check",
      sql`per_km_fee_paise >= 0 AND per_km_fee_paise <= 1000000`
    ),
  })
);

/**
 * Provider services table
 * Tracks which services each provider offers
 */
export const providerServices = pgTable(
  "provider_services",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    providerId: uuid("provider_id")
      .notNull()
      .references(() => providerProfiles.userId, { onDelete: "cascade" }),

    serviceCode: text("service_code").notNull(), // CONSULTATION, EMERGENCY, VACCINATION, ARTIFICIAL_INSEMINATION, BASIC_LIVESTOCK_ASSISTANCE
    enabled: boolean("enabled").notNull().default(true),
    approved: boolean("approved").notNull().default(false),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    providerIdIdx: index("provider_services_provider_id_idx").on(
      table.providerId
    ),
    serviceCodeIdx: index("provider_services_service_code_idx").on(
      table.serviceCode
    ),
    // Unique provider/service pair
    providerServiceUnique: unique("provider_services_provider_service_unique").on(
      table.providerId,
      table.serviceCode
    ),
  })
);

/**
 * Credential reviews table
 * Append-only operational audit of verification decisions
 */
export const credentialReviews = pgTable(
  "credential_reviews",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    providerId: uuid("provider_id")
      .notNull()
      .references(() => providerProfiles.userId, { onDelete: "cascade" }),

    decision: text("decision").notNull(), // VERIFIED, REJECTED, SUSPENDED
    reviewerReference: text("reviewer_reference").notNull(), // Operator identifier
    evidenceReference: text("evidence_reference"), // Registry or manual check reference
    notes: text("notes"), // Private operational notes

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    providerIdIdx: index("credential_reviews_provider_id_idx").on(
      table.providerId
    ),
    createdAtIdx: index("credential_reviews_created_at_idx").on(
      table.createdAt
    ),
  })
);

// Type exports
export type ProviderProfile = typeof providerProfiles.$inferSelect;
export type NewProviderProfile = typeof providerProfiles.$inferInsert;

export type ProviderService = typeof providerServices.$inferSelect;
export type NewProviderService = typeof providerServices.$inferInsert;

export type CredentialReview = typeof credentialReviews.$inferSelect;
export type NewCredentialReview = typeof credentialReviews.$inferInsert;
