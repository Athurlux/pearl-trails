import {
  boolean,
  index,
  integer,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  serial,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import { STAY_TYPES } from "@/lib/stay-types";

/**
 * Release 2 discovery schema.
 *
 * Deliberately small: destinations, stays, amenities and the join between them.
 * Rooms, availability, bookings and money movement are later releases and are
 * not modelled here — a half-built booking schema is worse than none.
 */

export const stayTypeEnum = pgEnum("stay_type", STAY_TYPES);

export const destinations = pgTable(
  "destinations",
  {
    id: serial("id").primaryKey(),
    slug: varchar("slug", { length: 64 }).notNull(),
    name: varchar("name", { length: 120 }).notNull(),
    region: varchar("region", { length: 120 }).notNull(),
    tagline: varchar("tagline", { length: 200 }).notNull(),
    blurb: text("blurb").notNull(),
    image: varchar("image", { length: 255 }).notNull(),
    imageAlt: varchar("image_alt", { length: 255 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("destinations_slug_key").on(t.slug)],
);

export const amenities = pgTable(
  "amenities",
  {
    id: serial("id").primaryKey(),
    slug: varchar("slug", { length: 64 }).notNull(),
    name: varchar("name", { length: 120 }).notNull(),
  },
  (t) => [uniqueIndex("amenities_slug_key").on(t.slug)],
);

export const stays = pgTable(
  "stays",
  {
    id: serial("id").primaryKey(),
    slug: varchar("slug", { length: 96 }).notNull(),
    name: varchar("name", { length: 160 }).notNull(),
    destinationId: integer("destination_id")
      .notNull()
      .references(() => destinations.id, { onDelete: "restrict" }),
    stayType: stayTypeEnum("stay_type").notNull(),
    shortDescription: varchar("short_description", { length: 240 }).notNull(),
    description: text("description").notNull(),

    /**
     * Whole Ugandan shillings. UGX has no minor unit in practice, so an integer
     * is exact — never a float. `currency` is stored explicitly so a second
     * currency later cannot be silently compared against UGX.
     */
    priceFromUgx: integer("price_from_ugx").notNull(),
    currency: varchar("currency", { length: 3 }).notNull().default("UGX"),

    rating: numeric("rating", { precision: 2, scale: 1 }).notNull(),
    reviewCount: integer("review_count").notNull().default(0),
    maxGuests: smallint("max_guests").notNull(),
    featured: boolean("featured").notNull().default(false),

    image: varchar("image", { length: 255 }).notNull(),
    imageAlt: varchar("image_alt", { length: 255 }).notNull(),

    latitude: numeric("latitude", { precision: 8, scale: 5 }),
    longitude: numeric("longitude", { precision: 8, scale: 5 }),

    /**
     * Release 3 additions. All additive with defaults or nullable, so the
     * migration is safe against the 22 rows already in production.
     */
    highlights: text("highlights").array().notNull().default([]),
    locationNote: varchar("location_note", { length: 400 }),
    gettingThere: varchar("getting_there", { length: 400 }),

    checkInTime: varchar("check_in_time", { length: 16 }).notNull().default("14:00"),
    checkOutTime: varchar("check_out_time", { length: 16 }).notNull().default("10:00"),
    childrenNote: varchar("children_note", { length: 240 }),
    petsNote: varchar("pets_note", { length: 240 }),
    smokingNote: varchar("smoking_note", { length: 240 }),
    mealsNote: varchar("meals_note", { length: 240 }),
    accessibilityNote: varchar("accessibility_note", { length: 240 }),

    // Demo sentiment breakdown. Nullable: a property without enough ratings
    // shows no breakdown rather than an invented one.
    ratingCleanliness: numeric("rating_cleanliness", { precision: 2, scale: 1 }),
    ratingLocation: numeric("rating_location", { precision: 2, scale: 1 }),
    ratingService: numeric("rating_service", { precision: 2, scale: 1 }),
    ratingExperience: numeric("rating_experience", { precision: 2, scale: 1 }),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("stays_slug_key").on(t.slug),
    // Indexes follow the actual Explore query: filter by destination and type,
    // order by price. Nothing is indexed speculatively.
    index("stays_destination_id_idx").on(t.destinationId),
    index("stays_stay_type_idx").on(t.stayType),
    index("stays_price_idx").on(t.priceFromUgx),
    // Full-text search vector, maintained by Postgres itself so it can never
    // drift from the row. Weighted: name beats type beats prose.
    index("stays_search_idx").using(
      "gin",
      sql`(
        setweight(to_tsvector('english', ${t.name}), 'A') ||
        setweight(to_tsvector('english', ${t.shortDescription}), 'C') ||
        setweight(to_tsvector('english', ${t.description}), 'D')
      )`,
    ),
  ],
);

export const stayAmenities = pgTable(
  "stay_amenities",
  {
    stayId: integer("stay_id")
      .notNull()
      .references(() => stays.id, { onDelete: "cascade" }),
    amenityId: integer("amenity_id")
      .notNull()
      .references(() => amenities.id, { onDelete: "cascade" }),
  },
  (t) => [
    primaryKey({ columns: [t.stayId, t.amenityId] }),
    index("stay_amenities_amenity_id_idx").on(t.amenityId),
  ],
);

/** Gallery images beyond the card hero, ordered by `position`. */
export const stayImages = pgTable(
  "stay_images",
  {
    id: serial("id").primaryKey(),
    stayId: integer("stay_id")
      .notNull()
      .references(() => stays.id, { onDelete: "cascade" }),
    url: varchar("url", { length: 255 }).notNull(),
    alt: varchar("alt", { length: 255 }).notNull(),
    position: smallint("position").notNull(),
  },
  (t) => [uniqueIndex("stay_images_stay_position_key").on(t.stayId, t.position)],
);

/**
 * The ways you can actually stay at a property — a suite, a tent, a pitch.
 *
 * Descriptive product offerings only. There is no inventory count, no
 * availability and no hold: Release 3 must not imply any of those exist.
 */
export const accommodationOptions = pgTable(
  "accommodation_options",
  {
    id: serial("id").primaryKey(),
    stayId: integer("stay_id")
      .notNull()
      .references(() => stays.id, { onDelete: "cascade" }),
    slug: varchar("slug", { length: 96 }).notNull(),
    name: varchar("name", { length: 160 }).notNull(),
    shortDescription: varchar("short_description", { length: 240 }).notNull(),
    guestCapacity: smallint("guest_capacity").notNull(),
    bedDescription: varchar("bed_description", { length: 160 }).notNull(),
    priceFromUgx: integer("price_from_ugx").notNull(),
    currency: varchar("currency", { length: 3 }).notNull().default("UGX"),
    sizeSqm: smallint("size_sqm"),
    features: text("features").array().notNull().default([]),
    image: varchar("image", { length: 255 }).notNull(),
    imageAlt: varchar("image_alt", { length: 255 }).notNull(),
    position: smallint("position").notNull().default(0),
  },
  (t) => [
    uniqueIndex("accommodation_options_stay_slug_key").on(t.stayId, t.slug),
    index("accommodation_options_stay_id_idx").on(t.stayId),
  ],
);

export const experiences = pgTable(
  "experiences",
  {
    id: serial("id").primaryKey(),
    slug: varchar("slug", { length: 96 }).notNull(),
    name: varchar("name", { length: 160 }).notNull(),
    shortDescription: varchar("short_description", { length: 240 }).notNull(),
    description: text("description").notNull(),
    destinationId: integer("destination_id").references(() => destinations.id, {
      onDelete: "set null",
    }),
    category: varchar("category", { length: 64 }).notNull(),
    duration: varchar("duration", { length: 64 }).notNull(),
    priceFromUgx: integer("price_from_ugx"),
    currency: varchar("currency", { length: 3 }).notNull().default("UGX"),
    image: varchar("image", { length: 255 }).notNull(),
    imageAlt: varchar("image_alt", { length: 255 }).notNull(),
    featured: boolean("featured").notNull().default(false),
  },
  (t) => [
    uniqueIndex("experiences_slug_key").on(t.slug),
    index("experiences_destination_id_idx").on(t.destinationId),
  ],
);

export const stayExperiences = pgTable(
  "stay_experiences",
  {
    stayId: integer("stay_id")
      .notNull()
      .references(() => stays.id, { onDelete: "cascade" }),
    experienceId: integer("experience_id")
      .notNull()
      .references(() => experiences.id, { onDelete: "cascade" }),
    position: smallint("position").notNull().default(0),
  },
  (t) => [
    primaryKey({ columns: [t.stayId, t.experienceId] }),
    index("stay_experiences_experience_id_idx").on(t.experienceId),
  ],
);

export const destinationsRelations = relations(destinations, ({ many }) => ({
  stays: many(stays),
  experiences: many(experiences),
}));

export const staysRelations = relations(stays, ({ one, many }) => ({
  destination: one(destinations, {
    fields: [stays.destinationId],
    references: [destinations.id],
  }),
  stayAmenities: many(stayAmenities),
  images: many(stayImages),
  accommodationOptions: many(accommodationOptions),
  stayExperiences: many(stayExperiences),
}));

export const stayImagesRelations = relations(stayImages, ({ one }) => ({
  stay: one(stays, { fields: [stayImages.stayId], references: [stays.id] }),
}));

export const accommodationOptionsRelations = relations(
  accommodationOptions,
  ({ one }) => ({
    stay: one(stays, { fields: [accommodationOptions.stayId], references: [stays.id] }),
  }),
);

export const experiencesRelations = relations(experiences, ({ one, many }) => ({
  destination: one(destinations, {
    fields: [experiences.destinationId],
    references: [destinations.id],
  }),
  stayExperiences: many(stayExperiences),
}));

export const stayExperiencesRelations = relations(stayExperiences, ({ one }) => ({
  stay: one(stays, { fields: [stayExperiences.stayId], references: [stays.id] }),
  experience: one(experiences, {
    fields: [stayExperiences.experienceId],
    references: [experiences.id],
  }),
}));

export const amenitiesRelations = relations(amenities, ({ many }) => ({
  stayAmenities: many(stayAmenities),
}));

export const stayAmenitiesRelations = relations(stayAmenities, ({ one }) => ({
  stay: one(stays, { fields: [stayAmenities.stayId], references: [stays.id] }),
  amenity: one(amenities, {
    fields: [stayAmenities.amenityId],
    references: [amenities.id],
  }),
}));

export type StayRow = typeof stays.$inferSelect;
export type DestinationRow = typeof destinations.$inferSelect;
export type AmenityRow = typeof amenities.$inferSelect;
export type StayImageRow = typeof stayImages.$inferSelect;
export type AccommodationOptionRow = typeof accommodationOptions.$inferSelect;
export type ExperienceRow = typeof experiences.$inferSelect;
export type { StayType } from "@/lib/stay-types";
