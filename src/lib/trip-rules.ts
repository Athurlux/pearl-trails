/**
 * Trip rules — the pure half of the trip domain.
 *
 * No database, no `server-only`, no React. Token minting, initial itinerary
 * planning, ordering and validation all live here so they can be tested
 * directly and so the same rules run in the browser for feedback and on the
 * server as the authority.
 *
 * See `docs/decisions/004-trip-access-and-itinerary-ownership.md`.
 */

import {
  MAX_ITINERARY_NOTE,
  MAX_ITINERARY_TITLE,
  MAX_TRIP_NOTE,
  TIME_OF_DAY,
  TIME_OF_DAY_ORDER,
  type ItinerarySource,
  type ItinerarySystemKind,
  type TimeOfDay,
} from "./itinerary-vocab";
import { addDays, daysBetween, type FieldErrors } from "./booking-rules";
import { parseIsoDate } from "./trip-params";

// ---------------------------------------------------------------------------
// The trip token
// ---------------------------------------------------------------------------

/**
 * Same alphabet as the booking reference: Crockford-style base32 with `I`, `L`,
 * `O` and `U` removed, so a token cannot be misread or accidentally spell
 * something. 32 characters at 5 bits each is 160 bits.
 *
 * `256 % 32 === 0`, so taking a byte modulo the alphabet length is uniform.
 * With an alphabet whose length did not divide 256 this would quietly bias the
 * first few characters and cost real entropy.
 */
const TOKEN_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
export const TRIP_TOKEN_LENGTH = 32;
export const TRIP_TOKEN_PATTERN = /^[0-9ABCDEFGHJKMNPQRSTVWXYZ]{32}$/;

/**
 * A fresh trip token.
 *
 * `crypto.getRandomValues`, never `Math.random`: this string is the whole
 * credential for a page that can be written to.
 */
export function generateTripToken(): string {
  const bytes = new Uint8Array(TRIP_TOKEN_LENGTH);
  crypto.getRandomValues(bytes);
  let token = "";
  for (const byte of bytes) token += TOKEN_ALPHABET[byte % TOKEN_ALPHABET.length];
  return token;
}

/** Normalises a token from a URL. Case-insensitive; anything else is rejected. */
export function parseTripToken(raw: string | undefined | null): string | null {
  if (typeof raw !== "string") return null;
  const token = raw.trim().toUpperCase();
  return TRIP_TOKEN_PATTERN.test(token) ? token : null;
}

/**
 * SHA-256 of a token, hex encoded — what the database actually stores.
 *
 * Web Crypto rather than a Node import, because this runs in a Worker. It is
 * async, so every caller is async; that is the cost of not shipping a hashing
 * dependency into the bundle.
 *
 * Plain SHA-256 with no salt or stretching is right here and would be wrong for
 * a password: the input is 160 bits of uniform randomness, so there is no
 * dictionary to run and nothing to guess. Stretching would only slow down the
 * legitimate lookup.
 */
export async function hashTripToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export function tripHref(token: string): string {
  return `/trip/${token}`;
}

// ---------------------------------------------------------------------------
// Trip days
// ---------------------------------------------------------------------------

export interface TripDay {
  /** 1-based, as the traveller counts them. */
  number: number;
  /** `YYYY-MM-DD`. */
  date: string;
  /** `Sat` */
  weekday: string;
  /** `12 Sep` */
  dayMonth: string;
  isArrival: boolean;
  isDeparture: boolean;
}

/**
 * Every calendar day of the trip, arrival and departure included.
 *
 * A 3-night stay is **4** days: you are there on the morning you leave. Using
 * the night count would silently drop the departure day and with it the
 * check-out.
 *
 * Dates are built in UTC from the `YYYY-MM-DD` strings rather than through the
 * local `Date` constructor, so a browser in Kampala and a Worker in UTC label
 * the same day the same way.
 */
export function tripDays(checkIn: string, checkOut: string): TripDay[] {
  const from = parseIsoDate(checkIn);
  const to = parseIsoDate(checkOut);
  if (!from || !to || to <= from) return [];

  const nights = daysBetween(from, to);
  const days: TripDay[] = [];

  for (let index = 0; index <= nights; index += 1) {
    const date = addDays(from, index);
    const [y, m, d] = date.split("-").map(Number);
    const asUtc = new Date(Date.UTC(y, m - 1, d));
    days.push({
      number: index + 1,
      date,
      weekday: asUtc.toLocaleDateString("en-GB", { weekday: "short", timeZone: "UTC" }),
      dayMonth: `${d} ${asUtc.toLocaleDateString("en-GB", { month: "short", timeZone: "UTC" })}`,
      isArrival: index === 0,
      isDeparture: index === nights,
    });
  }

  return days;
}

