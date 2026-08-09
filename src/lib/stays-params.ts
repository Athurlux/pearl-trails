import { STAY_TYPES, type StayType } from "./stay-types";

/**
 * URL query state for /stays.
 *
 * Nothing here trusts the URL. Every value is whitelisted, clamped or dropped,
 * because these parameters reach a database query and a hand-edited address bar
 * is an untrusted input like any other.
 */

export const SORTS = ["recommended", "price-asc", "price-desc", "rating"] as const;
export type Sort = (typeof SORTS)[number];

export const SORT_LABELS: Record<Sort, string> = {
  recommended: "Recommended",
  "price-asc": "Price: low to high",
  "price-desc": "Price: high to low",
  rating: "Top rated",
};

export { STAY_TYPES, STAY_TYPE_LABELS } from "./stay-types";
export type { StayType } from "./stay-types";

export const PAGE_SIZE = 9;
export const MAX_PAGE = 50;
export const MAX_PRICE = 5_000_000;
export const MAX_GUESTS = 16;
export const MAX_QUERY_LENGTH = 80;
/** Bounds the number of EXISTS clauses a single request can generate. */
const MAX_AMENITIES = 12;

export interface StaysParams {
  q: string | null;
  destination: string | null;
  types: StayType[];
  amenities: string[];
  minPrice: number | null;
  maxPrice: number | null;
  guests: number | null;
  minRating: number | null;
  sort: Sort;
  page: number;
  /**
   * Carried through the URL so a search survives refresh and reaches Release 3.
   * Release 2 has no availability model, so these never filter anything and the
   * page must not imply otherwise.
   */
  checkIn: string | null;
  checkOut: string | null;
}

/** Next passes repeated params as arrays; take the first meaningful value. */
type Raw = Record<string, string | string[] | undefined>;

function one(raw: Raw, key: string): string | null {
  const v = raw[key];
  const s = Array.isArray(v) ? v[0] : v;
  if (typeof s !== "string") return null;
  const trimmed = s.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/** Accepts `a,b` and repeated `?k=a&k=b`, deduped and length-bounded. */
function list(raw: Raw, key: string, max: number): string[] {
  const v = raw[key];
  const parts = (Array.isArray(v) ? v : [v])
    .filter((s): s is string => typeof s === "string")
    .flatMap((s) => s.split(","))
    .map((s) => s.trim())
    .filter(Boolean);
  return [...new Set(parts)].slice(0, max);
}

function int(value: string | null, min: number, max: number): number | null {
  if (value === null) return null;
  if (!/^\d{1,9}$/.test(value)) return null;
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.min(Math.max(n, min), max);
}

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function isoDate(value: string | null): string | null {
  if (value === null || !ISO_DATE.test(value)) return null;
  // Reject 2026-02-31 and friends: round-trip through Date and compare.
  const d = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== value
    ? null
    : value;
}

export function parseStaysParams(raw: Raw): StaysParams {
  const validTypes = new Set<string>(STAY_TYPES);

  const rawQuery = one(raw, "q");
  const destination = one(raw, "destination");

  let minPrice = int(one(raw, "minPrice"), 0, MAX_PRICE);
  let maxPrice = int(one(raw, "maxPrice"), 0, MAX_PRICE);
  // A reversed range is a mistake, not a request for zero results.
  if (minPrice !== null && maxPrice !== null && minPrice > maxPrice) {
    [minPrice, maxPrice] = [maxPrice, minPrice];
  }

  const ratingRaw = one(raw, "minRating");
  const minRating =
    ratingRaw !== null && /^[0-5](?:\.[05])?$/.test(ratingRaw) ? Number(ratingRaw) : null;

  const sortRaw = one(raw, "sort");
  const sort = (SORTS as readonly string[]).includes(sortRaw ?? "")
    ? (sortRaw as Sort)
    : "recommended";

  const checkIn = isoDate(one(raw, "checkIn"));
  const checkOut = isoDate(one(raw, "checkOut"));

  return {
    q: rawQuery ? rawQuery.slice(0, MAX_QUERY_LENGTH) : null,
    destination: destination && SLUG.test(destination) ? destination : null,
    types: list(raw, "type", validTypes.size).filter((t): t is StayType =>
      validTypes.has(t),
    ),
    amenities: list(raw, "amenity", MAX_AMENITIES).filter((a) => SLUG.test(a)),
    minPrice,
    maxPrice,
    guests: int(one(raw, "guests"), 1, MAX_GUESTS),
    minRating,
    sort,
    page: int(one(raw, "page"), 1, MAX_PAGE) ?? 1,
    // Only keep a checkout that is genuinely after the checkin.
    checkIn,
    checkOut: checkIn && checkOut && checkOut <= checkIn ? null : checkOut,
  };
}

/**
 * Rebuild a canonical query string. Defaults are omitted so shared URLs stay
 * short and two equivalent searches produce the same link.
 */
export function buildStaysQuery(
  params: Partial<StaysParams>,
  overrides: Partial<StaysParams> = {},
): string {
  const p = { ...params, ...overrides };
  const s = new URLSearchParams();

  if (p.q) s.set("q", p.q);
  if (p.destination) s.set("destination", p.destination);
  if (p.types?.length) s.set("type", p.types.join(","));
  if (p.amenities?.length) s.set("amenity", p.amenities.join(","));
  if (p.minPrice != null) s.set("minPrice", String(p.minPrice));
  if (p.maxPrice != null) s.set("maxPrice", String(p.maxPrice));
  if (p.guests != null) s.set("guests", String(p.guests));
  if (p.minRating != null) s.set("minRating", String(p.minRating));
  if (p.sort && p.sort !== "recommended") s.set("sort", p.sort);
  if (p.page && p.page > 1) s.set("page", String(p.page));
  if (p.checkIn) s.set("checkIn", p.checkIn);
  if (p.checkOut) s.set("checkOut", p.checkOut);

  const qs = s.toString();
  return qs ? `?${qs}` : "";
}

export function staysHref(
  params: Partial<StaysParams>,
  overrides: Partial<StaysParams> = {},
): string {
  return `/stays${buildStaysQuery(params, overrides)}`;
}

/** True when anything beyond sort and page is narrowing the result set. */
export function hasActiveFilters(p: StaysParams): boolean {
  return Boolean(
    p.q ||
      p.destination ||
      p.types.length ||
      p.amenities.length ||
      p.minPrice != null ||
      p.maxPrice != null ||
      p.guests != null ||
      p.minRating != null,
  );
}
