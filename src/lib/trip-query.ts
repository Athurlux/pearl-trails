import "server-only";
import { and, asc, eq, sql } from "drizzle-orm";
import { getDb } from "@/db";
import {
  accommodationOptions,
  bookingExperiences,
  bookings,
  destinations,
  itineraryItems,
  stays,
} from "@/db/schema";
import type { BookingStatus } from "./booking-status";
import type {
  ItinerarySource,
  ItinerarySystemKind,
  TimeOfDay,
} from "./itinerary-vocab";
import { MAX_TRAVELLER_ITEMS } from "./itinerary-vocab";
import {
  compareItineraryItems,
  generateTripToken,
  hashTripToken,
  parseTripToken,
  planInitialItinerary,
} from "./trip-rules";

/**
 * Trip persistence — the authoritative half of the trip domain.
 *
 * Two rules govern everything here:
 *
 *   1. **A token identifies a booking, and nothing else does.** Every read and
 *      every write starts by resolving a token to a booking id. No function
 *      takes a booking id from a caller who did not prove they hold the token,
 *      and every mutation carries the booking id in its own `WHERE` clause, so
 *      posting somebody else's item id changes nothing.
 *
 *   2. **Provenance decides what may be touched.** `source = 'traveller'` is in
 *      the `WHERE` clause of the update and delete statements. A traveller
 *      cannot delete their check-out, and cannot remove a requested experience
 *      from their booking by removing it from the plan.
 *
 * See `docs/decisions/004-trip-access-and-itinerary-ownership.md`.
 */

// ---------------------------------------------------------------------------
// Access
// ---------------------------------------------------------------------------

/**
 * Resolves a raw trip token to a booking id, or null.
 *
 * The token is hashed before it touches the database, so the stored value is
 * never a working credential. A malformed token is rejected before any query —
 * a bad path segment becomes a 404, not a table scan.
 */
async function bookingIdForToken(rawToken: string): Promise<number | null> {
  const token = parseTripToken(rawToken);
  if (!token) return null;

  const db = getDb();
  const [row] = await db
    .select({ id: bookings.id })
    .from(bookings)
    .where(eq(bookings.tripTokenHash, await hashTripToken(token)))
    .limit(1);

  return row?.id ?? null;
}

/**
 * Issues a fresh trip token for a booking whose reference and email both match.
 *
 * This is the "I lost my link" path, and it is the only way to reach a trip
 * without already holding its token. It **rotates**: only a hash is stored, so
 * there is nothing to hand back — a new token is minted and the old link stops
 * working. The form warns before submitting.
 *
 * The answer is identical whether the reference does not exist or the email is
 * wrong, so this cannot be used to discover which references are real or to
 * confirm that a given person booked a given property.
 */
export async function reissueTripToken(
  reference: string,
  email: string,
): Promise<string | null> {
  const db = getDb();
  const normalised = email.trim().toLowerCase();
  if (!normalised) return null;

  const token = generateTripToken();
  const hash = await hashTripToken(token);

  // The match is part of the UPDATE rather than a SELECT followed by an
  // UPDATE: one statement, no window, and nothing readable in between.
  const updated = await db
    .update(bookings)
    .set({ tripTokenHash: hash, updatedAt: new Date() })
    .where(
      and(
        eq(bookings.reference, reference),
        sql`lower(${bookings.guestEmail}) = ${normalised}`,
      ),
    )
    .returning({ id: bookings.id });

  return updated.length > 0 ? token : null;
}

/** The token for a booking, minted at creation. Never read back afterwards. */
export async function mintTripToken(): Promise<{ token: string; hash: string }> {
  const token = generateTripToken();
  return { token, hash: await hashTripToken(token) };
}

/**
 * Whether this token belongs to this booking — used by the confirmation page to
 * decide whether to reveal the direct trip link it was handed in the redirect.
 */
export async function tokenMatchesReference(
  reference: string,
  rawToken: string,
): Promise<boolean> {
  const token = parseTripToken(rawToken);
  if (!token) return false;

  const db = getDb();
  const [row] = await db
    .select({ id: bookings.id })
    .from(bookings)
    .where(
      and(
        eq(bookings.reference, reference),
        eq(bookings.tripTokenHash, await hashTripToken(token)),
      ),
    )
    .limit(1);

  return Boolean(row);
}

// ---------------------------------------------------------------------------
// Reading a trip
// ---------------------------------------------------------------------------

export interface TripItineraryItem {
  id: number;
  source: ItinerarySource;
  systemKind: ItinerarySystemKind | null;
  day: string;
  timeOfDay: TimeOfDay;
  exactTime: string | null;
  title: string;
  note: string | null;
  /** Snapshot from the booking, not the live catalogue. Null where none. */
  experiencePriceUgx: number | null;
  experienceGuests: number | null;
}