// ---------------------------------------------------------------------------
// Initial itinerary
// ---------------------------------------------------------------------------

export interface PlannedItem {
  source: ItinerarySource;
  systemKind: ItinerarySystemKind | null;
  /** Index into the caller's experience list, not a database id. */
  experienceIndex: number | null;
  day: string;
  timeOfDay: TimeOfDay;
  exactTime: string | null;
  title: string;
  note: string | null;
}

export interface PlanInput {
  checkIn: string;
  checkOut: string;
  /** The property's published times, e.g. `14:00`. */
  checkInTime: string;
  checkOutTime: string;
  stayName: string;
  /** Requested experiences, in the order they were booked. */
  experiences: { name: string }[];
}

/**
 * The starting plan for a booking.
 *
 * Pure and deterministic — the same booking always produces the same plan.
 * That is what makes generation safe to re-run and possible to test, and it is
 * why no model, clock or random source is involved.
 *
 * Shape:
 *   * arrival day  — check-in, at the property's stated time
 *   * middle days  — the requested experiences, spread one per day
 *   * departure day — check-out, at the property's stated time
 *
 * Experiences go on the *full* days, because an experience on the day you
 * arrive at 14:00 or leave at 10:00 is a plan nobody can keep. Where there are
 * more experiences than full days they stack, taking morning, then afternoon,
 * then evening. Where there are no full days at all — a single-night stay —
 * they fall on the arrival evening, which is the only time that exists.
 *
 * The times of day are a **suggestion the traveller owns and can change**, not
 * a booking. Nothing here claims a permit hour or a guide.
 */
export function planInitialItinerary(input: PlanInput): PlannedItem[] {
  const days = tripDays(input.checkIn, input.checkOut);
  if (days.length === 0) return [];

  const arrival = days[0];
  const departure = days[days.length - 1];
  const fullDays = days.filter((day) => !day.isArrival && !day.isDeparture);

  const items: PlannedItem[] = [
    {
      source: "system",
      systemKind: "check_in",
      experienceIndex: null,
      day: arrival.date,
      timeOfDay: "afternoon",
      exactTime: input.checkInTime,
      title: `Check in at ${input.stayName}`,
      note: null,
    },
  ];

  // Round-robin across the full days, so three experiences over two full days
  // become 2 + 1 rather than everything on the first morning.
  const spread: TimeOfDay[] = ["morning", "afternoon", "evening"];
  input.experiences.forEach((experience, index) => {
    const target = fullDays.length > 0 ? fullDays[index % fullDays.length] : arrival;
    const round = fullDays.length > 0 ? Math.floor(index / fullDays.length) : index;

    items.push({
      source: "experience",
      systemKind: null,
      experienceIndex: index,
      day: target.date,
      // A single-night stay has no full day; the evening is the honest slot.
      timeOfDay: fullDays.length > 0 ? (spread[round] ?? "flexible") : "evening",
      exactTime: null,
      title: experience.name,
      note: null,
    });
  });

  items.push({
    source: "system",
    systemKind: "check_out",
    experienceIndex: null,
    day: departure.date,
    timeOfDay: "morning",
    exactTime: input.checkOutTime,
    title: `Check out of ${input.stayName}`,
    note: null,
  });

  return items;
}

// ---------------------------------------------------------------------------
// Ordering
// ---------------------------------------------------------------------------

export interface OrderableItem {
  id: number;
  day: string;
  timeOfDay: TimeOfDay;
  exactTime: string | null;
  systemKind: ItinerarySystemKind | null;
}

/**
 * Deterministic order: day, then time of day, then clock time where one exists,
 * then id.
 *
 * The id tie-break matters. Without it two items added to the same afternoon
 * would come back in whatever order the planner happened to return, and the
 * page would reshuffle between renders for no reason the traveller can see.
 *
 * Check-in sorts to the end of its afternoon and check-out to the start of its
 * morning, so an arrival-day activity does not appear above the arrival.
 */
