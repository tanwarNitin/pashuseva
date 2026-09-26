CREATE TYPE "public"."account_status" AS ENUM('ACTIVE', 'SUSPENDED');--> statement-breakpoint
CREATE TYPE "public"."service_code" AS ENUM('CONSULTATION', 'EMERGENCY', 'VACCINATION', 'ARTIFICIAL_INSEMINATION', 'BASIC_LIVESTOCK_ASSISTANCE');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('FARMER', 'VET_DOCTOR', 'PARAVET_WORKER');--> statement-breakpoint
CREATE TABLE "animals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"farmer_id" uuid NOT NULL,
	"tag_id" text,
	"name" text,
	"species" text NOT NULL,
	"breed" text,
	"sex" text NOT NULL,
	"date_of_birth" date,
	"approximate_age_months" integer,
	"color_or_identifying_marks" text,
	"notes" text,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "animals_farmer_tag_unique" UNIQUE("farmer_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_type" text NOT NULL,
	"event_category" text NOT NULL,
	"actor_user_id" uuid,
	"actor_reference" text,
	"target_user_id" uuid,
	"resource_type" text,
	"resource_id" text,
	"metadata" text,
	"success" text NOT NULL,
	"error_code" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contact_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"request_id" uuid NOT NULL,
	"provider_id" uuid NOT NULL,
	"actor_user_id" uuid NOT NULL,
	"channel" text NOT NULL,
	"event_type" text DEFAULT 'LINK_OPEN_REQUESTED' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "credential_reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider_id" uuid NOT NULL,
	"decision" text NOT NULL,
	"reviewer_reference" text NOT NULL,
	"evidence_reference" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "medical_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"animal_id" uuid NOT NULL,
	"farmer_id" uuid NOT NULL,
	"service_request_id" uuid,
	"recorded_on" date NOT NULL,
	"record_type" text NOT NULL,
	"symptoms" text NOT NULL,
	"diagnosis" text,
	"treatment" text,
	"follow_up_date" date,
	"source" text NOT NULL,
	"created_by_user_id" uuid NOT NULL,
	"provider_user_id" uuid,
	"notes" text,
	"corrects_record_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "milk_yield_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"animal_id" uuid NOT NULL,
	"farmer_id" uuid NOT NULL,
	"recorded_on" date NOT NULL,
	"liters_per_day" text NOT NULL,
	"notes" text,
	"source" text DEFAULT 'FARMER_REPORTED' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "provider_profiles" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"qualification" text NOT NULL,
	"bio" text,
	"district" text,
	"state" text,
	"village_or_service_area" text,
	"registration_number" text NOT NULL,
	"registration_number_normalized" text NOT NULL,
	"registration_authority" text NOT NULL,
	"certificate_number" text,
	"certificate_issuer" text,
	"verification_status" text DEFAULT 'PENDING' NOT NULL,
	"verification_reviewed_at" timestamp with time zone,
	"verification_reason" text,
	"duty_status" text DEFAULT 'OFF_DUTY' NOT NULL,
	"duty_expires_at" timestamp with time zone,
	"latitude" text,
	"longitude" text,
	"location_source" text,
	"location_accuracy_m" text,
	"location_confirmed_at" timestamp with time zone,
	"specialization_area" text,
	"years_of_experience" integer,
	"service_radius_meters" integer,
	"prefer_whats_app" boolean DEFAULT false NOT NULL,
	"base_visit_fee_paise" integer NOT NULL,
	"per_km_fee_paise" integer NOT NULL,
	"public_contact_consent_at" timestamp with time zone,
	"public_map_consent_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "provider_profiles_location_check" CHECK ((latitude IS NULL AND longitude IS NULL) OR (latitude IS NOT NULL AND longitude IS NOT NULL)),
	CONSTRAINT "provider_profiles_base_fee_check" CHECK (base_visit_fee_paise >= 0 AND base_visit_fee_paise <= 10000000),
	CONSTRAINT "provider_profiles_per_km_fee_check" CHECK (per_km_fee_paise >= 0 AND per_km_fee_paise <= 1000000)
);
--> statement-breakpoint
CREATE TABLE "provider_services" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider_id" uuid NOT NULL,
	"service_code" text NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"approved" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "provider_services_provider_service_unique" UNIQUE("provider_id","service_code")
);
--> statement-breakpoint
CREATE TABLE "rate_limit_buckets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key_hash" text NOT NULL,
	"window_start" timestamp with time zone NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "rate_limit_buckets_key_hash_unique" UNIQUE("key_hash")
);
--> statement-breakpoint
CREATE TABLE "service_request_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"request_id" uuid NOT NULL,
	"actor_user_id" uuid,
	"event_type" text NOT NULL,
	"metadata" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "service_request_recipients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"request_id" uuid NOT NULL,
	"provider_id" uuid NOT NULL,
	"offer_status" text DEFAULT 'PENDING' NOT NULL,
	"distance_m_snapshot" integer NOT NULL,
	"base_visit_fee_paise_snapshot" integer NOT NULL,
	"per_km_fee_paise_snapshot" integer NOT NULL,
	"estimated_total_paise_snapshot" integer NOT NULL,
	"responded_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "service_request_recipients_request_provider_unique" UNIQUE("request_id","provider_id")
);
--> statement-breakpoint
CREATE TABLE "service_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"farmer_id" uuid NOT NULL,
	"animal_id" uuid,
	"kind" text NOT NULL,
	"service_code" text NOT NULL,
	"status" text DEFAULT 'OPEN' NOT NULL,
	"condition_summary" text NOT NULL,
	"latitude" text NOT NULL,
	"longitude" text NOT NULL,
	"location_source" text NOT NULL,
	"location_accuracy_m" text,
	"location_description" text,
	"scheduled_for" timestamp with time zone,
	"expires_at" timestamp with time zone NOT NULL,
	"accepted_provider_id" uuid,
	"accepted_at" timestamp with time zone,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"cancellation_reason" text,
	"client_request_id" text NOT NULL,
	"idempotency_payload_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "service_requests_farmer_client_id_unique" UNIQUE("farmer_id","client_request_id"),
	CONSTRAINT "service_requests_routine_schedule_check" CHECK ((kind = 'ROUTINE' AND scheduled_for IS NOT NULL) OR kind != 'ROUTINE'),
	CONSTRAINT "service_requests_assigned_provider_check" CHECK ((status IN ('ACCEPTED', 'IN_PROGRESS', 'COMPLETED') AND accepted_provider_id IS NOT NULL) OR status NOT IN ('ACCEPTED', 'IN_PROGRESS', 'COMPLETED'))
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	CONSTRAINT "sessions_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"phone_e164" text NOT NULL,
	"pin_hash" text NOT NULL,
	"name" text NOT NULL,
	"role" "user_role" NOT NULL,
	"preferred_locale" text DEFAULT 'en' NOT NULL,
	"status" "account_status" DEFAULT 'ACTIVE' NOT NULL,
	"phone_verified_at" timestamp with time zone,
	"is_demo" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_phone_e164_unique" UNIQUE("phone_e164")
);
--> statement-breakpoint
CREATE TABLE "vaccination_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"animal_id" uuid NOT NULL,
	"farmer_id" uuid NOT NULL,
	"vaccine_name" text NOT NULL,
	"disease_target" text,
	"administered_on" date NOT NULL,
	"next_due_on" date,
	"batch_number" text,
	"administered_by_text" text,
	"provider_user_id" uuid,
	"source" text NOT NULL,
	"created_by_user_id" uuid NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "animals" ADD CONSTRAINT "animals_farmer_id_users_id_fk" FOREIGN KEY ("farmer_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_target_user_id_users_id_fk" FOREIGN KEY ("target_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_events" ADD CONSTRAINT "contact_events_request_id_service_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."service_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_events" ADD CONSTRAINT "contact_events_provider_id_provider_profiles_user_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."provider_profiles"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_events" ADD CONSTRAINT "contact_events_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credential_reviews" ADD CONSTRAINT "credential_reviews_provider_id_provider_profiles_user_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."provider_profiles"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medical_records" ADD CONSTRAINT "medical_records_animal_id_animals_id_fk" FOREIGN KEY ("animal_id") REFERENCES "public"."animals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medical_records" ADD CONSTRAINT "medical_records_farmer_id_users_id_fk" FOREIGN KEY ("farmer_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medical_records" ADD CONSTRAINT "medical_records_service_request_id_service_requests_id_fk" FOREIGN KEY ("service_request_id") REFERENCES "public"."service_requests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medical_records" ADD CONSTRAINT "medical_records_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medical_records" ADD CONSTRAINT "medical_records_provider_user_id_provider_profiles_user_id_fk" FOREIGN KEY ("provider_user_id") REFERENCES "public"."provider_profiles"("user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medical_records" ADD CONSTRAINT "medical_records_corrects_record_id_medical_records_id_fk" FOREIGN KEY ("corrects_record_id") REFERENCES "public"."medical_records"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "milk_yield_entries" ADD CONSTRAINT "milk_yield_entries_animal_id_animals_id_fk" FOREIGN KEY ("animal_id") REFERENCES "public"."animals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "milk_yield_entries" ADD CONSTRAINT "milk_yield_entries_farmer_id_users_id_fk" FOREIGN KEY ("farmer_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_profiles" ADD CONSTRAINT "provider_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_services" ADD CONSTRAINT "provider_services_provider_id_provider_profiles_user_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."provider_profiles"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_request_events" ADD CONSTRAINT "service_request_events_request_id_service_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."service_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_request_events" ADD CONSTRAINT "service_request_events_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_request_recipients" ADD CONSTRAINT "service_request_recipients_request_id_service_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."service_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_request_recipients" ADD CONSTRAINT "service_request_recipients_provider_id_provider_profiles_user_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."provider_profiles"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_requests" ADD CONSTRAINT "service_requests_farmer_id_users_id_fk" FOREIGN KEY ("farmer_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_requests" ADD CONSTRAINT "service_requests_accepted_provider_id_provider_profiles_user_id_fk" FOREIGN KEY ("accepted_provider_id") REFERENCES "public"."provider_profiles"("user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vaccination_records" ADD CONSTRAINT "vaccination_records_animal_id_animals_id_fk" FOREIGN KEY ("animal_id") REFERENCES "public"."animals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vaccination_records" ADD CONSTRAINT "vaccination_records_farmer_id_users_id_fk" FOREIGN KEY ("farmer_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vaccination_records" ADD CONSTRAINT "vaccination_records_provider_user_id_provider_profiles_user_id_fk" FOREIGN KEY ("provider_user_id") REFERENCES "public"."provider_profiles"("user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vaccination_records" ADD CONSTRAINT "vaccination_records_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "animals_farmer_id_idx" ON "animals" USING btree ("farmer_id");--> statement-breakpoint
CREATE INDEX "animals_species_idx" ON "animals" USING btree ("species");--> statement-breakpoint
CREATE INDEX "animals_archived_at_idx" ON "animals" USING btree ("archived_at");--> statement-breakpoint
CREATE INDEX "audit_logs_actor_user_id_idx" ON "audit_logs" USING btree ("actor_user_id");--> statement-breakpoint
CREATE INDEX "audit_logs_target_user_id_idx" ON "audit_logs" USING btree ("target_user_id");--> statement-breakpoint
CREATE INDEX "audit_logs_event_type_idx" ON "audit_logs" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX "audit_logs_event_category_idx" ON "audit_logs" USING btree ("event_category");--> statement-breakpoint
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "contact_events_request_id_idx" ON "contact_events" USING btree ("request_id");--> statement-breakpoint
CREATE INDEX "contact_events_provider_id_idx" ON "contact_events" USING btree ("provider_id");--> statement-breakpoint
CREATE INDEX "contact_events_actor_user_id_idx" ON "contact_events" USING btree ("actor_user_id");--> statement-breakpoint
CREATE INDEX "credential_reviews_provider_id_idx" ON "credential_reviews" USING btree ("provider_id");--> statement-breakpoint
CREATE INDEX "credential_reviews_created_at_idx" ON "credential_reviews" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "medical_records_animal_id_idx" ON "medical_records" USING btree ("animal_id");--> statement-breakpoint
CREATE INDEX "medical_records_farmer_id_idx" ON "medical_records" USING btree ("farmer_id");--> statement-breakpoint
CREATE INDEX "medical_records_service_request_id_idx" ON "medical_records" USING btree ("service_request_id");--> statement-breakpoint
CREATE INDEX "medical_records_recorded_on_idx" ON "medical_records" USING btree ("recorded_on");--> statement-breakpoint
CREATE INDEX "medical_records_source_idx" ON "medical_records" USING btree ("source");--> statement-breakpoint
CREATE INDEX "milk_yield_entries_animal_id_idx" ON "milk_yield_entries" USING btree ("animal_id");--> statement-breakpoint
CREATE INDEX "milk_yield_entries_farmer_id_idx" ON "milk_yield_entries" USING btree ("farmer_id");--> statement-breakpoint
CREATE INDEX "milk_yield_entries_recorded_on_idx" ON "milk_yield_entries" USING btree ("recorded_on");--> statement-breakpoint
CREATE INDEX "provider_profiles_verification_status_idx" ON "provider_profiles" USING btree ("verification_status");--> statement-breakpoint
CREATE INDEX "provider_profiles_duty_status_idx" ON "provider_profiles" USING btree ("duty_status");--> statement-breakpoint
CREATE INDEX "provider_profiles_duty_expires_at_idx" ON "provider_profiles" USING btree ("duty_expires_at");--> statement-breakpoint
CREATE INDEX "provider_profiles_location_confirmed_at_idx" ON "provider_profiles" USING btree ("location_confirmed_at");--> statement-breakpoint
CREATE INDEX "provider_services_provider_id_idx" ON "provider_services" USING btree ("provider_id");--> statement-breakpoint
CREATE INDEX "provider_services_service_code_idx" ON "provider_services" USING btree ("service_code");--> statement-breakpoint
CREATE INDEX "rate_limit_buckets_key_hash_idx" ON "rate_limit_buckets" USING btree ("key_hash");--> statement-breakpoint
CREATE INDEX "rate_limit_buckets_expires_at_idx" ON "rate_limit_buckets" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "service_request_events_request_id_idx" ON "service_request_events" USING btree ("request_id");--> statement-breakpoint
CREATE INDEX "service_request_events_event_type_idx" ON "service_request_events" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX "service_request_events_created_at_idx" ON "service_request_events" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "service_request_recipients_request_id_idx" ON "service_request_recipients" USING btree ("request_id");--> statement-breakpoint
CREATE INDEX "service_request_recipients_provider_id_idx" ON "service_request_recipients" USING btree ("provider_id");--> statement-breakpoint
CREATE INDEX "service_request_recipients_offer_status_idx" ON "service_request_recipients" USING btree ("offer_status");--> statement-breakpoint
CREATE INDEX "service_requests_farmer_id_idx" ON "service_requests" USING btree ("farmer_id");--> statement-breakpoint
CREATE INDEX "service_requests_status_idx" ON "service_requests" USING btree ("status");--> statement-breakpoint
CREATE INDEX "service_requests_kind_idx" ON "service_requests" USING btree ("kind");--> statement-breakpoint
CREATE INDEX "service_requests_accepted_provider_idx" ON "service_requests" USING btree ("accepted_provider_id");--> statement-breakpoint
CREATE INDEX "service_requests_expires_at_idx" ON "service_requests" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "service_requests_created_at_idx" ON "service_requests" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "sessions_user_id_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "sessions_token_hash_idx" ON "sessions" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "sessions_expires_at_idx" ON "sessions" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "users_phone_idx" ON "users" USING btree ("phone_e164");--> statement-breakpoint
CREATE INDEX "users_role_idx" ON "users" USING btree ("role");--> statement-breakpoint
CREATE INDEX "users_status_idx" ON "users" USING btree ("status");--> statement-breakpoint
CREATE INDEX "users_is_demo_idx" ON "users" USING btree ("is_demo");--> statement-breakpoint
CREATE INDEX "vaccination_records_animal_id_idx" ON "vaccination_records" USING btree ("animal_id");--> statement-breakpoint
CREATE INDEX "vaccination_records_farmer_id_idx" ON "vaccination_records" USING btree ("farmer_id");--> statement-breakpoint
CREATE INDEX "vaccination_records_administered_on_idx" ON "vaccination_records" USING btree ("administered_on");--> statement-breakpoint
CREATE INDEX "vaccination_records_next_due_on_idx" ON "vaccination_records" USING btree ("next_due_on");--> statement-breakpoint
CREATE INDEX "vaccination_records_source_idx" ON "vaccination_records" USING btree ("source");