export interface TripDetail {
  reference: string;
  status: BookingStatus;
  checkIn: string;
  checkOut: string;
  nights: number;
  guests: number;
  accommodationSubtotalUgx: number;
  experiencesSubtotalUgx: number;
  estimatedTotalUgx: number;
  currency: string;
  guestName: string;
  specialRequests: string | null;
  tripNote: string | null;
  stay: {
    slug: string;
    name: string;
    image: string;
    imageAlt: string;
    checkInTime: string;
    checkOutTime: string;
    stayType: string;
  };
  destination: { name: string; region: string };
  option: { name: string; bedDescription: string };
  itinerary: TripItineraryItem[];
  travellerItemCount: number;
}

/**
 * Loads a trip, generating any missing base items first.
 *
 * Generation runs on every visit rather than once at booking time, which is
 * what makes Release 4's existing bookings work with no backfill migration:
 * the first visit *is* the backfill. It is safe to re-run because the inserts
 * cannot duplicate (see `ensureItinerary`).
 *
 * Deliberately omits the traveller's email and phone. The trip page is a
 * planning surface, and contact details belong on the confirmation page where
 * they are masked.
 */
export async function getTripByToken(rawToken: string): Promise<TripDetail | null> {
  const bookingId = await bookingIdForToken(rawToken);
  if (bookingId === null) return null;

  const db = getDb();
  const [row] = await db
    .select({
      id: bookings.id,
      reference: bookings.reference,
      status: bookings.status,
      checkIn: bookings.checkIn,
      checkOut: bookings.checkOut,
      nights: bookings.nights,
      guests: bookings.guests,
      accommodationSubtotalUgx: bookings.accommodationSubtotalUgx,
      experiencesSubtotalUgx: bookings.experiencesSubtotalUgx,
      estimatedTotalUgx: bookings.estimatedTotalUgx,
      currency: bookings.currency,
      guestName: bookings.guestName,
      specialRequests: bookings.specialRequests,
      tripNote: bookings.tripNote,
      staySlug: stays.slug,
      stayName: stays.name,
      stayImage: stays.image,
      stayImageAlt: stays.imageAlt,
      stayType: stays.stayType,
      checkInTime: stays.checkInTime,
      checkOutTime: stays.checkOutTime,
      destinationName: destinations.name,
      destinationRegion: destinations.region,
      optionName: accommodationOptions.name,
      optionBed: accommodationOptions.bedDescription,
    })
    .from(bookings)
    .innerJoin(stays, eq(stays.id, bookings.stayId))
    .innerJoin(destinations, eq(destinations.id, stays.destinationId))
    .innerJoin(
      accommodationOptions,
      eq(accommodationOptions.id, bookings.accommodationOptionId),
    )
    .where(eq(bookings.id, bookingId))
    .limit(1);

  if (!row) return null;

  await ensureItinerary(row.id, {
    checkIn: row.checkIn,
    checkOut: row.checkOut,
    checkInTime: row.checkInTime,
    checkOutTime: row.checkOutTime,
    stayName: row.stayName,
  });

  const items = await db
    .select({
      id: itineraryItems.id,
      source: itineraryItems.source,
      systemKind: itineraryItems.systemKind,
      day: itineraryItems.day,
      timeOfDay: itineraryItems.timeOfDay,
      exactTime: itineraryItems.exactTime,
      title: itineraryItems.title,
      note: itineraryItems.note,
      experiencePriceUgx: bookingExperiences.priceUgxSnapshot,
      experienceGuests: bookingExperiences.guests,
    })
    .from(itineraryItems)
    .leftJoin(
      bookingExperiences,
      eq(bookingExperiences.id, itineraryItems.bookingExperienceId),
    )
    .where(eq(itineraryItems.bookingId, row.id))
    .orderBy(asc(itineraryItems.day), asc(itineraryItems.id));

  // Sorted here rather than in SQL: time-of-day precedence and the check-in
  // tie-break are product rules, and they are unit-tested as pure functions.
  const itinerary = [...items].sort(compareItineraryItems);

  return {
    reference: row.reference,
    status: row.status,
    checkIn: row.checkIn,
    checkOut: row.checkOut,
    nights: row.nights,
    guests: row.guests,
    accommodationSubtotalUgx: row.accommodationSubtotalUgx,
    experiencesSubtotalUgx: row.experiencesSubtotalUgx,
    estimatedTotalUgx: row.estimatedTotalUgx,
    currency: row.currency,
    guestName: row.guestName,
    specialRequests: row.specialRequests,
    tripNote: row.tripNote,
    stay: {
      slug: row.staySlug,
      name: row.stayName,
      image: row.stayImage,
      imageAlt: row.stayImageAlt,
      checkInTime: row.checkInTime,
      checkOutTime: row.checkOutTime,
      stayType: row.stayType,
    },
    destination: { name: row.destinationName, region: row.destinationRegion },
    option: { name: row.optionName, bedDescription: row.optionBed },
    itinerary,
    travellerItemCount: itinerary.filter((i) => i.source === "traveller").length,
  };
}

