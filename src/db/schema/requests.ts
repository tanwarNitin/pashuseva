import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  index,
  unique,
  check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { users } from "./users";
import { providerProfiles } from "./providers";

/**
 * Service requests table
 * Tracks service requests from farmers to providers
 */
export const serviceRequests = pgTable(
  "service_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // Requester
    farmerId: uuid("farmer_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    // Optional animal reference
    animalId: uuid("animal_id"), // FK added when animals table exists

    // Request type and service
    kind: text("kind").notNull(), // SOS, ROUTINE
    serviceCode: text("service_code").notNull(),
    status: text("status").notNull().default("OPEN"), // OPEN, ACCEPTED, IN_PROGRESS, AWAITING_CONFIRMATION, DISPUTED, COMPLETED, CANCELLED, EXPIRED

    // Condition
    conditionSummary: text("condition_summary").notNull(),

    // Farmer location at request time
    latitude: text("latitude").notNull(),
    longitude: text("longitude").notNull(),
    locationSource: text("location_source").notNull(),
    locationAccuracyM: text("location_accuracy_m"),
    locationDescription: text("location_description"),

    // Scheduling
    scheduledFor: timestamp("scheduled_for", { withTimezone: true }), // Nullable for SOS
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),

    // Provider assignment
    acceptedProviderId: uuid("accepted_provider_id").references(
      () => providerProfiles.userId
    ),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),

    // Cancellation
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    cancellationReason: text("cancellation_reason"),

    // Idempotency
    clientRequestId: text("client_request_id").notNull(),
    idempotencyPayloadHash: text("idempotency_payload_hash").notNull(),

    // Timestamps
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    farmerIdIdx: index("service_requests_farmer_id_idx").on(table.farmerId),
    statusIdx: index("service_requests_status_idx").on(table.status),
    kindIdx: index("service_requests_kind_idx").on(table.kind),
    acceptedProviderIdx: index("service_requests_accepted_provider_idx").on(
      table.acceptedProviderId
    ),
    expiresAtIdx: index("service_requests_expires_at_idx").on(table.expiresAt),
    createdAtIdx: index("service_requests_created_at_idx").on(table.createdAt),

    // Unique idempotency key per farmer
    farmerClientIdUnique: unique("service_requests_farmer_client_id_unique").on(
      table.farmerId,
      table.clientRequestId
    ),

    // Note: Active SOS uniqueness enforced in application logic and via idempotency
    // Partial unique index will be added via raw SQL migration

    // Routine requests require future scheduled time
    routineScheduleCheck: check(
      "service_requests_routine_schedule_check",
      sql`(kind = 'ROUTINE' AND scheduled_for IS NOT NULL) OR kind != 'ROUTINE'`
    ),

    // Accepted/in-progress/completed require assigned provider
    assignedProviderCheck: check(
      "service_requests_assigned_provider_check",
      sql`(status IN ('ACCEPTED', 'IN_PROGRESS', 'AWAITING_CONFIRMATION', 'DISPUTED', 'COMPLETED') AND accepted_provider_id IS NOT NULL) OR status NOT IN ('ACCEPTED', 'IN_PROGRESS', 'AWAITING_CONFIRMATION', 'DISPUTED', 'COMPLETED')`
    ),
  })
);

/**
 * Service request recipients table
 * Tracks which providers were offered a request
 */
export const serviceRequestRecipients = pgTable(
  "service_request_recipients",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    requestId: uuid("request_id")
      .notNull()
      .references(() => serviceRequests.id, { onDelete: "cascade" }),

    providerId: uuid("provider_id")
      .notNull()
      .references(() => providerProfiles.userId, { onDelete: "cascade" }),

    // Offer status
    offerStatus: text("offer_status").notNull().default("PENDING"), // PENDING, ACCEPTED, DECLINED, WITHDRAWN, EXPIRED

    // Snapshot at offer time
    distanceMSnapshot: integer("distance_m_snapshot").notNull(),
    baseVisitFeePaiseSnapshot: integer("base_visit_fee_paise_snapshot").notNull(),
    perKmFeePaiseSnapshot: integer("per_km_fee_paise_snapshot").notNull(),
    estimatedTotalPaiseSnapshot: integer("estimated_total_paise_snapshot").notNull(),

    // Response
    respondedAt: timestamp("responded_at", { withTimezone: true }),

    // Timestamps
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    requestIdIdx: index("service_request_recipients_request_id_idx").on(
      table.requestId
    ),
    providerIdIdx: index("service_request_recipients_provider_id_idx").on(
      table.providerId
    ),
    offerStatusIdx: index("service_request_recipients_offer_status_idx").on(
      table.offerStatus
    ),

    // Unique request/provider pair
    requestProviderUnique: unique(
      "service_request_recipients_request_provider_unique"
    ).on(table.requestId, table.providerId),
  })
);

/**
 * Service request events table
 * Append-only audit log of state transitions
 */
export const serviceRequestEvents = pgTable(
  "service_request_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    requestId: uuid("request_id")
      .notNull()
      .references(() => serviceRequests.id, { onDelete: "cascade" }),

    // Actor (nullable for automated expiry)
    actorUserId: uuid("actor_user_id").references(() => users.id),

    eventType: text("event_type").notNull(), // CREATED, OFFER_SENT, ACCEPTED, DECLINED, STARTED, MARKED_DONE, CONFIRMED, DISPUTED, RESOLVED_COMPLETED, RESOLVED_CANCELLED, CANCELLED, EXPIRED
    metadata: text("metadata"), // Strictly validated and minimized JSON

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    requestIdIdx: index("service_request_events_request_id_idx").on(
      table.requestId
    ),
    eventTypeIdx: index("service_request_events_event_type_idx").on(
      table.eventType
    ),
    createdAtIdx: index("service_request_events_created_at_idx").on(
      table.createdAt
    ),
  })
);

/**
 * Contact events table
 * Records tel:/WhatsApp link taps (not delivery or completion)
 */
export const contactEvents = pgTable(
  "contact_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    requestId: uuid("request_id")
      .notNull()
      .references(() => serviceRequests.id, { onDelete: "cascade" }),

    providerId: uuid("provider_id")
      .notNull()
      .references(() => providerProfiles.userId, { onDelete: "cascade" }),

    actorUserId: uuid("actor_user_id")
      .notNull()
      .references(() => users.id),

    channel: text("channel").notNull(), // PHONE, WHATSAPP
    eventType: text("event_type").notNull().default("LINK_OPEN_REQUESTED"), // Only track link opens, not delivery

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    requestIdIdx: index("contact_events_request_id_idx").on(table.requestId),
    providerIdIdx: index("contact_events_provider_id_idx").on(table.providerId),
    actorUserIdIdx: index("contact_events_actor_user_id_idx").on(
      table.actorUserId
    ),
  })
);

// Type exports
export type ServiceRequest = typeof serviceRequests.$inferSelect;
export type NewServiceRequest = typeof serviceRequests.$inferInsert;

export type ServiceRequestRecipient = typeof serviceRequestRecipients.$inferSelect;
export type NewServiceRequestRecipient = typeof serviceRequestRecipients.$inferInsert;

export type ServiceRequestEvent = typeof serviceRequestEvents.$inferSelect;
export type NewServiceRequestEvent = typeof serviceRequestEvents.$inferInsert;

export type ContactEvent = typeof contactEvents.$inferSelect;
export type NewContactEvent = typeof contactEvents.$inferInsert;
