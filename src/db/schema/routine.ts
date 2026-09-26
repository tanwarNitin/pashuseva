import {
  pgTable,
  uuid,
  text,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { users } from "./users";
import { providerProfiles } from "./providers";
import { animals } from "./cattle";

/**
 * Routine bookings table
 * Tracks scheduled non-emergency service requests
 */
export const routineBookings = pgTable(
  "routine_bookings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    farmerId: uuid("farmer_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    animalId: uuid("animal_id")
      .notNull()
      .references(() => animals.id, { onDelete: "cascade" }),
    providerId: uuid("provider_id")
      .notNull()
      .references(() => providerProfiles.userId, { onDelete: "cascade" }),
    
    scheduledFor: timestamp("scheduled_for", { withTimezone: true }).notNull(),
    reason: text("reason").notNull(),
    
    // Statuses: REQUESTED, CONFIRMED, COMPLETED, CANCELLED, DECLINED
    status: text("status").notNull().default("REQUESTED"),
    
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    farmerIdIdx: index("routine_bookings_farmer_id_idx").on(table.farmerId),
    providerIdIdx: index("routine_bookings_provider_id_idx").on(table.providerId),
    statusIdx: index("routine_bookings_status_idx").on(table.status),
    scheduledForIdx: index("routine_bookings_scheduled_for_idx").on(table.scheduledFor),
  })
);

export type RoutineBooking = typeof routineBookings.$inferSelect;
export type NewRoutineBooking = typeof routineBookings.$inferInsert;
