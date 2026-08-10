import "server-only";
import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { getDb } from "@/db";
import {
  accommodationOptions,
  bookingExperiences,
  bookings,
  destinations,
  experiences,
  stayExperiences,
  stays,
} from "@/db/schema";
import {
  BLOCKING_BOOKING_STATUSES,
  type BookingStatus,
} from "./booking-status";
import {
  type FieldErrors,
  MAX_BOOKING_EXPERIENCES,
  type TravellerInput,
  calculateBookingEstimate,
  generateBookingReference,
  nightsBetween,
  parseIsoDate,
  todayInUganda,
  validateTraveller,
  validateTrip,
} from "./booking-rules";

/**
 * Booking persistence — the authoritative half of the booking domain.
 *
 * Everything here re-derives from the database. Nothing the browser sends is
 * believed: not the price, not the total, not the night count, not the guest
 * capacity, not which stay an accommodation belongs to. The client sends
 * *slugs and intentions*; this module resolves them against Postgres and
 * recomputes every number.
 *
 * See docs/decisions/001 for why creation is a single statement rather than a
 * transaction, and 003 for the reference and idempotency scheme.
 */

/** Parameterised status list, kept in step with the exclusion constraint. */
const BLOCKING_STATUSES = sql.join(
  BLOCKING_BOOKING_STATUSES.map((status) => sql`${status}`),
  sql`, `,
);

/** Postgres SQLSTATEs this module knows how to recover from. */
const UNIQUE_VIOLATION = "23505";
const EXCLUSION_VIOLATION = "23P01";

/**
 * Drizzle wraps driver failures in a `DrizzleQueryError` whose own `code` is
 * undefined — the real `NeonDbError`, with the SQLSTATE and constraint name,
 * hangs off `cause`. Reading only the outer error would silently stop
 * recognising duplicate tokens and lost races, turning an idempotent replay
 * into a hard failure and a survivable conflict into a 500.
 *
 * So walk the chain. Bounded, because a cycle here would hang a request.
 */
function errorChain(error: unknown): Record<string, unknown>[] {
  const chain: Record<string, unknown>[] = [];
  let current: unknown = error;
  while (typeof current === "object" && current !== null && chain.length < 5) {
    const node = current as Record<string, unknown>;
    chain.push(node);
    current = node.cause;
  }
  return chain;
}

/**
 * True when this failure is Postgres rejecting `constraintName` with SQLSTATE
 * `code`. Prefers the structured `constraint` field and falls back to the
 * message, since not every layer preserves the former.
 */
function violates(error: unknown, code: string, constraintName: string): boolean {
  for (const node of errorChain(error)) {
    if (node.code !== code) continue;
    if (typeof node.constraint === "string") {
      if (node.constraint === constraintName) return true;
      continue;
    }
    if (typeof node.message === "string" && node.message.includes(constraintName)) {
      return true;
    }
  }
  // Some layers drop the SQLSTATE but keep the constraint name in the text.
  return errorChain(error).some(
    (node) =>
      typeof node.message === "string" && node.message.includes(constraintName),
  );
}

// ---------------------------------------------------------------------------
// Availability
// ---------------------------------------------------------------------------

/**
 * Free units per accommodation option of one stay, for one date range.
 *
 * `inventory_count` minus the blocking bookings that overlap. One grouped
 * query for the whole property — never one query per option.
 *
 * This is **advisory**. It is what the interface shows; it is not what decides
 * whether a booking succeeds. Between reading this and submitting, someone else
 * may take the last unit — which is why the authority is the exclusion
 * constraint inside `createBookingRequest`, not this number.
 */
export async function getOptionAvailability(
  stayId: number,
  checkIn: string | null,
  checkOut: string | null,
): Promise<Map<number, number>> {
  const from = parseIsoDate(checkIn);
  const to = parseIsoDate(checkOut);
  const db = getDb();

  // Without a valid range there is nothing to overlap, so report full inventory
  // rather than guessing. The UI treats this as "dates not chosen yet".
  if (!from || !to || to <= from) {
    const rows = await db
      .select({ id: accommodationOptions.id, inventory: accommodationOptions.inventoryCount })
      .from(accommodationOptions)
      .where(eq(accommodationOptions.stayId, stayId));
    return new Map(rows.map((r) => [r.id, r.inventory]));
  }

  const rows = await db.execute<{ id: number; available: number }>(sql`
    SELECT o.id::int AS id,
           GREATEST(o.inventory_count - COUNT(b.id), 0)::int AS available
    FROM ${accommodationOptions} o
    LEFT JOIN ${bookings} b
      ON b.accommodation_option_id = o.id
     AND b.status IN (${BLOCKING_STATUSES})
     AND daterange(b.check_in, b.check_out, '[)')
      && daterange(${from}::date, ${to}::date, '[)')
    WHERE o.stay_id = ${stayId}
    GROUP BY o.id, o.inventory_count
  `);

  return new Map(rows.rows.map((r) => [Number(r.id), Number(r.available)]));
}

