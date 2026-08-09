CREATE TYPE "public"."stay_type" AS ENUM('safari-lodge', 'campsite', 'eco-lodge', 'tented-camp', 'cabin', 'cottage', 'lakeside-stay');--> statement-breakpoint
CREATE TABLE "amenities" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" varchar(64) NOT NULL,
	"name" varchar(120) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "destinations" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" varchar(64) NOT NULL,
	"name" varchar(120) NOT NULL,
	"region" varchar(120) NOT NULL,
	"tagline" varchar(200) NOT NULL,
	"blurb" text NOT NULL,
	"image" varchar(255) NOT NULL,
	"image_alt" varchar(255) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stay_amenities" (
	"stay_id" integer NOT NULL,
	"amenity_id" integer NOT NULL,
	CONSTRAINT "stay_amenities_stay_id_amenity_id_pk" PRIMARY KEY("stay_id","amenity_id")
);
--> statement-breakpoint
CREATE TABLE "stays" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" varchar(96) NOT NULL,
	"name" varchar(160) NOT NULL,
	"destination_id" integer NOT NULL,
	"stay_type" "stay_type" NOT NULL,
	"short_description" varchar(240) NOT NULL,
	"description" text NOT NULL,
	"price_from_ugx" integer NOT NULL,
	"currency" varchar(3) DEFAULT 'UGX' NOT NULL,
	"rating" numeric(2, 1) NOT NULL,
	"review_count" integer DEFAULT 0 NOT NULL,
	"max_guests" smallint NOT NULL,
	"featured" boolean DEFAULT false NOT NULL,
	"image" varchar(255) NOT NULL,
	"image_alt" varchar(255) NOT NULL,
	"latitude" numeric(8, 5),
	"longitude" numeric(8, 5),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "stay_amenities" ADD CONSTRAINT "stay_amenities_stay_id_stays_id_fk" FOREIGN KEY ("stay_id") REFERENCES "public"."stays"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stay_amenities" ADD CONSTRAINT "stay_amenities_amenity_id_amenities_id_fk" FOREIGN KEY ("amenity_id") REFERENCES "public"."amenities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stays" ADD CONSTRAINT "stays_destination_id_destinations_id_fk" FOREIGN KEY ("destination_id") REFERENCES "public"."destinations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "amenities_slug_key" ON "amenities" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "destinations_slug_key" ON "destinations" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "stay_amenities_amenity_id_idx" ON "stay_amenities" USING btree ("amenity_id");--> statement-breakpoint
CREATE UNIQUE INDEX "stays_slug_key" ON "stays" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "stays_destination_id_idx" ON "stays" USING btree ("destination_id");--> statement-breakpoint
CREATE INDEX "stays_stay_type_idx" ON "stays" USING btree ("stay_type");--> statement-breakpoint
CREATE INDEX "stays_price_idx" ON "stays" USING btree ("price_from_ugx");--> statement-breakpoint
CREATE INDEX "stays_search_idx" ON "stays" USING gin ((
        setweight(to_tsvector('english', "name"), 'A') ||
        setweight(to_tsvector('english', "short_description"), 'C') ||
        setweight(to_tsvector('english', "description"), 'D')
      ));