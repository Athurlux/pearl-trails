/**
 * Booking rules — the pure half of the booking domain.
 *
 * No database, no `server-only`, no React. Everything here is a function of its
 * arguments, which is what lets the same rules run in the browser for instant
 * feedback *and* on the server as the authority, without two implementations
 * drifting apart.
 *
 * The split matters: this module decides whether a request is *well-formed and
 * internally consistent*. It cannot decide whether a unit is free — that needs
 * the database, and lives in `booking-query.ts`.
 *
 * Nothing here trusts its caller. Every validator re-derives values rather than
 * accepting them, and the server passes authoritative capacity and prices
 * loaded from Postgres, never the numbers the browser posted.
 */

import { MAX_TRIP_NIGHTS, nightsBetween, parseIsoDate } from "./trip-params";

export { MAX_TRIP_NIGHTS, nightsBetween, parseIsoDate };

/** Free text is bounded so a submission cannot carry a novel. */
export const MAX_SPECIAL_REQUESTS = 1000;
export const MAX_GUEST_NAME = 120;
export const MAX_GUEST_EMAIL = 254;
/** Defensive: a stay links ~5 experiences, so nothing legitimate approaches this. */
export const MAX_BOOKING_EXPERIENCES = 12;
/** Eighteen months. A planning horizon, not a policy — it keeps absurd input out. */
export const MAX_BOOKING_LEAD_DAYS = 540;

/**
 * Uganda is UTC+3 year round and observes no daylight saving, so "today in
 * Kampala" is a fixed shift rather than a timezone database lookup.
 *
 * This exists because a Worker runs in UTC. At 23:30 UTC it is already tomorrow
 * in Uganda, and rejecting a traveller's check-in as "in the past" when it is
 * today where the lodge stands would be wrong.
 */
export const UGANDA_UTC_OFFSET_MINUTES = 180;

export function todayInUganda(now: Date = new Date()): string {
  return new Date(now.getTime() + UGANDA_UTC_OFFSET_MINUTES * 60_000)
    .toISOString()
    .slice(0, 10);
}

