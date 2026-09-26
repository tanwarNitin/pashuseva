CREATE TABLE "health_card_consents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"animal_id" uuid NOT NULL,
	"farmer_id" uuid NOT NULL,
	"provider_id" uuid NOT NULL,
	"granted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "health_card_consents" ADD CONSTRAINT "health_card_consents_animal_id_animals_id_fk" FOREIGN KEY ("animal_id") REFERENCES "public"."animals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "health_card_consents" ADD CONSTRAINT "health_card_consents_farmer_id_users_id_fk" FOREIGN KEY ("farmer_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "health_card_consents" ADD CONSTRAINT "health_card_consents_provider_id_provider_profiles_user_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."provider_profiles"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "health_card_consents_animal_id_idx" ON "health_card_consents" USING btree ("animal_id");--> statement-breakpoint
CREATE INDEX "health_card_consents_provider_id_idx" ON "health_card_consents" USING btree ("provider_id");--> statement-breakpoint
CREATE UNIQUE INDEX "health_card_consents_active_unique" ON "health_card_consents" USING btree ("animal_id","provider_id") WHERE revoked_at IS NULL;