// ---------------------------------------------------------------------------
// Generation
// ---------------------------------------------------------------------------

/**
 * Inserts the base itinerary for a booking, if it is not already there.
 *
 * `ON CONFLICT DO NOTHING` against the two partial unique indexes is the whole
 * idempotency mechanism. Reading first and inserting after would be a race that
 * two concurrent page loads lose in exactly the way that produces two check-ins.
 *
 * Experience items are matched to `booking_experiences` rows by position, which
 * is stable: that table has a unique index on (booking, experience) and a
 * `position` column written at booking time.
 */
async function ensureItinerary(
  bookingId: number,
  stay: {
    checkIn: string;
    checkOut: string;
    checkInTime: string;
    checkOutTime: string;
    stayName: string;
  },
): Promise<void> {
  const db = getDb();

  const experienceRows = await db
    .select({ id: bookingExperiences.id, name: bookingExperiences.nameSnapshot })
    .from(bookingExperiences)
    .where(eq(bookingExperiences.bookingId, bookingId))
    .orderBy(asc(bookingExperiences.position), asc(bookingExperiences.id));

  const planned = planInitialItinerary({
    checkIn: stay.checkIn,
    checkOut: stay.checkOut,
    checkInTime: stay.checkInTime,
    checkOutTime: stay.checkOutTime,
    stayName: stay.stayName,
    experiences: experienceRows.map((row) => ({ name: row.name })),
  });

  if (planned.length === 0) return;

  const values = planned.map((item) => ({
    bookingId,
    source: item.source,
    systemKind: item.systemKind,
    bookingExperienceId:
      item.experienceIndex === null
        ? null
        : (experienceRows[item.experienceIndex]?.id ?? null),
    day: item.day,
    timeOfDay: item.timeOfDay,
    exactTime: item.exactTime,
    title: item.title,
    note: item.note,
  }));

  /*
    Two separate statements, because `ON CONFLICT` names one index at a time and
    system rows and experience rows collide on different ones.

    Each carries `where`, and that is not optional decoration: the indexes are
    **partial**, and Postgres refuses to infer a partial index as a conflict
    arbiter unless the statement repeats its predicate exactly. Without it every
    insert fails with 42P10, "no unique or exclusion constraint matching the ON
    CONFLICT specification" — which reads like a missing index rather than an
    unrepeated `WHERE`.
  */
  const systemRows = values.filter((v) => v.source === "system");
  const experienceItems = values.filter((v) => v.source === "experience");

  if (systemRows.length > 0) {
    await db
      .insert(itineraryItems)
      .values(systemRows)
      .onConflictDoNothing({
        target: [itineraryItems.bookingId, itineraryItems.systemKind],
        where: sql`${itineraryItems.systemKind} IS NOT NULL`,
      });
  }

  if (experienceItems.length > 0) {
    await db
      .insert(itineraryItems)
      .values(experienceItems)
      .onConflictDoNothing({
        target: [itineraryItems.bookingId, itineraryItems.bookingExperienceId],
        where: sql`${itineraryItems.bookingExperienceId} IS NOT NULL`,
      });
  }
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

export type TripMutationResult =
  | { status: "ok" }
  | { status: "not-found" }
  | { status: "out-of-range" }
  | { status: "too-many" }
  | { status: "not-yours" };

/**
 * Adds a traveller's own item.
 *
 * The date bound is inside the INSERT: it selects from `bookings` and filters
 * on the booking's own dates, so an item outside the trip inserts zero rows.
 * There is no moment between deciding the date is valid and writing it.
 */
export async function addTravellerItem(
  rawToken: string,
  input: { title: string; day: string; timeOfDay: TimeOfDay; note: string | null },
): Promise<TripMutationResult> {
  const bookingId = await bookingIdForToken(rawToken);
  if (bookingId === null) return { status: "not-found" };

  const db = getDb();

  // A bound on how much free text one trip can hold. Not a security control —
  // the token is — but it stops a single trip growing without limit.
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(itineraryItems)
    .where(
      and(
        eq(itineraryItems.bookingId, bookingId),
        eq(itineraryItems.source, "traveller"),
      ),
    );

  if (count >= MAX_TRAVELLER_ITEMS) return { status: "too-many" };

  const inserted = await db.execute<{ id: number }>(sql`
    INSERT INTO ${itineraryItems}
      (booking_id, source, day, time_of_day, title, note)
    SELECT b.id, 'traveller', ${input.day}::date, ${input.timeOfDay},
           ${input.title}, ${input.note}
    FROM ${bookings} b
    WHERE b.id = ${bookingId}
      AND ${input.day}::date >= b.check_in
      AND ${input.day}::date <= b.check_out
    RETURNING id
  `);

  return inserted.rows.length > 0 ? { status: "ok" } : { status: "out-of-range" };
}

/**
 * Edits a traveller's own item.
 *
 * `source = 'traveller'` and the booking id are both in the `WHERE` clause, so
 * this cannot touch a check-in, an experience, or an item on somebody else's
 * trip — whatever id is posted.
 */
export async function updateTravellerItem(
  rawToken: string,
  itemId: number,
  input: { title: string; day: string; timeOfDay: TimeOfDay; note: string | null },
): Promise<TripMutationResult> {
  const bookingId = await bookingIdForToken(rawToken);
  if (bookingId === null) return { status: "not-found" };

  const db = getDb();
  const updated = await db.execute<{ id: number }>(sql`
    UPDATE ${itineraryItems} i
       SET title = ${input.title},
           day = ${input.day}::date,
           time_of_day = ${input.timeOfDay},
           note = ${input.note},
           updated_at = now()
      FROM ${bookings} b
     WHERE i.id = ${itemId}
       AND i.booking_id = ${bookingId}
       AND i.source = 'traveller'
       AND b.id = i.booking_id
       AND ${input.day}::date >= b.check_in
       AND ${input.day}::date <= b.check_out
    RETURNING i.id
  `);

  if (updated.rows.length > 0) return { status: "ok" };

  // Distinguish "you may not touch that" from "that date is not in your trip",
  // so the interface can say something true rather than a generic failure.
  return (await ownsTravellerItem(bookingId, itemId))
    ? { status: "out-of-range" }
    : { status: "not-yours" };
}

export async function deleteTravellerItem(
  rawToken: string,
  itemId: number,
): Promise<TripMutationResult> {
  const bookingId = await bookingIdForToken(rawToken);
  if (bookingId === null) return { status: "not-found" };

  const db = getDb();
  const deleted = await db
    .delete(itineraryItems)
    .where(
      and(
        eq(itineraryItems.id, itemId),
        eq(itineraryItems.bookingId, bookingId),
        // The load-bearing clause. Without it, posting the id of a check-out
        // would delete it.
        eq(itineraryItems.source, "traveller"),
      ),
    )
    .returning({ id: itineraryItems.id });

  return deleted.length > 0 ? { status: "ok" } : { status: "not-yours" };
}

/**
 * Moves a requested experience within the plan.
 *
 * Experiences may be rescheduled but never deleted: removing one from the plan
 * is not the same act as removing it from the booking, and Release 5 has no
 * booking-management flow to do the second. System items are excluded entirely
 * — check-in happens when the property says it does.
 */
export async function rescheduleExperienceItem(
  rawToken: string,
  itemId: number,
  input: { day: string; timeOfDay: TimeOfDay },
): Promise<TripMutationResult> {
  const bookingId = await bookingIdForToken(rawToken);
  if (bookingId === null) return { status: "not-found" };

  const db = getDb();
  const updated = await db.execute<{ id: number }>(sql`
    UPDATE ${itineraryItems} i
       SET day = ${input.day}::date,
           time_of_day = ${input.timeOfDay},
           updated_at = now()
      FROM ${bookings} b
     WHERE i.id = ${itemId}
       AND i.booking_id = ${bookingId}
       AND i.source = 'experience'
       AND b.id = i.booking_id
       AND ${input.day}::date >= b.check_in
       AND ${input.day}::date <= b.check_out
    RETURNING i.id
  `);

  if (updated.rows.length > 0) return { status: "ok" };

  const [row] = await db
    .select({ id: itineraryItems.id })
    .from(itineraryItems)
    .where(
      and(
        eq(itineraryItems.id, itemId),
        eq(itineraryItems.bookingId, bookingId),
        eq(itineraryItems.source, "experience"),
      ),
    )
    .limit(1);

  return row ? { status: "out-of-range" } : { status: "not-yours" };
}

export async function saveTripNote(
  rawToken: string,
  note: string | null,
): Promise<TripMutationResult> {
  const bookingId = await bookingIdForToken(rawToken);
  if (bookingId === null) return { status: "not-found" };

  const db = getDb();
  await db
    .update(bookings)
    .set({ tripNote: note, updatedAt: new Date() })
    .where(eq(bookings.id, bookingId));

  return { status: "ok" };
}

async function ownsTravellerItem(bookingId: number, itemId: number): Promise<boolean> {
  const db = getDb();
  const [row] = await db
    .select({ id: itineraryItems.id })
    .from(itineraryItems)
    .where(
      and(
        eq(itineraryItems.id, itemId),
        eq(itineraryItems.bookingId, bookingId),
        eq(itineraryItems.source, "traveller"),
      ),
    )
    .limit(1);
  return Boolean(row);
}