// ---------------------------------------------------------------------------
// Creation
// ---------------------------------------------------------------------------

export interface CreateBookingInput {
  staySlug: string;
  optionSlug: string;
  checkIn: string | null;
  checkOut: string | null;
  guests: number | null;
  /** Experience slugs. Resolved against the ones actually linked to this stay. */
  experienceSlugs: string[];
  traveller: TravellerInput;
  /** Client-minted idempotency key. A replay returns the original booking. */
  requestToken: string;
}

export type CreateBookingResult =
  | { status: "created"; reference: string }
  /** An idempotent replay — the booking already existed under this token. */
  | { status: "duplicate"; reference: string }
  | { status: "invalid"; errors: FieldErrors; formError?: string }
  | { status: "unavailable"; formError: string }
  | { status: "error"; formError: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Creates a reservation request.
 *
 * Order matters and is deliberate: resolve authoritative records first, then
 * validate against *those*, then recompute money, and only then write. A
 * client that posts a tampered price, a foreign accommodation id, an
 * experience belonging to another property, or a guest count above capacity
 * fails before any row is touched.
 */
export async function createBookingRequest(
  input: CreateBookingInput,
  now: Date = new Date(),
): Promise<CreateBookingResult> {
  const db = getDb();

  if (!UUID.test(input.requestToken)) {
    return { status: "error", formError: "That submission could not be verified. Please try again." };
  }

  /*
    Idempotency is checked *before* availability, and that order is load-bearing.

    A replayed submission for a booking that took the last unit would otherwise
    find nothing free and be told "no longer available" — telling the one person
    who definitely holds the unit that they do not. The unique index on
    `request_token` still backs this up for the genuine race where neither
    request has committed yet; this is the fast path that covers the common
    case, a refresh or a retried POST.
  */
  const replayed = await findReferenceByToken(input.requestToken);
  if (replayed) return { status: "duplicate", reference: replayed };

  // --- authoritative stay + accommodation -----------------------------------
  // One query, joined: this is also what proves the accommodation belongs to
  // the stay. An option slug from another property simply returns no row.
  const [option] = await db
    .select({
      stayId: stays.id,
      stayName: stays.name,
      optionId: accommodationOptions.id,
      optionName: accommodationOptions.name,
      guestCapacity: accommodationOptions.guestCapacity,
      inventoryCount: accommodationOptions.inventoryCount,
      priceFromUgx: accommodationOptions.priceFromUgx,
      currency: accommodationOptions.currency,
    })
    .from(accommodationOptions)
    .innerJoin(stays, eq(stays.id, accommodationOptions.stayId))
    .where(
      and(
        eq(stays.slug, input.staySlug),
        eq(accommodationOptions.slug, input.optionSlug),
      ),
    )
    .limit(1);

  if (!option) {
    return {
      status: "invalid",
      errors: { option: "Choose an accommodation for this property." },
      formError: "That accommodation is not available at this property.",
    };
  }

  // --- validate against authoritative capacity and today's date ------------
  const tripErrors = validateTrip(
    { checkIn: input.checkIn, checkOut: input.checkOut, guests: input.guests },
    { capacity: option.guestCapacity, today: todayInUganda(now) },
  );
  const { errors: travellerErrors, values: traveller } = validateTraveller(input.traveller);
  const errors = { ...tripErrors, ...travellerErrors };

  if (input.experienceSlugs.length > MAX_BOOKING_EXPERIENCES) {
    errors.experiences = "Too many experiences selected.";
  }

  if (Object.keys(errors).length > 0 || !traveller) {
    return { status: "invalid", errors };
  }

  const checkIn = parseIsoDate(input.checkIn)!;
  const checkOut = parseIsoDate(input.checkOut)!;
  const guests = input.guests!;
  const nights = nightsBetween(checkIn, checkOut);

  // --- authoritative experiences -------------------------------------------
  // Scoped to this stay: a slug for an experience the property does not offer
  // is dropped, not priced. Prices come from the catalogue, never the form.
  const requestedSlugs = [...new Set(input.experienceSlugs)];
  const experienceRows = requestedSlugs.length
    ? await db
        .select({
          id: experiences.id,
          slug: experiences.slug,
          name: experiences.name,
          priceFromUgx: experiences.priceFromUgx,
        })
        .from(stayExperiences)
        .innerJoin(experiences, eq(experiences.id, stayExperiences.experienceId))
        .where(
          and(
            eq(stayExperiences.stayId, option.stayId),
            inArray(experiences.slug, requestedSlugs),
          ),
        )
        .orderBy(asc(stayExperiences.position))
    : [];

  // --- authoritative money --------------------------------------------------
  // Whatever total the browser displayed is irrelevant. This is the number.
  const estimate = calculateBookingEstimate({
    nightlyRateUgx: option.priceFromUgx,
    checkIn,
    checkOut,
    experiences: experienceRows.map((e) => ({ priceFromUgx: e.priceFromUgx, guests })),
  });

  const experiencePayload = experienceRows.map((experience, index) => ({
    experience_id: experience.id,
    name_snapshot: experience.name,
    price_ugx_snapshot: experience.priceFromUgx,
    guests,
    line_total_ugx:
      experience.priceFromUgx === null ? 0 : experience.priceFromUgx * guests,
    position: index,
  }));

  // --- write ----------------------------------------------------------------
  // Bounded: in the worst case every unit but one loses a race, so allow one
  // attempt per unit plus headroom for a reference collision. Capped so a
  // 16-pitch campsite cannot spin. Exhaustion reports a conflict, never loops.
  const maxAttempts = Math.min(option.inventoryCount, 12) + 2;
  let reference = generateBookingReference(now);

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      const inserted = await db.execute<{ reference: string }>(sql`
        WITH free AS (
          SELECT g AS unit_index
          FROM generate_series(
            1,
            (SELECT inventory_count FROM ${accommodationOptions} WHERE id = ${option.optionId})
          ) AS g
          WHERE NOT EXISTS (
            SELECT 1 FROM ${bookings} b
            WHERE b.accommodation_option_id = ${option.optionId}
              AND b.status IN (${BLOCKING_STATUSES})
              AND b.unit_index = g
              AND daterange(b.check_in, b.check_out, '[)')
               && daterange(${checkIn}::date, ${checkOut}::date, '[)')
          )
          ORDER BY g
          LIMIT 1
        ),
        new_booking AS (
          INSERT INTO ${bookings} (
            reference, request_token, stay_id, accommodation_option_id, unit_index,
            check_in, check_out, nights, guests,
            nightly_rate_ugx, accommodation_subtotal_ugx,
            experiences_subtotal_ugx, estimated_total_ugx,
            currency, status,
            guest_name, guest_email, guest_phone, guest_country, special_requests
          )
          SELECT
            ${reference}, ${input.requestToken}::uuid, ${option.stayId},
            ${option.optionId}, free.unit_index,
            ${checkIn}::date, ${checkOut}::date, ${nights}, ${guests},
            ${estimate.nightlyRateUgx}, ${estimate.accommodationSubtotalUgx},
            ${estimate.experiencesSubtotalUgx}, ${estimate.estimatedTotalUgx},
            ${option.currency}, 'pending',
            ${traveller.guestName}, ${traveller.guestEmail}, ${traveller.guestPhone},
            ${traveller.guestCountry}, ${traveller.specialRequests}
          FROM free
          RETURNING id, reference
        ),
        new_experiences AS (
          INSERT INTO ${bookingExperiences} (
            booking_id, experience_id, name_snapshot, price_ugx_snapshot,
            currency, guests, line_total_ugx, position
          )
          SELECT nb.id, x.experience_id, x.name_snapshot, x.price_ugx_snapshot,
                 ${option.currency}, x.guests, x.line_total_ugx, x.position
          FROM new_booking nb
          CROSS JOIN jsonb_to_recordset(${JSON.stringify(experiencePayload)}::jsonb)
            AS x(experience_id int, name_snapshot text, price_ugx_snapshot int,
                 guests int, line_total_ugx int, position int)
          RETURNING 1
        )
        SELECT reference FROM new_booking
      `);

      const row = inserted.rows[0];
      if (!row) {
        // `free` was empty: every unit is held for these dates. Before calling
        // that unavailable, check whether the booking holding one is *ours* —
        // a concurrent replay that committed between the pre-check and here.
        // Reporting "unavailable" to the traveller who owns the unit would be
        // the worst possible answer.
        const concurrent = await findReferenceByToken(input.requestToken);
        if (concurrent) return { status: "duplicate", reference: concurrent };

        return {
          status: "unavailable",
          formError: "This accommodation is no longer available for the dates you chose.",
        };
      }
      return { status: "created", reference: row.reference };
    } catch (error) {
      // Idempotent replay: this token already produced a booking. Hand back the
      // original rather than creating a second one or showing a failure.
      if (violates(error, UNIQUE_VIOLATION, "bookings_request_token_key")) {
        const existing = await findReferenceByToken(input.requestToken);
        if (existing) return { status: "duplicate", reference: existing };
        return {
          status: "error",
          formError: "We could not confirm that request. Please try again.",
        };
      }

      // Reference collision — astronomically unlikely, cheap to survive.
      if (violates(error, UNIQUE_VIOLATION, "bookings_reference_key")) {
        reference = generateBookingReference(now);
        continue;
      }

      // Lost a race for a unit: another request committed the same unit_index
      // between our snapshot and our insert. The constraint caught it — that is
      // the invariant working. Retry; the next attempt sees the committed row.
      if (violates(error, EXCLUSION_VIOLATION, "bookings_no_overlapping_unit")) {
        continue;
      }

      throw error;
    }
  }

  // Every attempt lost a race. Truthful answer: it is gone.
  return {
    status: "unavailable",
    formError: "This accommodation was taken for those dates while you were booking.",
  };
}

