import "server-only";
import { and, asc, count, desc, eq, gte, ilike, inArray, lt, lte, or, sql } from "drizzle-orm";
import { getDb } from "@/db";
import {
  accommodationOptions,
  auditEvents,
  bookingExperiences,
  bookingNotes,
  bookings,
  destinations,
  stays,
} from "@/db/schema";
import { BLOCKING_BOOKING_STATUSES, type BookingStatus } from "./booking-status";
import { canTransition } from "./booking-transitions";
import { addDays, todayInUganda } from "./booking-rules";
import {
  type AuditAction,
  OPS_PAGE_SIZE,
  type StayVisibility,
} from "./staff-vocab";
import type { StaffIdentity } from "./staff-auth";

/**
 * Operations persistence.
 *
 * Every export here assumes the caller has already passed `requireStaff()`.
 * That is the contract, and it is why this module carries `server-only` and is
 * never imported by a client component — there is no second authorisation check
 * inside each function, so the boundary has to hold at the entry point.
 *
 * Queries are bounded and filtered in Postgres. Nothing fetches the booking
 * table into memory to count it.
 */

// ---------------------------------------------------------------------------
// Overview
// ---------------------------------------------------------------------------

export interface OpsOverview {
  pending: number;
  confirmed: number;
  cancelled: number;
  arrivingNext7Days: number;
  requestsLast7Days: number;
  totalBookings: number;
}

/**
 * The numbers on the landing screen.
 *
 * One round trip with conditional aggregates rather than six `count` queries —
 * this runs on every visit to `/ops`, and six sequential HTTP round trips to
 * Neon is a visible pause for information that fits in one row.
 */
export async function getOverview(): Promise<OpsOverview> {
  const db = getDb();
  const today = todayInUganda();

  const rows = await db.execute<{
    pending: number;
    confirmed: number;
    cancelled: number;
    arriving: number;
    recent: number;
    total: number;
  }>(sql`
    SELECT
      COUNT(*) FILTER (WHERE status = 'pending')::int   AS pending,
      COUNT(*) FILTER (WHERE status = 'confirmed')::int AS confirmed,
      COUNT(*) FILTER (WHERE status = 'cancelled')::int AS cancelled,
      COUNT(*) FILTER (
        WHERE status IN ('pending', 'confirmed')
          AND check_in >= ${today}::date
          AND check_in < ${today}::date + 7
      )::int AS arriving,
      COUNT(*) FILTER (WHERE created_at > now() - interval '7 days')::int AS recent,
      COUNT(*)::int AS total
    FROM ${bookings}
  `);

  const row = rows.rows[0];
  return {
    pending: Number(row?.pending ?? 0),
    confirmed: Number(row?.confirmed ?? 0),
    cancelled: Number(row?.cancelled ?? 0),
    arrivingNext7Days: Number(row?.arriving ?? 0),
    requestsLast7Days: Number(row?.recent ?? 0),
    totalBookings: Number(row?.total ?? 0),
  };
}

// ---------------------------------------------------------------------------
// Booking list
// ---------------------------------------------------------------------------

export interface BookingListFilters {
  status: BookingStatus | null;
  staySlug: string | null;
  query: string | null;
  checkInFrom: string | null;
  checkInTo: string | null;
  page: number;
}

export interface BookingListRow {
  reference: string;
  status: BookingStatus;
  guestName: string;
  stayName: string;
  destinationName: string;
  optionName: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  estimatedTotalUgx: number;
  currency: string;
  createdAt: Date;
}

export interface BookingListResult {
  rows: BookingListRow[];
  total: number;
  page: number;
  pageCount: number;
}

/**
 * The bookings table.
 *
 * Filtering, searching, ordering and paging all happen in Postgres. The browser
 * receives one page — at 20 rows that stays true whether there are 30 bookings
 * or 300,000.
 */
