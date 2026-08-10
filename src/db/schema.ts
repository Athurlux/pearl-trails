import {
  boolean,
  check,
  date,
  foreignKey,
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
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import { BOOKING_STATUSES } from "@/lib/booking-status";
import { STAY_TYPES } from "@/lib/stay-types";

/**
 * Discovery schema (Releases 2–3) plus reservation requests (Release 4).
 *
 * Money still moves nowhere: bookings carry price *snapshots* so historical
 * requests stay readable after a rate changes, but there is no ledger, no
 * payment and no balance. That is a later release.
 */

export const stayTypeEnum = pgEnum("stay_type", STAY_TYPES);
export const bookingStatusEnum = pgEnum("booking_status", BOOKING_STATUSES);

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
 * Release 4 adds `inventoryCount`: how many equivalent units of this option the
 * property has. That is the whole inventory model — no per-unit identity, no
 * rate calendar. See `docs/decisions/001-booking-availability-and-concurrency.md`.
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

    /**
     * Default 1, not unlimited: the ~45 rows already in production become
     * single-unit options, which can under-sell but can never overbook. The
     * seed then sets a realistic count per option.
     */
    inventoryCount: smallint("inventory_count").notNull().default(1),
  },
  (t) => [
    uniqueIndex("accommodation_options_stay_slug_key").on(t.stayId, t.slug),
    index("accommodation_options_stay_id_idx").on(t.stayId),
    /**
     * Redundant on its own — `id` is already unique — but it is what lets
     * `bookings` carry a composite foreign key on (option, stay). That makes
     * "this accommodation belongs to this property" a database guarantee
     * rather than a check some future caller might forget.
     */
    uniqueIndex("accommodation_options_id_stay_key").on(t.id, t.stayId),
    check("accommodation_options_inventory_positive", sql`${t.inventoryCount} > 0`),
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

/**
 * A reservation request.
 *
 * Release 4 takes no money. The `*Ugx` columns are **snapshots** of what the
 * traveller was quoted at the moment they requested, so a later rate change
 * cannot silently rewrite what someone asked for. They are not a ledger and
 * they are not a balance.
 *
 * Three invariants are enforced by Postgres rather than by application code,
 * because application code is exactly what tends to have bugs:
 *
 *   1. the accommodation belongs to the stay        — composite foreign key
 *   2. the stored totals and nights match the parts — check constraints
 *   3. no two blocking bookings share a unit and    — exclusion constraint,
 *      overlapping dates                              added in the migration
 *
 * The exclusion constraint is hand-written SQL in `drizzle/0002_*.sql`:
 * drizzle-kit cannot express `EXCLUDE USING gist`. It is the reason this
 * schema can be safe without interactive transactions, which the neon-http
 * driver does not support. See
 * `docs/decisions/001-booking-availability-and-concurrency.md`.
 */
export const bookings = pgTable(
  "bookings",
  {
    id: serial("id").primaryKey(),

    /** Human-quotable, unguessable, and the only key to the confirmation page. */
    reference: varchar("reference", { length: 20 }).notNull(),
    /** Client-minted idempotency key. Unique index makes a replay a no-op. */
    requestToken: uuid("request_token").notNull(),

    stayId: integer("stay_id")
      .notNull()
      .references(() => stays.id, { onDelete: "restrict" }),
    accommodationOptionId: integer("accommodation_option_id").notNull(),

    /** Which of the option's equivalent units, 1..inventoryCount. */
    unitIndex: smallint("unit_index").notNull(),

    /**
     * Calendar dates in Uganda, half-open `[checkIn, checkOut)`. `mode: string`
     * keeps them as `YYYY-MM-DD` end to end — a timestamp here would let a
     * browser in another timezone shift someone's check-in by a day.
     */
    checkIn: date("check_in", { mode: "string" }).notNull(),
    checkOut: date("check_out", { mode: "string" }).notNull(),
    nights: smallint("nights").notNull(),
    guests: smallint("guests").notNull(),

    nightlyRateUgx: integer("nightly_rate_ugx").notNull(),
    accommodationSubtotalUgx: integer("accommodation_subtotal_ugx").notNull(),
    experiencesSubtotalUgx: integer("experiences_subtotal_ugx").notNull().default(0),
    estimatedTotalUgx: integer("estimated_total_ugx").notNull(),
    currency: varchar("currency", { length: 3 }).notNull().default("UGX"),

    status: bookingStatusEnum("status").notNull().default("pending"),

    guestName: varchar("guest_name", { length: 120 }).notNull(),
    guestEmail: varchar("guest_email", { length: 254 }).notNull(),
    guestPhone: varchar("guest_phone", { length: 32 }).notNull(),
    guestCountry: varchar("guest_country", { length: 56 }).notNull(),
    specialRequests: varchar("special_requests", { length: 1000 }),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("bookings_reference_key").on(t.reference),
    uniqueIndex("bookings_request_token_key").on(t.requestToken),

    /**
     * The composite parent key. An option id alone would let a booking claim
     * Bwindi's Forest Suite while pointing at a Kidepo stay.
     */
    foreignKey({
      name: "bookings_option_stay_fk",
      columns: [t.accommodationOptionId, t.stayId],
      foreignColumns: [accommodationOptions.id, accommodationOptions.stayId],
    }).onDelete("restrict"),

    /** Serves the availability query; the constraint's GiST index does overlap. */
    index("bookings_option_dates_idx").on(t.accommodationOptionId, t.checkIn, t.checkOut),
    index("bookings_stay_id_idx").on(t.stayId),

    check("bookings_dates_ordered", sql`${t.checkOut} > ${t.checkIn}`),
    // The stored night count cannot drift from the dates it was derived from.
    check("bookings_nights_match_dates", sql`${t.nights} = ${t.checkOut} - ${t.checkIn}`),
    check("bookings_guests_positive", sql`${t.guests} > 0`),
    check("bookings_unit_index_positive", sql`${t.unitIndex} > 0`),
    check(
      "bookings_money_non_negative",
      sql`${t.nightlyRateUgx} >= 0 AND ${t.accommodationSubtotalUgx} >= 0 AND ${t.experiencesSubtotalUgx} >= 0`,
    ),
    // The total is the sum of its parts, or it is not a total.
    check(
      "bookings_total_matches_parts",
      sql`${t.estimatedTotalUgx} = ${t.accommodationSubtotalUgx} + ${t.experiencesSubtotalUgx}`,
    ),
  ],
);

/**
 * Experiences requested alongside a booking.
 *
 * Snapshots the name and price, because an experience is a mutable catalogue
 * record: repricing "Gorilla Trekking" next month must not silently restate
 * what a traveller asked for in this one. Nothing here is scheduled — Release 4
 * records interest, not a confirmed time slot.
 */
export const bookingExperiences = pgTable(
  "booking_experiences",
  {
    id: serial("id").primaryKey(),
    bookingId: integer("booking_id")
      .notNull()
      .references(() => bookings.id, { onDelete: "cascade" }),
    experienceId: integer("experience_id")
      .notNull()
      .references(() => experiences.id, { onDelete: "restrict" }),

    nameSnapshot: varchar("name_snapshot", { length: 160 }).notNull(),
    /** Null where the catalogue itself has no price — "on request", not free. */
    priceUgxSnapshot: integer("price_ugx_snapshot"),
    currency: varchar("currency", { length: 3 }).notNull().default("UGX"),
    guests: smallint("guests").notNull(),
    lineTotalUgx: integer("line_total_ugx").notNull().default(0),
    position: smallint("position").notNull().default(0),
  },
  (t) => [
    // The same experience cannot be added to one booking twice.
    uniqueIndex("booking_experiences_booking_experience_key").on(
      t.bookingId,
      t.experienceId,
    ),
    index("booking_experiences_experience_id_idx").on(t.experienceId),
    check("booking_experiences_guests_positive", sql`${t.guests} > 0`),
    check("booking_experiences_line_total_non_negative", sql`${t.lineTotalUgx} >= 0`),
  ],
);

export const destinationsRelations = relations(destinations, ({ many }) => ({
  stays: many(stays),
  experiences: many(experiences),
}));

export const bookingsRelations = relations(bookings, ({ one, many }) => ({
  stay: one(stays, { fields: [bookings.stayId], references: [stays.id] }),
  option: one(accommodationOptions, {
    fields: [bookings.accommodationOptionId],
    references: [accommodationOptions.id],
  }),
  experiences: many(bookingExperiences),
}));

export const bookingExperiencesRelations = relations(bookingExperiences, ({ one }) => ({
  booking: one(bookings, {
    fields: [bookingExperiences.bookingId],
    references: [bookings.id],
  }),
  experience: one(experiences, {
    fields: [bookingExperiences.experienceId],
    references: [experiences.id],
  }),
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
export type BookingRow = typeof bookings.$inferSelect;
export type BookingExperienceRow = typeof bookingExperiences.$inferSelect;
export type { StayType } from "@/lib/stay-types";
export type { BookingStatus } from "@/lib/booking-status";
