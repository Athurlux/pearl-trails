CREATE TYPE "public"."itinerary_source" AS ENUM('system', 'experience', 'traveller');--> statement-breakpoint
CREATE TYPE "public"."itinerary_system_kind" AS ENUM('check_in', 'check_out');--> statement-breakpoint
CREATE TYPE "public"."time_of_day" AS ENUM('morning', 'afternoon', 'evening', 'flexible');--> statement-breakpoint
CREATE TABLE "itinerary_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"booking_id" integer NOT NULL,
	"source" "itinerary_source" NOT NULL,
	"system_kind" "itinerary_system_kind",
	"booking_experience_id" integer,
	"day" date NOT NULL,
	"time_of_day" time_of_day DEFAULT 'flexible' NOT NULL,
	"exact_time" varchar(5),
	"title" varchar(120) NOT NULL,
	"note" varchar(500),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "itinerary_items_source_shape" CHECK ((
        ("itinerary_items"."source" = 'system'
           AND "itinerary_items"."system_kind" IS NOT NULL
           AND "itinerary_items"."booking_experience_id" IS NULL)
        OR ("itinerary_items"."source" = 'experience'
           AND "itinerary_items"."system_kind" IS NULL
           AND "itinerary_items"."booking_experience_id" IS NOT NULL)
        OR ("itinerary_items"."source" = 'traveller'
           AND "itinerary_items"."system_kind" IS NULL
           AND "itinerary_items"."booking_experience_id" IS NULL)
      )),
	CONSTRAINT "itinerary_items_title_not_blank" CHECK (length(btrim("itinerary_items"."title")) > 0)
);
--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "trip_note" varchar(1000);--> statement-breakpoint

--
-- trip_token_hash, in three steps rather than one.
--
-- drizzle-kit generated `ADD COLUMN ... NOT NULL` with no default, which fails
-- outright the moment the table has a row — and it does. Adding it nullable,
-- backfilling, then tightening is the standard expand/backfill/contract shape
-- and is safe against a populated production table.
--
-- The backfill stores the hash of a value nobody holds, which is deliberate: a
-- booking made before Release 5 has no trip link in circulation, so inventing
-- one and printing it somewhere would be worse than leaving it unreachable.
-- Those travellers recover a link through the email check on their confirmation
-- page, which mints a fresh token. See docs/decisions/004.
--
-- sha256() and gen_random_uuid() are both built in (PG 11 / PG 13), so this
-- needs no extension.
--
ALTER TABLE "bookings" ADD COLUMN "trip_token_hash" varchar(64);--> statement-breakpoint
UPDATE "bookings"
   SET "trip_token_hash" = encode(sha256((gen_random_uuid()::text || '.' || "id"::text)::bytea), 'hex')
 WHERE "trip_token_hash" IS NULL;--> statement-breakpoint
ALTER TABLE "bookings" ALTER COLUMN "trip_token_hash" SET NOT NULL;--> statement-breakpoint

ALTER TABLE "itinerary_items" ADD CONSTRAINT "itinerary_items_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "itinerary_items" ADD CONSTRAINT "itinerary_items_booking_experience_id_booking_experiences_id_fk" FOREIGN KEY ("booking_experience_id") REFERENCES "public"."booking_experiences"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "itinerary_items_booking_day_idx" ON "itinerary_items" USING btree ("booking_id","day");--> statement-breakpoint
CREATE UNIQUE INDEX "itinerary_items_system_kind_key" ON "itinerary_items" USING btree ("booking_id","system_kind") WHERE "itinerary_items"."system_kind" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "itinerary_items_booking_experience_key" ON "itinerary_items" USING btree ("booking_id","booking_experience_id") WHERE "itinerary_items"."booking_experience_id" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "bookings_trip_token_hash_key" ON "bookings" USING btree ("trip_token_hash");
