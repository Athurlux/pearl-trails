/**
 * Itinerary vocabulary.
 *
 * Lives here rather than in the schema — like `stay-types.ts` and
 * `booking-status.ts` — so client components can label an item without pulling
 * Drizzle into the browser bundle. The Postgres enums are built from these
 * lists. See `docs/decisions/004-trip-access-and-itinerary-ownership.md`.
 */

/**
 * Where an itinerary item came from, which is what decides who may change it.
 *
 * This is not a display category. It is enforced in the `WHERE` clause of every
 * mutation: a traveller may edit and delete only their own items, may move an
 * experience within the plan, and may do nothing at all to check-in and
 * check-out.
 */
export const ITINERARY_SOURCES = ["system", "experience", "traveller"] as const;
export type ItinerarySource = (typeof ITINERARY_SOURCES)[number];

/** The system items a booking always has. Nothing else is generated. */
export const ITINERARY_SYSTEM_KINDS = ["check_in", "check_out"] as const;
export type ItinerarySystemKind = (typeof ITINERARY_SYSTEM_KINDS)[number];

/**
 * When something happens, at the resolution this product can honestly claim.
 *
 * Deliberately coarse. Pearl Trails has no operator scheduling, no permit
 * allocation and no guide roster, so rendering "08:00" against a gorilla trek
 * would be inventing an appointment. `flexible` is the honest default for
 * anything nobody has arranged yet.
 *
 * Check-in and check-out are the exception and carry a real clock time, because
 * the property publishes one.
 */
export const TIME_OF_DAY = ["morning", "afternoon", "evening", "flexible"] as const;
export type TimeOfDay = (typeof TIME_OF_DAY)[number];

export const TIME_OF_DAY_LABELS: Record<TimeOfDay, string> = {
  morning: "Morning",
  afternoon: "Afternoon",
  evening: "Evening",
  flexible: "Any time",
};

/** Sort weight within a day. `flexible` sits last: it competes with nothing. */
export const TIME_OF_DAY_ORDER: Record<TimeOfDay, number> = {
  morning: 0,
  afternoon: 1,
  evening: 2,
  flexible: 3,
};

/**
 * How an item is described to the traveller, by provenance.
 *
 * The wording carries the promise. An experience is "requested", never
 * "booked" or "confirmed", because Release 4 recorded interest and no property
 * has seen it.
 */
export const ITINERARY_SOURCE_LABELS: Record<ItinerarySource, string> = {
  system: "From your booking",
  experience: "Requested experience",
  traveller: "Your plan",
};

export const MAX_ITINERARY_TITLE = 120;
export const MAX_ITINERARY_NOTE = 500;
export const MAX_TRIP_NOTE = 1000;
/** A trip is at most 30 nights, so this is far above anything legitimate. */
export const MAX_TRAVELLER_ITEMS = 60;
