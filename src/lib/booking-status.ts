/**
 * Booking status vocabulary.
 *
 * Lives here rather than in the schema — like `stay-types.ts` — so client
 * components can label a status without pulling Drizzle into the browser
 * bundle. The Postgres enum is built from `BOOKING_STATUSES`.
 *
 * See `docs/decisions/002-booking-status-and-expiry.md`. Nothing in Release 4
 * writes any status other than `pending`; the rest exist because the set of
 * statuses that block inventory is compiled into an exclusion constraint, and
 * getting it right once is cheaper than migrating a populated table later.
 */

export const BOOKING_STATUSES = [
  "pending",
  "confirmed",
  "cancelled",
  "expired",
] as const;

export type BookingStatus = (typeof BOOKING_STATUSES)[number];

/**
 * The statuses that hold a unit against a date range.
 *
 * This list is mirrored by the `WHERE` clause of `bookings_no_overlapping_unit`.
 * Changing it here without migrating that constraint would make the availability
 * query and the database disagree — the query would offer a unit the constraint
 * then refuses. `booking-availability.test.ts` asserts the two agree.
 */
export const BLOCKING_BOOKING_STATUSES = ["pending", "confirmed"] as const;

export function blocksInventory(status: BookingStatus): boolean {
  return (BLOCKING_BOOKING_STATUSES as readonly string[]).includes(status);
}

/** What the traveller reads. Never render the raw enum value. */
export const BOOKING_STATUS_LABELS: Record<BookingStatus, string> = {
  pending: "Pending review",
  confirmed: "Confirmed",
  cancelled: "Cancelled",
  expired: "Expired",
};

/**
 * One sentence explaining what the status actually means for the traveller.
 *
 * `pending` must not imply that a property has seen or accepted the request —
 * in Release 4 nothing has, because there is no operator tooling.
 */
export const BOOKING_STATUS_NOTES: Record<BookingStatus, string> = {
  pending:
    "We have your request and the dates are held against this accommodation. The property has not confirmed it yet.",
  confirmed: "The property has accepted this reservation.",
  cancelled: "This request was cancelled and the dates are no longer held.",
  expired: "This request lapsed before it was actioned and the dates were released.",
};
