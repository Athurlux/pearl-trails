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

export const destinationsRelations = relations(destinations, ({ many }) => ({
  stays: many(stays),
}));

export const staysRelations = relations(stays, ({ one, many }) => ({
  destination: one(destinations, {
    fields: [stays.destinationId],
    references: [destinations.id],
  }),
  stayAmenities: many(stayAmenities),
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
export type { StayType } from "@/lib/stay-types";