/** Calendar days from `from` to `to`, negative if `to` is earlier. */
export function daysBetween(from: string, to: string): number {
  return Math.round(
    (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000,
  );
}

export function addDays(iso: string, days: number): string {
  return new Date(Date.parse(`${iso}T00:00:00Z`) + days * 86_400_000)
    .toISOString()
    .slice(0, 10);
}

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

/**
 * Field name → message. A field error points at an input the traveller can fix;
 * anything that is not about one specific input belongs in a form-level error
 * instead (see `BookingSubmitResult`), not bolted onto an arbitrary field.
 */
export type FieldErrors = Record<string, string>;

/**
 * The result of a booking submission, as the form sees it.
 *
 * This lives here rather than beside the server action because a `"use server"`
 * module may only export async functions — exporting the initial-state object
 * from there makes Next.js refuse to load the module at runtime, which neither
 * the type checker nor the build reports.
 */
export interface BookingActionState {
  status: "idle" | "invalid" | "unavailable" | "error";
  errors: FieldErrors;
  /** Not about one input — shown above the form, not beside a field. */
  formError?: string;
}

export const initialBookingState: BookingActionState = { status: "idle", errors: {} };

// ---------------------------------------------------------------------------
// Dates and guests
// ---------------------------------------------------------------------------

export interface TripInput {
  checkIn: string | null;
  checkOut: string | null;
  guests: number | null;
}

export interface TripRules {
  /** Authoritative guest capacity of the chosen option — from the database. */
  capacity: number;
  /** Calendar date in Uganda. Injected so tests are not clock-dependent. */
  today: string;
}

/**
 * Validates the stay dates and party size.
 *
 * Returns every problem at once rather than the first: a traveller fixing one
 * field at a time through four round trips is a bad experience.
 */
export function validateTrip(input: TripInput, rules: TripRules): FieldErrors {
  const errors: FieldErrors = {};

  const checkIn = parseIsoDate(input.checkIn);
  const checkOut = parseIsoDate(input.checkOut);

  if (!checkIn) {
    errors.checkIn = "Choose a check-in date.";
  } else if (checkIn < rules.today) {
    errors.checkIn = "Check-in cannot be in the past.";
  } else if (daysBetween(rules.today, checkIn) > MAX_BOOKING_LEAD_DAYS) {
    errors.checkIn = "We are taking requests up to 18 months ahead.";
  }

  if (!checkOut) {
    errors.checkOut = "Choose a check-out date.";
  } else if (checkIn && checkOut <= checkIn) {
    errors.checkOut = "Check-out must be after check-in.";
  } else if (checkIn && nightsBetween(checkIn, checkOut) > MAX_TRIP_NIGHTS) {
    errors.checkOut = `A single request covers up to ${MAX_TRIP_NIGHTS} nights.`;
  }

  // `0` is a real value and must not be read as "missing" — hence the null check
  // rather than a falsy one.
  if (input.guests === null || input.guests === undefined) {
    errors.guests = "Tell us how many guests are travelling.";
  } else if (!Number.isInteger(input.guests) || input.guests < 1) {
    errors.guests = "Enter at least one guest.";
  } else if (input.guests > rules.capacity) {
    errors.guests = `This accommodation sleeps up to ${rules.capacity}. Choose a larger option or reduce the party.`;
  }

  return errors;
}

// ---------------------------------------------------------------------------
// Accommodation choice
// ---------------------------------------------------------------------------

/**
 * The little an availability decision needs to know about an accommodation.
 *
 * Deliberately structural rather than the full `BookingOption`: this module is
 * shared with the server, and the server has rows, not view models.
 */
export interface AvailabilityChoice {
  slug: string;
  /** Units free for the chosen dates, as read server-side. Advisory. */
  available: number;
}

/**
 * Which accommodation to start the flow on.
 *
 * A slug carried in from the property page wins, even if it is sold out — the
 * traveller asked for that one, and silently swapping it for another room
 * would be a worse answer than telling them it is taken. Otherwise prefer
 * something actually bookable rather than whichever option happens to sort
 * first, so the common path does not open on a dead end.
 */
export function chooseInitialOption<T extends AvailabilityChoice>(
  options: T[],
  presetSlug: string | null,
  datesChosen: boolean,
): string {
  const preset = options.find((option) => option.slug === presetSlug);
  if (preset) return preset.slug;
  if (datesChosen) {
    const free = options.find((option) => option.available > 0);
    if (free) return free.slug;
  }
  return options[0]?.slug ?? "";
}

/**
 * Whether the flow may advance past step 1 with this accommodation chosen.
 *
 * Availability only becomes a question once dates exist — before that there is
 * nothing to be available *for*. This is a courtesy check, not the guarantee:
 * the authority remains the exclusion constraint hit on submit, which is what
 * catches the unit taken while the traveller was filling in their name.
 */
export function validateOptionChoice(
  option: AvailabilityChoice | null,
  datesChosen: boolean,
): FieldErrors {
  if (!option) return { option: "Choose an accommodation to continue." };
  if (datesChosen && option.available < 1) {
    return {
      option:
        "This accommodation is taken for your dates. Choose another below, or change your dates.",
    };
  }
  return {};
}

// ---------------------------------------------------------------------------
// Traveller details
// ---------------------------------------------------------------------------

/**
 * Dialling codes offered by the phone field. Uganda first — this is a
 * Uganda-first product — then the markets its travellers actually come from.
 *
 * A curated list rather than a full ITU dataset: a 240-entry table would be
 * shipped to every browser to serve a field with one dominant value. `other`
 * exists so nobody is locked out.
 */
export const DIALLING_CODES = [
  { code: "+256", label: "Uganda +256" },
  { code: "+254", label: "Kenya +254" },
  { code: "+255", label: "Tanzania +255" },
  { code: "+250", label: "Rwanda +250" },
  { code: "+257", label: "Burundi +257" },
  { code: "+211", label: "South Sudan +211" },
  { code: "+251", label: "Ethiopia +251" },
  { code: "+27", label: "South Africa +27" },
  { code: "+234", label: "Nigeria +234" },
  { code: "+44", label: "United Kingdom +44" },
  { code: "+353", label: "Ireland +353" },
  { code: "+1", label: "United States / Canada +1" },
  { code: "+33", label: "France +33" },
  { code: "+49", label: "Germany +49" },
  { code: "+31", label: "Netherlands +31" },
  { code: "+32", label: "Belgium +32" },
  { code: "+41", label: "Switzerland +41" },
  { code: "+39", label: "Italy +39" },
  { code: "+34", label: "Spain +34" },
  { code: "+45", label: "Denmark +45" },
  { code: "+46", label: "Sweden +46" },
  { code: "+47", label: "Norway +47" },
  { code: "+351", label: "Portugal +351" },
  { code: "+43", label: "Austria +43" },
  { code: "+48", label: "Poland +48" },
  { code: "+971", label: "United Arab Emirates +971" },
  { code: "+974", label: "Qatar +974" },
  { code: "+91", label: "India +91" },
  { code: "+86", label: "China +86" },
  { code: "+81", label: "Japan +81" },
  { code: "+82", label: "South Korea +82" },
  { code: "+61", label: "Australia +61" },
  { code: "+64", label: "New Zealand +64" },
  { code: "+55", label: "Brazil +55" },
] as const;

const DIALLING_CODE_SET = new Set<string>(DIALLING_CODES.map((d) => d.code));

/**
 * Countries offered in the traveller form, validated as a whitelist server-side
 * — the same discipline `stays-params.ts` uses for URL values.
 */
export const COUNTRIES = [
  "Uganda", "Kenya", "Tanzania", "Rwanda", "Burundi", "South Sudan",
  "Democratic Republic of the Congo", "Ethiopia", "Somalia", "Sudan",
  "Nigeria", "Ghana", "South Africa", "Zambia", "Zimbabwe", "Botswana",
  "Namibia", "Egypt", "Morocco",
  "United Kingdom", "Ireland", "France", "Germany", "Netherlands", "Belgium",
  "Switzerland", "Austria", "Italy", "Spain", "Portugal", "Denmark", "Sweden",
  "Norway", "Finland", "Poland", "Czechia", "Greece",
  "United States", "Canada", "Mexico", "Brazil", "Argentina",
  "United Arab Emirates", "Qatar", "Saudi Arabia", "Israel", "Turkey",
  "India", "Pakistan", "China", "Japan", "South Korea", "Singapore",
  "Malaysia", "Thailand", "Australia", "New Zealand",
  "Other",
] as const;

const COUNTRY_SET = new Set<string>(COUNTRIES);

/**
 * Deliberately permissive.
 *
 * Something local before an `@`, something with a dot after it, no whitespace.
 * Clever regexes reject real addresses — apostrophes, plus-addressing, long
 * new TLDs — and the only thing that actually proves an address works is
 * sending to it, which Release 4 does not do. So this catches typos and
 * nothing more, and the UI never claims the address was verified.
 */
const EMAIL = /^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/;

export interface TravellerInput {
  fullName: string;
  email: string;
  phoneCode: string;
  phoneNumber: string;
  country: string;
  specialRequests: string;
}

export interface TravellerValues {
  guestName: string;
  guestEmail: string;
  /** Stored joined, e.g. `+256772123456`. */
  guestPhone: string;
  guestCountry: string;
  specialRequests: string | null;
}

export interface TravellerResult {
  errors: FieldErrors;
  values: TravellerValues | null;
}

/**
 * Normalises then validates. Normalisation is predictable and never changes
 * meaning: collapse runs of whitespace, trim, lowercase the email (addresses
 * are compared case-insensitively in practice, and `A@x.com` / `a@x.com`
 * arriving as two different travellers helps nobody).
 */
export function validateTraveller(input: TravellerInput): TravellerResult {
  const errors: FieldErrors = {};

  const guestName = input.fullName.replace(/\s+/g, " ").trim();
  if (guestName.length === 0) {
    errors.fullName = "Enter the name the booking should be held under.";
  } else if (guestName.length < 2) {
    errors.fullName = "That name looks too short.";
  } else if (guestName.length > MAX_GUEST_NAME) {
    errors.fullName = `Names are limited to ${MAX_GUEST_NAME} characters.`;
  }

  const guestEmail = input.email.trim().toLowerCase();
  if (guestEmail.length === 0) {
    errors.email = "Enter an email address so we can reply.";
  } else if (guestEmail.length > MAX_GUEST_EMAIL) {
    errors.email = "That email address is too long.";
  } else if (!EMAIL.test(guestEmail)) {
    errors.email = "Enter a valid email address, for example name@example.com.";
  }

  const phoneCode = input.phoneCode.trim();
  if (!DIALLING_CODE_SET.has(phoneCode)) {
    errors.phoneCode = "Choose a country code.";
  }

  // Strip the separators people genuinely type — spaces, dashes, brackets,
  // dots — then require the rest to be digits. A leading zero is a national
  // trunk prefix and is dropped, so 0772… and 772… reach the same number.
  const digits = input.phoneNumber.replace(/[\s\-().]/g, "");
  const national = digits.replace(/^0+/, "");
  if (digits.length === 0) {
    errors.phoneNumber = "Enter a phone number we can reach you on.";
  } else if (!/^\d+$/.test(digits)) {
    errors.phoneNumber = "Use digits only, without a country code.";
  } else if (national.length < 6 || national.length > 14) {
    errors.phoneNumber = "That phone number does not look complete.";
  }

  const guestCountry = input.country.trim();
  if (guestCountry.length === 0) {
    errors.country = "Choose where you are travelling from.";
  } else if (!COUNTRY_SET.has(guestCountry)) {
    errors.country = "Choose a country from the list.";
  }

  const trimmedRequests = input.specialRequests.trim();
  if (trimmedRequests.length > MAX_SPECIAL_REQUESTS) {
    errors.specialRequests = `Keep requests under ${MAX_SPECIAL_REQUESTS} characters.`;
  }

  if (Object.keys(errors).length > 0) return { errors, values: null };

  return {
    errors,
    values: {
      guestName,
      guestEmail,
      guestPhone: `${phoneCode}${national}`,
      guestCountry,
      // Empty is absent, not an empty string — the column is nullable and the
      // two must not both appear in the data meaning the same thing.
      specialRequests: trimmedRequests.length > 0 ? trimmedRequests : null,
    },
  };
}

// ---------------------------------------------------------------------------
// Pricing
// ---------------------------------------------------------------------------

export interface PricedExperience {
  /** Authoritative catalogue price. Null means "on request", not free. */
  priceFromUgx: number | null;
  /** How many people the experience is requested for. */
  guests: number;
}

/**
 * One experience line. A null catalogue price contributes nothing to the
 * estimate — inventing a number for it would be worse than showing none.
 */
export function experienceLineTotal(priceFromUgx: number | null, guests: number): number {
  if (priceFromUgx === null || priceFromUgx <= 0) return 0;
  if (!Number.isInteger(guests) || guests < 1) return 0;
  return priceFromUgx * guests;
}

export interface BookingEstimate {
  nights: number;
  nightlyRateUgx: number;
  accommodationSubtotalUgx: number;
  experiencesSubtotalUgx: number;
  estimatedTotalUgx: number;
  /** True when at least one selected experience has no published price. */
  hasUnpricedExperiences: boolean;
}

/**
 * The authoritative estimate.
 *
 * The server calls this with the nightly rate loaded from the database and
 * ignores whatever total the browser sent. All UGX, all whole shillings, all
 * integer arithmetic — no float ever touches a money value.
 */
export function calculateBookingEstimate(args: {
  nightlyRateUgx: number;
  checkIn: string | null;
  checkOut: string | null;
  experiences: PricedExperience[];
}): BookingEstimate {
  const nights = nightsBetween(args.checkIn, args.checkOut);
  const nightlyRateUgx = args.nightlyRateUgx > 0 ? Math.trunc(args.nightlyRateUgx) : 0;
  const accommodationSubtotalUgx = nights * nightlyRateUgx;

  let experiencesSubtotalUgx = 0;
  let hasUnpricedExperiences = false;
  for (const experience of args.experiences) {
    if (experience.priceFromUgx === null) hasUnpricedExperiences = true;
    experiencesSubtotalUgx += experienceLineTotal(
      experience.priceFromUgx,
      experience.guests,
    );
  }

  return {
    nights,
    nightlyRateUgx,
    accommodationSubtotalUgx,
    experiencesSubtotalUgx,
    estimatedTotalUgx: accommodationSubtotalUgx + experiencesSubtotalUgx,
    hasUnpricedExperiences,
  };
}

// ---------------------------------------------------------------------------
// Booking reference
// ---------------------------------------------------------------------------

/**
 * Crockford's alphabet without I, L, O and U: nothing that can be misread as a
 * digit over a phone line, and no accidental words.
 *
 * 32 characters divides 256 exactly, so `byte % 32` is uniform — no modulo bias
 * and no rejection sampling needed.
 */
const REFERENCE_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
const REFERENCE_RANDOM_LENGTH = 6;

export const BOOKING_REFERENCE_PATTERN =
  /^PT-\d{4}-[0-9ABCDEFGHJKMNPQRSTVWXYZ]{6}$/;

/**
 * `PT-2026-K4M8XQ`.
 *
 * `crypto.getRandomValues`, not `Math.random`: this string is the only thing
 * guarding a page that shows someone's name, email and phone number. Available
 * in Workers, Node 18+ and every browser.
 *
 * Uniqueness is *enforced* by the `bookings_reference_key` unique index, not by
 * this function — 30 bits makes a collision vanishingly rare, and the database
 * makes it impossible. See docs/decisions/003.
 */
export function generateBookingReference(now: Date = new Date()): string {
  const bytes = new Uint8Array(REFERENCE_RANDOM_LENGTH);
  crypto.getRandomValues(bytes);

  let random = "";
  for (const byte of bytes) random += REFERENCE_ALPHABET[byte % REFERENCE_ALPHABET.length];

  return `PT-${now.getUTCFullYear()}-${random}`;
}

/**
 * Normalises a reference from a URL and rejects anything malformed, so a bad
 * path segment becomes a 404 rather than a database round trip.
 */
export function parseBookingReference(raw: string | null | undefined): string | null {
  if (typeof raw !== "string") return null;
  const normalised = raw.trim().toUpperCase();
  return BOOKING_REFERENCE_PATTERN.test(normalised) ? normalised : null;
}

// ---------------------------------------------------------------------------
// Display masking
// ---------------------------------------------------------------------------

/**
 * The confirmation page is reachable by anyone holding the reference, so
 * contact details are masked: enough for the traveller to recognise their own,
 * not enough for anyone else to use them.
 */
export function maskEmail(email: string): string {
  const at = email.lastIndexOf("@");
  if (at < 1) return "•••";
  const local = email.slice(0, at);
  const domain = email.slice(at);
  const head = local.slice(0, 1);
  return `${head}${"•".repeat(Math.max(local.length - 1, 2))}${domain}`;
}

export function maskPhone(phone: string): string {
  if (phone.length <= 4) return "•••";
  const tail = phone.slice(-3);
  const head = phone.slice(0, Math.min(4, phone.length - 3));
  return `${head}${"•".repeat(Math.max(phone.length - head.length - 3, 2))}${tail}`;
}