async function findReferenceByToken(token: string): Promise<string | null> {
  const db = getDb();
  const [row] = await db
    .select({ reference: bookings.reference })
    .from(bookings)
    .where(eq(bookings.requestToken, token))
    .limit(1);
  return row?.reference ?? null;
}

// ---------------------------------------------------------------------------
// Lookup
// ---------------------------------------------------------------------------

export interface BookingDetail {
  reference: string;
  status: BookingStatus;
  checkIn: string;
  checkOut: string;
  nights: number;
  guests: number;
  nightlyRateUgx: number;
  accommodationSubtotalUgx: number;
  experiencesSubtotalUgx: number;
  estimatedTotalUgx: number;
  currency: string;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  guestCountry: string;
  specialRequests: string | null;
  createdAt: Date;
  stay: { slug: string; name: string; image: string; imageAlt: string };
  destination: { name: string; region: string };
  option: { name: string; bedDescription: string };
  experiences: { name: string; priceUgx: number | null; guests: number; lineTotalUgx: number }[];
}

/**
 * The confirmation page's only query.
 *
 * Selects fields explicitly and deliberately omits every internal identifier —
 * no `bookings.id`, no `stay_id`, no `accommodation_option_id`, no
 * `unit_index`. The reference is a capability anyone holding the URL can use
 * (docs/decisions/003), so this returns the least that still makes the page
 * useful.
 */
