-- Release 4 — reservation requests.
--
-- Non-destructive. Two new tables, one new enum, and one additive column with a
-- safe default on `accommodation_options`. Nothing existing is dropped, renamed
-- or retyped, so the Release 3 application keeps running against this schema
-- unchanged and a rollback of the app does not need a schema rollback.
--
-- Two things here are hand-written rather than generated, and must survive any
-- future `drizzle-kit generate`:
--
--   * the `btree_gist` extension and the `bookings_no_overlapping_unit`
--     exclusion constraint — drizzle-kit cannot express `EXCLUDE USING gist`;
--   * the ordering of the composite foreign key, which drizzle-kit emitted
--     *before* the unique index it depends on. Left as generated it fails with
--     "there is no unique constraint matching given keys".

-- Required by the exclusion constraint: lets a GiST index mix the equality
-- operators on integers with the overlap operator on a daterange.
CREATE EXTENSION IF NOT EXISTS btree_gist;--> statement-breakpoint
CREATE TYPE "public"."booking_status" AS ENUM('pending', 'confirmed', 'cancelled', 'expired');--> statement-breakpoint
CREATE TABLE "booking_experiences" (
	"id" serial PRIMARY KEY NOT NULL,
	"booking_id" integer NOT NULL,
	"experience_id" integer NOT NULL,
	"name_snapshot" varchar(160) NOT NULL,
	"price_ugx_snapshot" integer,
	"currency" varchar(3) DEFAULT 'UGX' NOT NULL,
	"guests" smallint NOT NULL,
	"line_total_ugx" integer DEFAULT 0 NOT NULL,
	"position" smallint DEFAULT 0 NOT NULL,
	CONSTRAINT "booking_experiences_guests_positive" CHECK ("booking_experiences"."guests" > 0),
	CONSTRAINT "booking_experiences_line_total_non_negative" CHECK ("booking_experiences"."line_total_ugx" >= 0)
);
--> statement-breakpoint
CREATE TABLE "bookings" (
	"id" serial PRIMARY KEY NOT NULL,
	"reference" varchar(20) NOT NULL,
	"request_token" uuid NOT NULL,
	"stay_id" integer NOT NULL,
	"accommodation_option_id" integer NOT NULL,
	"unit_index" smallint NOT NULL,
	"check_in" date NOT NULL,
	"check_out" date NOT NULL,
	"nights" smallint NOT NULL,
	"guests" smallint NOT NULL,
	"nightly_rate_ugx" integer NOT NULL,
	"accommodation_subtotal_ugx" integer NOT NULL,
	"experiences_subtotal_ugx" integer DEFAULT 0 NOT NULL,
	"estimated_total_ugx" integer NOT NULL,
	"currency" varchar(3) DEFAULT 'UGX' NOT NULL,
	"status" "booking_status" DEFAULT 'pending' NOT NULL,
	"guest_name" varchar(120) NOT NULL,
	"guest_email" varchar(254) NOT NULL,
	"guest_phone" varchar(32) NOT NULL,
	"guest_country" varchar(56) NOT NULL,
	"special_requests" varchar(1000),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bookings_dates_ordered" CHECK ("bookings"."check_out" > "bookings"."check_in"),
	CONSTRAINT "bookings_nights_match_dates" CHECK ("bookings"."nights" = "bookings"."check_out" - "bookings"."check_in"),
	CONSTRAINT "bookings_guests_positive" CHECK ("bookings"."guests" > 0),
	CONSTRAINT "bookings_unit_index_positive" CHECK ("bookings"."unit_index" > 0),
	CONSTRAINT "bookings_money_non_negative" CHECK ("bookings"."nightly_rate_ugx" >= 0 AND "bookings"."accommodation_subtotal_ugx" >= 0 AND "bookings"."experiences_subtotal_ugx" >= 0),
	CONSTRAINT "bookings_total_matches_parts" CHECK ("bookings"."estimated_total_ugx" = "bookings"."accommodation_subtotal_ugx" + "bookings"."experiences_subtotal_ugx")
);
--> statement-breakpoint
-- Existing rows become single-unit options. Conservative on purpose: this can
-- under-sell a property until the seed sets a real count, but it can never
-- overbook one. PostgreSQL 11+ stores the default in the catalogue rather than
-- rewriting the table, so this is fast on any size.
ALTER TABLE "accommodation_options" ADD COLUMN "inventory_count" smallint DEFAULT 1 NOT NULL;--> statement-breakpoint
-- Must exist before `bookings_option_stay_fk` can reference these columns.
CREATE UNIQUE INDEX "accommodation_options_id_stay_key" ON "accommodation_options" USING btree ("id","stay_id");--> statement-breakpoint
ALTER TABLE "accommodation_options" ADD CONSTRAINT "accommodation_options_inventory_positive" CHECK ("accommodation_options"."inventory_count" > 0);--> statement-breakpoint
ALTER TABLE "booking_experiences" ADD CONSTRAINT "booking_experiences_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_experiences" ADD CONSTRAINT "booking_experiences_experience_id_experiences_id_fk" FOREIGN KEY ("experience_id") REFERENCES "public"."experiences"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_stay_id_stays_id_fk" FOREIGN KEY ("stay_id") REFERENCES "public"."stays"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
-- Composite parent key: an accommodation option must belong to the stay the
-- booking claims. A single-column FK on the option id alone would let a booking
-- pair Bwindi's Forest Suite with a Kidepo property.
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_option_stay_fk" FOREIGN KEY ("accommodation_option_id","stay_id") REFERENCES "public"."accommodation_options"("id","stay_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "booking_experiences_booking_experience_key" ON "booking_experiences" USING btree ("booking_id","experience_id");--> statement-breakpoint
CREATE INDEX "booking_experiences_experience_id_idx" ON "booking_experiences" USING btree ("experience_id");--> statement-breakpoint
CREATE UNIQUE INDEX "bookings_reference_key" ON "bookings" USING btree ("reference");--> statement-breakpoint
CREATE UNIQUE INDEX "bookings_request_token_key" ON "bookings" USING btree ("request_token");--> statement-breakpoint
CREATE INDEX "bookings_option_dates_idx" ON "bookings" USING btree ("accommodation_option_id","check_in","check_out");--> statement-breakpoint
CREATE INDEX "bookings_stay_id_idx" ON "bookings" USING btree ("stay_id");--> statement-breakpoint
-- The no-double-booking invariant, enforced by the database itself.
--
-- Half-open '[)' ranges give standard hotel semantics: a booking that checks
-- out on the 15th does not overlap one that checks in on the 15th.
--
-- The WHERE clause is the blocking-status set, and must stay in step with
-- BLOCKING_BOOKING_STATUSES in src/lib/booking-status.ts. Cancelled and expired
-- requests release their unit.
--
-- This is what makes correctness possible without interactive transactions,
-- which the neon-http driver does not support. See
-- docs/decisions/001-booking-availability-and-concurrency.md.
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_no_overlapping_unit" EXCLUDE USING gist (
	"accommodation_option_id" WITH =,
	"unit_index" WITH =,
	daterange("check_in", "check_out", '[)') WITH &&
) WHERE ("status" IN ('pending', 'confirmed'));
