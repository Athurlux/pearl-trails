/**
 * Trip context — the planning state a traveller carries from Explore into a
 * property page and, later, into the booking flow.
 *
 * Dates here are calendar dates in Uganda, not timestamps. They are parsed and
 * compared as `YYYY-MM-DD` strings so a browser in another timezone cannot
 * shift someone's check-in by a day.
 *
 * None of this represents availability. Release 3 has no availability model,
 * and the UI must never imply otherwise.
 */

export const MAX_TRIP_GUESTS = 16;
/** A planning horizon, not a policy: keeps absurd URLs out of the UI. */
export const MAX_TRIP_NIGHTS = 30;
/** Bounds the `exp` parameter. A stay links about five experiences. */
export const MAX_TRIP_EXPERIENCES = 12;

export interface TripContext {
  checkIn: string | null;
  checkOut: string | null;
  guests: number | null;
  /** Slug of the chosen accommodation option, scoped to the current property. */
  option: string | null;
  /**
   * Slugs of experiences the traveller has picked (Release 4).
   *
   * Trip context only — carrying it in the URL keeps the booking flow
   * refreshable and shareable. Traveller details never join it: name, email,
   * phone and requests are personal information and stay in memory until they
   * are posted to the server action.
   */
  experiences: string[];
}

type Raw = Record<string, string | string[] | undefined>;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function one(raw: Raw, key: string): string | null {
  const v = raw[key];
  const s = Array.isArray(v) ? v[0] : v;
  if (typeof s !== "string") return null;
  const trimmed = s.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/** Rejects malformed values and impossible calendar dates like 2026-02-31. */
export function parseIsoDate(value: string | null | undefined): string | null {
  if (typeof value !== "string" || !ISO_DATE.test(value)) return null;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value
    ? null
    : value;
}

/** Whole nights between two calendar dates. Zero when the range is not valid. */
export function nightsBetween(
  checkIn: string | null,
  checkOut: string | null,
): number {
  const from = parseIsoDate(checkIn);
  const to = parseIsoDate(checkOut);
  if (!from || !to) return 0;

  const ms = Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`);
  const nights = Math.round(ms / 86_400_000);
  return nights > 0 ? nights : 0;
}

export function parseTripContext(raw: Raw): TripContext {
  const checkIn = parseIsoDate(one(raw, "checkIn"));
  let checkOut = parseIsoDate(one(raw, "checkOut"));

  // A checkout on or before the checkin is a mistake, not a zero-night stay.
  if (checkIn && checkOut && checkOut <= checkIn) checkOut = null;
  if (checkIn && checkOut && nightsBetween(checkIn, checkOut) > MAX_TRIP_NIGHTS) {
    checkOut = null;
  }
  // A checkout with no checkin has nothing to anchor it.
  if (!checkIn) checkOut = null;

  const guestsRaw = one(raw, "guests");
  const guests =
    guestsRaw !== null && /^\d{1,3}$/.test(guestsRaw)
      ? Math.min(Math.max(Number(guestsRaw), 1), MAX_TRIP_GUESTS)
      : null;

  const option = one(raw, "option");

  // Comma-separated slugs, whitelisted by shape, de-duplicated and capped —
  // the same discipline every other URL parameter follows.
  const rawExperiences = one(raw, "exp");
  const experiences = rawExperiences
    ? [
        ...new Set(
          rawExperiences
            .split(",")
            .map((slug) => slug.trim())
            .filter((slug) => SLUG.test(slug)),
        ),
      ].slice(0, MAX_TRIP_EXPERIENCES)
    : [];

  return {
    checkIn,
    checkOut,
    guests,
    option: option && SLUG.test(option) ? option : null,
    experiences,
  };
}

export function buildTripQuery(trip: Partial<TripContext>): string {
  const s = new URLSearchParams();
  if (trip.checkIn) s.set("checkIn", trip.checkIn);
  if (trip.checkOut) s.set("checkOut", trip.checkOut);
  if (trip.guests != null) s.set("guests", String(trip.guests));
  if (trip.option) s.set("option", trip.option);
  if (trip.experiences?.length) s.set("exp", trip.experiences.join(","));
  const qs = s.toString();
  return qs ? `?${qs}` : "";
}

export function stayHref(slug: string, trip: Partial<TripContext> = {}): string {
  return `/stays/${slug}${buildTripQuery(trip)}`;
}

export interface StayEstimate {
  nights: number;
  nightlyUgx: number;
  subtotalUgx: number;
  /** True only when there are real dates and a real nightly rate to multiply. */
  complete: boolean;
}

/**
 * Estimated accommodation subtotal. Deliberately excludes taxes and fees —
 * the database does not model any, so inventing a line would be a lie.
 */
export function estimateStay(
  nightlyUgx: number | null | undefined,
  checkIn: string | null,
  checkOut: string | null,
): StayEstimate {
  const nights = nightsBetween(checkIn, checkOut);
  const nightly = typeof nightlyUgx === "number" && nightlyUgx > 0 ? nightlyUgx : 0;
  return {
    nights,
    nightlyUgx: nightly,
    subtotalUgx: nights * nightly,
    complete: nights > 0 && nightly > 0,
  };
}

function partsOf(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return {
    day: String(d),
    month: date.toLocaleDateString("en-GB", { month: "short", timeZone: "UTC" }),
    year: String(y),
  };
}

/**
 * `12 – 15 Sep 2026` within a month, `28 Sep – 2 Oct 2026` across one, a single
 * date when there is no checkout, and null when there is nothing to show.
 */
export function formatDateRange(
  checkIn: string | null,
  checkOut: string | null,
): string | null {
  const from = parseIsoDate(checkIn);
  if (!from) return null;

  const a = partsOf(from);
  const to = parseIsoDate(checkOut);
  if (!to) return `${a.day} ${a.month} ${a.year}`;

  const b = partsOf(to);
  if (a.month === b.month && a.year === b.year) {
    return `${a.day} – ${b.day} ${b.month} ${b.year}`;
  }
  if (a.year === b.year) {
    return `${a.day} ${a.month} – ${b.day} ${b.month} ${b.year}`;
  }
  return `${a.day} ${a.month} ${a.year} – ${b.day} ${b.month} ${b.year}`;
}
