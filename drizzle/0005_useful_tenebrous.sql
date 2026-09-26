CREATE TABLE "routine_bookings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"farmer_id" uuid NOT NULL,
	"animal_id" uuid NOT NULL,
	"provider_id" uuid NOT NULL,
	"scheduled_for" timestamp with time zone NOT NULL,
	"reason" text NOT NULL,
	"status" text DEFAULT 'REQUESTED' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "routine_bookings" ADD CONSTRAINT "routine_bookings_farmer_id_users_id_fk" FOREIGN KEY ("farmer_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "routine_bookings" ADD CONSTRAINT "routine_bookings_animal_id_animals_id_fk" FOREIGN KEY ("animal_id") REFERENCES "public"."animals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "routine_bookings" ADD CONSTRAINT "routine_bookings_provider_id_provider_profiles_user_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."provider_profiles"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "routine_bookings_farmer_id_idx" ON "routine_bookings" USING btree ("farmer_id");--> statement-breakpoint
CREATE INDEX "routine_bookings_provider_id_idx" ON "routine_bookings" USING btree ("provider_id");--> statement-breakpoint
CREATE INDEX "routine_bookings_status_idx" ON "routine_bookings" USING btree ("status");--> statement-breakpoint
CREATE INDEX "routine_bookings_scheduled_for_idx" ON "routine_bookings" USING btree ("scheduled_for");