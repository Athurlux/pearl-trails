CREATE TABLE "accommodation_options" (
	"id" serial PRIMARY KEY NOT NULL,
	"stay_id" integer NOT NULL,
	"slug" varchar(96) NOT NULL,
	"name" varchar(160) NOT NULL,
	"short_description" varchar(240) NOT NULL,
	"guest_capacity" smallint NOT NULL,
	"bed_description" varchar(160) NOT NULL,
	"price_from_ugx" integer NOT NULL,
	"currency" varchar(3) DEFAULT 'UGX' NOT NULL,
	"size_sqm" smallint,
	"features" text[] DEFAULT '{}' NOT NULL,
	"image" varchar(255) NOT NULL,
	"image_alt" varchar(255) NOT NULL,
	"position" smallint DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "experiences" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" varchar(96) NOT NULL,
	"name" varchar(160) NOT NULL,
	"short_description" varchar(240) NOT NULL,
	"description" text NOT NULL,
	"destination_id" integer,
	"category" varchar(64) NOT NULL,
	"duration" varchar(64) NOT NULL,
	"price_from_ugx" integer,
	"currency" varchar(3) DEFAULT 'UGX' NOT NULL,
	"image" varchar(255) NOT NULL,
	"image_alt" varchar(255) NOT NULL,
	"featured" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stay_experiences" (
	"stay_id" integer NOT NULL,
	"experience_id" integer NOT NULL,
	"position" smallint DEFAULT 0 NOT NULL,
	CONSTRAINT "stay_experiences_stay_id_experience_id_pk" PRIMARY KEY("stay_id","experience_id")
);
--> statement-breakpoint
CREATE TABLE "stay_images" (
	"id" serial PRIMARY KEY NOT NULL,
	"stay_id" integer NOT NULL,
	"url" varchar(255) NOT NULL,
	"alt" varchar(255) NOT NULL,
	"position" smallint NOT NULL
);
--> statement-breakpoint
ALTER TABLE "stays" ADD COLUMN "highlights" text[] DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE "stays" ADD COLUMN "location_note" varchar(400);--> statement-breakpoint
ALTER TABLE "stays" ADD COLUMN "getting_there" varchar(400);--> statement-breakpoint
ALTER TABLE "stays" ADD COLUMN "check_in_time" varchar(16) DEFAULT '14:00' NOT NULL;--> statement-breakpoint
ALTER TABLE "stays" ADD COLUMN "check_out_time" varchar(16) DEFAULT '10:00' NOT NULL;--> statement-breakpoint
ALTER TABLE "stays" ADD COLUMN "children_note" varchar(240);--> statement-breakpoint
ALTER TABLE "stays" ADD COLUMN "pets_note" varchar(240);--> statement-breakpoint
ALTER TABLE "stays" ADD COLUMN "smoking_note" varchar(240);--> statement-breakpoint
ALTER TABLE "stays" ADD COLUMN "meals_note" varchar(240);--> statement-breakpoint
ALTER TABLE "stays" ADD COLUMN "accessibility_note" varchar(240);--> statement-breakpoint
ALTER TABLE "stays" ADD COLUMN "rating_cleanliness" numeric(2, 1);--> statement-breakpoint
ALTER TABLE "stays" ADD COLUMN "rating_location" numeric(2, 1);--> statement-breakpoint
ALTER TABLE "stays" ADD COLUMN "rating_service" numeric(2, 1);--> statement-breakpoint
ALTER TABLE "stays" ADD COLUMN "rating_experience" numeric(2, 1);--> statement-breakpoint
ALTER TABLE "accommodation_options" ADD CONSTRAINT "accommodation_options_stay_id_stays_id_fk" FOREIGN KEY ("stay_id") REFERENCES "public"."stays"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "experiences" ADD CONSTRAINT "experiences_destination_id_destinations_id_fk" FOREIGN KEY ("destination_id") REFERENCES "public"."destinations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stay_experiences" ADD CONSTRAINT "stay_experiences_stay_id_stays_id_fk" FOREIGN KEY ("stay_id") REFERENCES "public"."stays"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stay_experiences" ADD CONSTRAINT "stay_experiences_experience_id_experiences_id_fk" FOREIGN KEY ("experience_id") REFERENCES "public"."experiences"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stay_images" ADD CONSTRAINT "stay_images_stay_id_stays_id_fk" FOREIGN KEY ("stay_id") REFERENCES "public"."stays"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "accommodation_options_stay_slug_key" ON "accommodation_options" USING btree ("stay_id","slug");--> statement-breakpoint
CREATE INDEX "accommodation_options_stay_id_idx" ON "accommodation_options" USING btree ("stay_id");--> statement-breakpoint
CREATE UNIQUE INDEX "experiences_slug_key" ON "experiences" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "experiences_destination_id_idx" ON "experiences" USING btree ("destination_id");--> statement-breakpoint
CREATE INDEX "stay_experiences_experience_id_idx" ON "stay_experiences" USING btree ("experience_id");--> statement-breakpoint
CREATE UNIQUE INDEX "stay_images_stay_position_key" ON "stay_images" USING btree ("stay_id","position");