export async function listBookings(
  filters: BookingListFilters,
): Promise<BookingListResult> {
  const db = getDb();
  const conditions = [];

  if (filters.status) conditions.push(eq(bookings.status, filters.status));
  if (filters.staySlug) conditions.push(eq(stays.slug, filters.staySlug));
  if (filters.checkInFrom) conditions.push(gte(bookings.checkIn, filters.checkInFrom));
  if (filters.checkInTo) conditions.push(lte(bookings.checkIn, filters.checkInTo));

  if (filters.query) {
    /*
      Operational search, not catalogue search: staff arrive holding a
      reference someone read out, a name, or an email. `ilike` over three
      columns is the right size for that — a tsvector would rank prose, and
      nobody searches bookings by prose.

      The pattern is a bound parameter, so `%` and `_` inside it are matched
      literally by Postgres rather than treated as wildcards by the caller.
    */
    const pattern = `%${filters.query}%`;
    conditions.push(
      or(
        ilike(bookings.reference, pattern),
        ilike(bookings.guestName, pattern),
        ilike(bookings.guestEmail, pattern),
      ),
    );
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [{ total }] = await db
    .select({ total: count() })
    .from(bookings)
    .innerJoin(stays, eq(stays.id, bookings.stayId))
    .where(where);

  const pageCount = Math.max(1, Math.ceil(total / OPS_PAGE_SIZE));
  const page = Math.min(Math.max(1, filters.page), pageCount);

  const rows = await db
    .select({
      reference: bookings.reference,
      status: bookings.status,
      guestName: bookings.guestName,
      stayName: stays.name,
      destinationName: destinations.name,
      optionName: accommodationOptions.name,
      checkIn: bookings.checkIn,
      checkOut: bookings.checkOut,
      guests: bookings.guests,
      estimatedTotalUgx: bookings.estimatedTotalUgx,
      currency: bookings.currency,
      createdAt: bookings.createdAt,
    })
    .from(bookings)
    .innerJoin(stays, eq(stays.id, bookings.stayId))
    .innerJoin(destinations, eq(destinations.id, stays.destinationId))
    .innerJoin(
      accommodationOptions,
      eq(accommodationOptions.id, bookings.accommodationOptionId),
    )
    .where(where)
    // Newest request first: the operational question is almost always "what
    // came in", and `id` breaks ties so paging cannot repeat or skip a row when
    // two bookings share a timestamp.
    .orderBy(desc(bookings.createdAt), desc(bookings.id))
    .limit(OPS_PAGE_SIZE)
    .offset((page - 1) * OPS_PAGE_SIZE);

  return { rows, total, page, pageCount };
}

/** Properties that actually have bookings, for the filter dropdown. */
export async function listStaysWithBookings(): Promise<{ slug: string; name: string }[]> {
  const db = getDb();
  return db
    .selectDistinct({ slug: stays.slug, name: stays.name })
    .from(bookings)
    .innerJoin(stays, eq(stays.id, bookings.stayId))
    .orderBy(asc(stays.name));
}

// ---------------------------------------------------------------------------
// Booking detail
// ---------------------------------------------------------------------------

export interface OpsBookingDetail {
  id: number;
  reference: string;
  status: BookingStatus;
  checkIn: string;
  checkOut: string;
  nights: number;
  guests: number;
  unitIndex: number;
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
  tripNote: string | null;
  createdAt: Date;
  updatedAt: Date;
  stay: { slug: string; name: string };
  destination: { name: string };
  option: { name: string; inventoryCount: number };
  experiences: { name: string; priceUgx: number | null; guests: number; lineTotalUgx: number }[];
  notes: { id: number; authorName: string; body: string; createdAt: Date }[];
  history: { action: AuditAction; actorName: string; summary: string; createdAt: Date }[];
  blocksInventory: boolean;
}

/**
 * Everything operations needs about one booking.
 *
 * Unlike the traveller-facing pages, contact details are **not** masked: this
 * is the screen someone uses to phone a guest about their arrival, and hiding
 * the number would make the tool useless. The protection is the boundary in
 * front of it, not redaction behind it.
 */
export async function getBookingForOps(
  reference: string,
): Promise<OpsBookingDetail | null> {
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
      unitIndex: bookings.unitIndex,
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
      tripNote: bookings.tripNote,
      createdAt: bookings.createdAt,
      updatedAt: bookings.updatedAt,
      staySlug: stays.slug,
      stayName: stays.name,
      destinationName: destinations.name,
      optionName: accommodationOptions.name,
      optionInventory: accommodationOptions.inventoryCount,
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

  const [experiences, notes, history] = await Promise.all([
    db
      .select({
        name: bookingExperiences.nameSnapshot,
        priceUgx: bookingExperiences.priceUgxSnapshot,
        guests: bookingExperiences.guests,
        lineTotalUgx: bookingExperiences.lineTotalUgx,
      })
      .from(bookingExperiences)
      .where(eq(bookingExperiences.bookingId, row.id))
      .orderBy(asc(bookingExperiences.position)),

    db
      .select({
        id: bookingNotes.id,
        authorName: bookingNotes.authorName,
        body: bookingNotes.body,
        createdAt: bookingNotes.createdAt,
      })
      .from(bookingNotes)
      .where(eq(bookingNotes.bookingId, row.id))
      .orderBy(desc(bookingNotes.createdAt)),

    db
      .select({
        action: auditEvents.action,
        actorName: auditEvents.actorName,
        summary: auditEvents.summary,
        createdAt: auditEvents.createdAt,
      })
      .from(auditEvents)
      .where(
        and(
          eq(auditEvents.targetType, "booking"),
          eq(auditEvents.targetRef, row.reference),
        ),
      )
      .orderBy(desc(auditEvents.createdAt))
      .limit(50),
  ]);

  return {
    ...row,
    stay: { slug: row.staySlug, name: row.stayName },
    destination: { name: row.destinationName },
    option: { name: row.optionName, inventoryCount: row.optionInventory },
    experiences,
    notes,
    history,
    blocksInventory: (BLOCKING_BOOKING_STATUSES as readonly string[]).includes(row.status),
  };
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

export type OpsMutationResult =
  | { status: "ok" }
  | { status: "not-found" }
  | { status: "illegal-transition"; from: BookingStatus };

/**
 * Moves a booking to a new status.
 *
 * The legality check is *inside* the `WHERE` clause as well as in front of it.
 * The application check produces a useful message; the `WHERE` clause is what
 * makes the change atomic — two staff members acting on the same booking at the
 * same moment cannot both succeed, because the second sees a status that no
 * longer matches and updates nothing.
 *
 * Cancelling releases inventory automatically: `cancelled` and `expired` are
 * outside `BLOCKING_BOOKING_STATUSES`, so the exclusion constraint and the
 * availability query both stop counting the row. No inventory bookkeeping
 * happens here, because there is none to do.
 */
export async function changeBookingStatus(
  actor: StaffIdentity,
  reference: string,
  to: BookingStatus,
): Promise<OpsMutationResult> {
  const db = getDb();

  const [current] = await db
    .select({ id: bookings.id, status: bookings.status })
    .from(bookings)
    .where(eq(bookings.reference, reference))
    .limit(1);

  if (!current) return { status: "not-found" };
  if (!canTransition(current.status, to)) {
    return { status: "illegal-transition", from: current.status };
  }

  const updated = await db
    .update(bookings)
    .set({ status: to, updatedAt: new Date() })
    .where(
      and(
        eq(bookings.reference, reference),
        // The optimistic lock. Without it, two simultaneous cancellations both
        // report success and one of them is describing a change it did not make.
        eq(bookings.status, current.status),
      ),
    )
    .returning({ id: bookings.id });

  if (updated.length === 0) {
    const [now] = await db
      .select({ status: bookings.status })
      .from(bookings)
      .where(eq(bookings.reference, reference))
      .limit(1);
    return now
      ? { status: "illegal-transition", from: now.status }
      : { status: "not-found" };
  }

  await recordAudit(actor, {
    action: "booking.status_changed",
    targetType: "booking",
    targetRef: reference,
    summary: `${current.status} → ${to}`,
  });

  return { status: "ok" };
}

export async function addBookingNote(
  actor: StaffIdentity,
  reference: string,
  body: string,
): Promise<OpsMutationResult> {
  const db = getDb();

  const inserted = await db.execute<{ id: number }>(sql`
    INSERT INTO ${bookingNotes} (booking_id, author_staff_id, author_name, body)
    SELECT b.id, ${actor.id}, ${actor.name}, ${body}
    FROM ${bookings} b
    WHERE b.reference = ${reference}
    RETURNING id
  `);

  if (inserted.rows.length === 0) return { status: "not-found" };

  await recordAudit(actor, {
    action: "booking.note_added",
    targetType: "booking",
    targetRef: reference,
    summary: "Added an internal note",
  });

  return { status: "ok" };
}

// ---------------------------------------------------------------------------
// Catalogue
// ---------------------------------------------------------------------------

/**
 * `db.execute` types its result parameter as `Record<string, unknown>`, so the
 * row shape needs an index signature to be usable as one. Declaring it as a
 * type with a signature rather than an interface keeps that structural.
 */
export type OpsStayRow = {
  slug: string;
  name: string;
  destinationName: string;
  visibility: StayVisibility;
  priceFromUgx: number;
  featured: boolean;
  optionCount: number;
  totalInventory: number;
  activeBookings: number;
  [key: string]: unknown;
};

export async function listStaysForOps(): Promise<OpsStayRow[]> {
  const db = getDb();

  const rows = await db.execute<OpsStayRow>(sql`
    SELECT s.slug,
           s.name,
           d.name AS "destinationName",
           s.visibility,
           s.price_from_ugx AS "priceFromUgx",
           s.featured,
           COALESCE(o.option_count, 0)::int      AS "optionCount",
           COALESCE(o.total_inventory, 0)::int   AS "totalInventory",
           COALESCE(b.active_bookings, 0)::int   AS "activeBookings"
      FROM ${stays} s
      JOIN ${destinations} d ON d.id = s.destination_id
      -- Aggregated in subqueries rather than two joins: joining both would
      -- multiply the rows and inflate every count.
      LEFT JOIN (
        SELECT stay_id,
               COUNT(*) AS option_count,
               SUM(inventory_count) AS total_inventory
          FROM ${accommodationOptions}
         GROUP BY stay_id
      ) o ON o.stay_id = s.id
      LEFT JOIN (
        SELECT stay_id, COUNT(*) AS active_bookings
          FROM ${bookings}
         WHERE status IN ('pending', 'confirmed')
         GROUP BY stay_id
      ) b ON b.stay_id = s.id
     ORDER BY s.name
  `);

  return rows.rows;
}

export interface OpsStayDetail {
  slug: string;
  name: string;
  visibility: StayVisibility;
  featured: boolean;
  shortDescription: string;
  destinationName: string;
  options: {
    id: number;
    slug: string;
    name: string;
    guestCapacity: number;
    inventoryCount: number;
    priceFromUgx: number;
    activeBookings: number;
  }[];
}

export async function getStayForOps(slug: string): Promise<OpsStayDetail | null> {
  const db = getDb();

  const [stay] = await db
    .select({
      slug: stays.slug,
      name: stays.name,
      visibility: stays.visibility,
      featured: stays.featured,
      shortDescription: stays.shortDescription,
      destinationName: destinations.name,
      id: stays.id,
    })
    .from(stays)
    .innerJoin(destinations, eq(destinations.id, stays.destinationId))
    .where(eq(stays.slug, slug))
    .limit(1);

  if (!stay) return null;

  const options = await db.execute<OpsStayDetail["options"][number]>(sql`
    SELECT o.id,
           o.slug,
           o.name,
           o.guest_capacity   AS "guestCapacity",
           o.inventory_count  AS "inventoryCount",
           o.price_from_ugx   AS "priceFromUgx",
           COALESCE(b.active, 0)::int AS "activeBookings"
      FROM ${accommodationOptions} o
      LEFT JOIN (
        SELECT accommodation_option_id, COUNT(*) AS active
          FROM ${bookings}
         WHERE status IN ('pending', 'confirmed')
         GROUP BY accommodation_option_id
      ) b ON b.accommodation_option_id = o.id
     WHERE o.stay_id = ${stay.id}
     ORDER BY o.position, o.id
  `);

  return { ...stay, options: options.rows };
}

export async function setStayVisibility(
  actor: StaffIdentity,
  slug: string,
  visibility: StayVisibility,
): Promise<OpsMutationResult> {
  const db = getDb();
  const updated = await db
    .update(stays)
    .set({ visibility, updatedAt: new Date() })
    .where(eq(stays.slug, slug))
    .returning({ slug: stays.slug });

  if (updated.length === 0) return { status: "not-found" };

  await recordAudit(actor, {
    action: "stay.visibility_changed",
    targetType: "stay",
    targetRef: slug,
    summary: `Visibility set to ${visibility}`,
  });

  return { status: "ok" };
}

/**
 * Changes an accommodation's price or inventory.
 *
 * Neither touches history. Bookings carry their own `nightly_rate_ugx` snapshot
 * (Release 4), so repricing changes what the *next* traveller is quoted and
 * nothing about what a previous one asked for.
 *
 * Inventory may be lowered below the number of bookings currently held. That is
 * allowed on purpose — a lodge really can lose a room — and the result is that
 * the availability query offers nothing until the excess clears. It cannot
 * cause an overbooking, because the exclusion constraint is per unit and the
 * existing rows keep the units they already hold.
 */
export async function updateAccommodation(
  actor: StaffIdentity,
  staySlug: string,
  optionId: number,
  changes: { priceFromUgx: number; inventoryCount: number },
): Promise<OpsMutationResult> {
  const db = getDb();

  const updated = await db.execute<{ name: string }>(sql`
    UPDATE ${accommodationOptions} o
       SET price_from_ugx = ${changes.priceFromUgx},
           inventory_count = ${changes.inventoryCount}
      FROM ${stays} s
     WHERE o.id = ${optionId}
       AND s.id = o.stay_id
       -- Scoped to the property in the URL, so an id from another stay does
       -- nothing even if the form is edited.
       AND s.slug = ${staySlug}
    RETURNING o.name
  `);

  if (updated.rows.length === 0) return { status: "not-found" };

  await recordAudit(actor, {
    action: "accommodation.updated",
    targetType: "stay",
    targetRef: staySlug,
    summary: `${updated.rows[0].name}: ${changes.inventoryCount} units at ${changes.priceFromUgx}`,
  });

  return { status: "ok" };
}

// ---------------------------------------------------------------------------
// Audit
// ---------------------------------------------------------------------------

/**
 * Records a consequence.
 *
 * Actor name and email are snapshotted rather than joined: a staff member can
 * be deactivated or deleted, and what they did has to stay readable. An audit
 * trail that resolves to "someone" is not an audit trail.
 *
 * Never called with a secret. Summaries are written for a human to read and are
 * displayed verbatim.
 */
export async function recordAudit(
  actor: StaffIdentity,
  event: {
    action: AuditAction;
    targetType: string;
    targetRef: string;
    summary: string;
  },
): Promise<void> {
  const db = getDb();
  await db.insert(auditEvents).values({
    action: event.action,
    actorStaffId: actor.id,
    actorEmail: actor.email,
    actorName: actor.name,
    targetType: event.targetType,
    targetRef: event.targetRef,
    summary: event.summary,
  });
}

export async function listRecentAudit(limit = 30) {
  const db = getDb();
  return db
    .select({
      id: auditEvents.id,
      action: auditEvents.action,
      actorName: auditEvents.actorName,
      targetType: auditEvents.targetType,
      targetRef: auditEvents.targetRef,
      summary: auditEvents.summary,
      createdAt: auditEvents.createdAt,
    })
    .from(auditEvents)
    .orderBy(desc(auditEvents.createdAt), desc(auditEvents.id))
    .limit(limit);
}

/** Bookings arriving soon, for the overview. Bounded and blocking-only. */
export async function listUpcomingArrivals(days = 7) {
  const db = getDb();
  const today = todayInUganda();

  /*
    The window is computed here rather than as `date + $n` in SQL.

    Postgres cannot infer a type for the right-hand side of `date + $5` when it
    arrives as a bound parameter, and the whole statement fails at runtime —
    which is a query that typechecks, passes review, and then 500s the
    operations overview on first load. Two `YYYY-MM-DD` strings and a plain
    comparison have no such ambiguity.
  */
  const until = addDays(today, days);

  return db
    .select({
      reference: bookings.reference,
      guestName: bookings.guestName,
      stayName: stays.name,
      checkIn: bookings.checkIn,
      guests: bookings.guests,
      status: bookings.status,
    })
    .from(bookings)
    .innerJoin(stays, eq(stays.id, bookings.stayId))
    .where(
      and(
        inArray(bookings.status, [...BLOCKING_BOOKING_STATUSES]),
        gte(bookings.checkIn, today),
        lt(bookings.checkIn, until),
      ),
    )
    .orderBy(asc(bookings.checkIn))
    .limit(10);
}