export function compareItineraryItems(a: OrderableItem, b: OrderableItem): number {
  if (a.day !== b.day) return a.day < b.day ? -1 : 1;

  const slot = TIME_OF_DAY_ORDER[a.timeOfDay] - TIME_OF_DAY_ORDER[b.timeOfDay];
  if (slot !== 0) return slot;

  const aTime = a.exactTime ?? (a.systemKind === "check_in" ? "23:59" : "");
  const bTime = b.exactTime ?? (b.systemKind === "check_in" ? "23:59" : "");
  if (aTime !== bTime) return aTime < bTime ? -1 : 1;

  return a.id - b.id;
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

/**
 * The result of a trip mutation, as the form sees it.
 *
 * Lives here rather than beside the server actions because a `"use server"`
 * module may export only async functions — exporting this object from there
 * makes Next.js refuse to load the module at request time, and neither the type
 * checker nor the build reports it. The same trap as `BookingActionState`.
 */
export interface TripActionState {
  status: "idle" | "ok" | "error";
  errors: FieldErrors;
  formError?: string;
}

export const initialTripState: TripActionState = { status: "idle", errors: {} };

export interface ItineraryItemInput {
  title: string;
  day: string | null;
  timeOfDay: string;
  note: string;
}

export interface ItineraryItemValues {
  title: string;
  day: string;
  timeOfDay: TimeOfDay;
  note: string | null;
}

/**
 * Validates a traveller-authored itinerary item.
 *
 * The date bound against the booking is *not* checked here, and that is
 * deliberate: this module cannot see the booking, and a check performed here
 * would be re-done by the write anyway. The insert itself carries
 * `AND $day BETWEEN b.check_in AND b.check_out`, so the range is enforced where
 * there is no window between deciding and writing.
 */
export function validateItineraryItem(input: ItineraryItemInput): {
  errors: FieldErrors;
  values: ItineraryItemValues | null;
} {
  const errors: FieldErrors = {};

  const title = input.title.trim().replace(/\s+/g, " ");
  if (!title) {
    errors.title = "Give this a short name.";
  } else if (title.length > MAX_ITINERARY_TITLE) {
    errors.title = `Keep it under ${MAX_ITINERARY_TITLE} characters.`;
  }

  const day = parseIsoDate(input.day);
  if (!day) errors.day = "Choose a day of your trip.";

  const timeOfDay = TIME_OF_DAY.includes(input.timeOfDay as TimeOfDay)
    ? (input.timeOfDay as TimeOfDay)
    : null;
  if (!timeOfDay) errors.timeOfDay = "Choose when this happens.";

  const note = input.note.trim();
  if (note.length > MAX_ITINERARY_NOTE) {
    errors.note = `Keep notes under ${MAX_ITINERARY_NOTE} characters.`;
  }

  if (Object.keys(errors).length > 0 || !day || !timeOfDay) {
    return { errors, values: null };
  }

  return {
    errors,
    // An empty note is absent, not an empty string — the column is nullable and
    // "" would be a value that renders as a blank line.
    values: { title, day, timeOfDay, note: note || null },
  };
}

/** Validates a rescheduling of an existing item. Title and note are untouched. */
export function validateReschedule(
  day: string | null,
  timeOfDay: string,
): { errors: FieldErrors; values: { day: string; timeOfDay: TimeOfDay } | null } {
  const errors: FieldErrors = {};
  const parsedDay = parseIsoDate(day);
  if (!parsedDay) errors.day = "Choose a day of your trip.";

  const slot = TIME_OF_DAY.includes(timeOfDay as TimeOfDay)
    ? (timeOfDay as TimeOfDay)
    : null;
  if (!slot) errors.timeOfDay = "Choose when this happens.";

  if (!parsedDay || !slot) return { errors, values: null };
  return { errors, values: { day: parsedDay, timeOfDay: slot } };
}

export function validateTripNote(note: string): {
  errors: FieldErrors;
  value: string | null;
} {
  const trimmed = note.trim();
  if (trimmed.length > MAX_TRIP_NOTE) {
    return {
      errors: { tripNote: `Keep your note under ${MAX_TRIP_NOTE} characters.` },
      value: null,
    };
  }
  return { errors: {}, value: trimmed || null };
}