export async function getBookingByReference(
  reference: string,
): Promise<BookingDetail | null> {
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
      nightlyRateUgx: bookings.nightlyRateUgx,
      accommodationSubtotalUgx: bookings.accommodationSubtotalUgx,
      experiencesSubtotalUgx: bookings.experiencesSubtotalUgx,
      estimatedTotalUgx: bookings.estimatedTotalUgx,
      currency: bookings.currency,
      guestName: bookings.guestName,
      guestEmail: bookings.guestEmail,
      guestPhone: bookings.guestPhone,
      guestCountry: bookings.guestCountry,
      specialRequests: bookings.specialRequests,
      createdAt: bookings.createdAt,
      staySlug: stays.slug,
      stayName: stays.name,
      stayImage: stays.image,
      stayImageAlt: stays.imageAlt,
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
    .where(eq(bookings.reference, reference))
    .limit(1);

  if (!row) return null;

  const experienceRows = await db
    .select({
      name: bookingExperiences.nameSnapshot,
      priceUgx: bookingExperiences.priceUgxSnapshot,
      guests: bookingExperiences.guests,
      lineTotalUgx: bookingExperiences.lineTotalUgx,
    })
    .from(bookingExperiences)
    .where(eq(bookingExperiences.bookingId, row.id))
    .orderBy(asc(bookingExperiences.position));

  return {
    reference: row.reference,
    status: row.status,
    checkIn: row.checkIn,
    checkOut: row.checkOut,
    nights: row.nights,
    guests: row.guests,
    nightlyRateUgx: row.nightlyRateUgx,
    accommodationSubtotalUgx: row.accommodationSubtotalUgx,
    experiencesSubtotalUgx: row.experiencesSubtotalUgx,
    estimatedTotalUgx: row.estimatedTotalUgx,
    currency: row.currency,
    guestName: row.guestName,
    guestEmail: row.guestEmail,
    guestPhone: row.guestPhone,
    guestCountry: row.guestCountry,
    specialRequests: row.specialRequests,
    createdAt: row.createdAt,
    stay: {
      slug: row.staySlug,
      name: row.stayName,
      image: row.stayImage,
      imageAlt: row.stayImageAlt,
    },
    destination: { name: row.destinationName, region: row.destinationRegion },
    option: { name: row.optionName, bedDescription: row.optionBed },
    experiences: experienceRows,
  };
}
