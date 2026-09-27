ALTER TABLE "service_requests" ADD COLUMN "status_changed_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "service_requests" ADD COLUMN "provider_nudged_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "service_requests" ADD COLUMN "admin_flagged" boolean DEFAULT false NOT NULL;