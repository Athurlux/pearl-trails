import { describe, expect, it } from "vitest";
import {
  BOOKING_REFERENCE_PATTERN,
  COUNTRIES,
  MAX_SPECIAL_REQUESTS,
  addDays,
  calculateBookingEstimate,
  chooseInitialOption,
  daysBetween,
  experienceLineTotal,
  generateBookingReference,
  maskEmail,
  maskPhone,
  nightsBetween,
  parseBookingReference,
  todayInUganda,
  validateOptionChoice,
  validateTraveller,
  validateTrip,
} from "./booking-rules";

/**
 * Pure booking rules — no database, no clock.
 *
 * Everything time-dependent takes an injected "today", so these assert real
 * behaviour rather than passing until the calendar moves.
 */

const TODAY = "2026-08-10";
const traveller = {
  fullName: "Amina Nakato",
  email: "amina@example.com",
  phoneCode: "+256",
  phoneNumber: "0772123456",
  country: "Uganda",
  specialRequests: "",
};

describe("calendar arithmetic", () => {
  it("counts whole nights between calendar dates", () => {
    expect(nightsBetween("2026-09-12", "2026-09-15")).toBe(3);
    expect(nightsBetween("2026-09-12", "2026-09-13")).toBe(1);
  });

  it("counts zero nights for an invalid or reversed range", () => {
    expect(nightsBetween("2026-09-15", "2026-09-12")).toBe(0);
    expect(nightsBetween("2026-09-12", "2026-09-12")).toBe(0);
    expect(nightsBetween(null, "2026-09-12")).toBe(0);
    expect(nightsBetween("2026-02-31", "2026-03-02")).toBe(0);
  });

  it("crosses month and year boundaries without drifting", () => {
    expect(nightsBetween("2026-08-30", "2026-09-02")).toBe(3);
    expect(nightsBetween("2026-12-30", "2027-01-02")).toBe(3);
    // 2028 is a leap year: Feb has 29 days.
    expect(nightsBetween("2028-02-27", "2028-03-01")).toBe(3);
  });

  it("adds days and measures gaps symmetrically", () => {
    expect(addDays("2026-08-30", 3)).toBe("2026-09-02");
    expect(daysBetween("2026-08-10", "2026-08-13")).toBe(3);
    expect(daysBetween("2026-08-13", "2026-08-10")).toBe(-3);
  });

  it("reads today in Uganda, not in UTC", () => {
    // Uganda is UTC+3. At 22:00 UTC it is already tomorrow in Kampala, and a
    // Worker running in UTC must not reject that date as being in the past.
    expect(todayInUganda(new Date("2026-08-10T22:00:00Z"))).toBe("2026-08-11");
    expect(todayInUganda(new Date("2026-08-10T20:59:00Z"))).toBe("2026-08-10");
    expect(todayInUganda(new Date("2026-08-10T00:30:00Z"))).toBe("2026-08-10");
  });
});

describe("validateTrip", () => {
  const rules = { capacity: 4, today: TODAY };

  it("accepts a well-formed trip", () => {
    const errors = validateTrip(
      { checkIn: "2026-09-12", checkOut: "2026-09-15", guests: 2 },
      rules,
    );
    expect(errors).toEqual({});
  });

  it("accepts a check-in today", () => {
    const errors = validateTrip(
      { checkIn: TODAY, checkOut: addDays(TODAY, 2), guests: 2 },
      rules,
    );
    expect(errors.checkIn).toBeUndefined();
  });

  it("rejects a check-in in the past", () => {
    const errors = validateTrip(
      { checkIn: addDays(TODAY, -1), checkOut: addDays(TODAY, 2), guests: 2 },
      rules,
    );
    expect(errors.checkIn).toBeDefined();
  });

  it("rejects a check-in beyond the booking horizon", () => {
    expect(
      validateTrip(
        { checkIn: addDays(TODAY, 540), checkOut: addDays(TODAY, 542), guests: 2 },
        rules,
      ).checkIn,
    ).toBeUndefined();

    expect(
      validateTrip(
        { checkIn: addDays(TODAY, 541), checkOut: addDays(TODAY, 543), guests: 2 },
        rules,
      ).checkIn,
    ).toBeDefined();
  });

  it("rejects a check-out on or before check-in", () => {
    expect(
      validateTrip({ checkIn: "2026-09-12", checkOut: "2026-09-12", guests: 2 }, rules)
        .checkOut,
    ).toBeDefined();
    expect(
      validateTrip({ checkIn: "2026-09-12", checkOut: "2026-09-10", guests: 2 }, rules)
        .checkOut,
    ).toBeDefined();
  });

  it("rejects a stay longer than the maximum", () => {
    expect(
      validateTrip({ checkIn: "2026-09-01", checkOut: "2026-10-01", guests: 2 }, rules)
        .checkOut,
    ).toBeUndefined();
    expect(
      validateTrip({ checkIn: "2026-09-01", checkOut: "2026-10-02", guests: 2 }, rules)
        .checkOut,
    ).toBeDefined();
  });

  it("rejects a party larger than the accommodation capacity", () => {
    const errors = validateTrip(
      { checkIn: "2026-09-12", checkOut: "2026-09-15", guests: 5 },
      rules,
    );
    expect(errors.guests).toContain("4");
  });

  it("distinguishes a missing guest count from zero", () => {
    expect(
      validateTrip({ checkIn: "2026-09-12", checkOut: "2026-09-15", guests: null }, rules)
        .guests,
    ).toBe("Tell us how many guests are travelling.");
    expect(
      validateTrip({ checkIn: "2026-09-12", checkOut: "2026-09-15", guests: 0 }, rules)
        .guests,
    ).toBe("Enter at least one guest.");
  });

  it("reports every problem at once rather than only the first", () => {
    const errors = validateTrip({ checkIn: null, checkOut: null, guests: null }, rules);
    expect(Object.keys(errors).sort()).toEqual(["checkIn", "checkOut", "guests"]);
  });
});

describe("validateTraveller", () => {
  it("normalises name, email and phone", () => {
    const { errors, values } = validateTraveller({
      ...traveller,
      fullName: "  Amina    Nakato  ",
      email: "  AMINA@Example.COM  ",
      phoneNumber: " (0772) 123-456 ",
      specialRequests: "  Arriving late.  ",
    });

    expect(errors).toEqual({});
    expect(values!.guestName).toBe("Amina Nakato");
    expect(values!.guestEmail).toBe("amina@example.com");
    expect(values!.guestPhone).toBe("+256772123456");
    expect(values!.specialRequests).toBe("Arriving late.");
  });

  it("treats an empty special request as absent, not as an empty string", () => {
    const { values } = validateTraveller({ ...traveller, specialRequests: "   " });
    expect(values!.specialRequests).toBeNull();
  });

  it("accepts a number with or without the trunk zero", () => {
    const withZero = validateTraveller({ ...traveller, phoneNumber: "0772123456" });
    const without = validateTraveller({ ...traveller, phoneNumber: "772123456" });
    expect(withZero.values!.guestPhone).toBe(without.values!.guestPhone);
  });

  it("accepts legitimate email shapes", () => {
    for (const email of [
      "a@b.co",
      "first.last@example.co.ug",
      "user+tag@example.org",
      "o'brien@example.com",
      "someone@a-very-new-tld.travel",
    ]) {
      expect(validateTraveller({ ...traveller, email }).errors.email).toBeUndefined();
    }
  });

  it("rejects malformed emails", () => {
    for (const email of ["", "not-an-email", "no@domain", "two@@at.com", "sp ace@x.com"]) {
      expect(validateTraveller({ ...traveller, email }).errors.email).toBeDefined();
    }
  });

  it("rejects an unusable phone number", () => {
    expect(
      validateTraveller({ ...traveller, phoneNumber: "" }).errors.phoneNumber,
    ).toBeDefined();
    expect(
      validateTraveller({ ...traveller, phoneNumber: "12345" }).errors.phoneNumber,
    ).toBeDefined();
    expect(
      validateTraveller({ ...traveller, phoneNumber: "abcdefgh" }).errors.phoneNumber,
    ).toBeDefined();
  });

  it("rejects a dialling code that is not offered", () => {
    expect(
      validateTraveller({ ...traveller, phoneCode: "+999" }).errors.phoneCode,
    ).toBeDefined();
  });

  it("validates country against the offered list", () => {
    expect(validateTraveller({ ...traveller, country: "Kenya" }).errors.country)
      .toBeUndefined();
    expect(validateTraveller({ ...traveller, country: "Atlantis" }).errors.country)
      .toBeDefined();
    expect(validateTraveller({ ...traveller, country: "" }).errors.country).toBeDefined();
    expect(COUNTRIES).toContain("Uganda");
  });

  it("bounds free text", () => {
    const ok = validateTraveller({
      ...traveller,
      specialRequests: "x".repeat(MAX_SPECIAL_REQUESTS),
    });
    expect(ok.errors.specialRequests).toBeUndefined();

    const tooLong = validateTraveller({
      ...traveller,
      specialRequests: "x".repeat(MAX_SPECIAL_REQUESTS + 1),
    });
    expect(tooLong.errors.specialRequests).toBeDefined();
  });

  it("returns no values at all when anything is invalid", () => {
    const { values } = validateTraveller({ ...traveller, email: "nope" });
    expect(values).toBeNull();
  });
});

describe("pricing", () => {
  it("multiplies nights by the nightly rate", () => {
    const estimate = calculateBookingEstimate({
      nightlyRateUgx: 480_000,
      checkIn: "2026-09-12",
      checkOut: "2026-09-15",
      experiences: [],
    });
    expect(estimate.nights).toBe(3);
    expect(estimate.accommodationSubtotalUgx).toBe(1_440_000);
    expect(estimate.estimatedTotalUgx).toBe(1_440_000);
  });

  it("prices experiences per guest and sums them into the total", () => {
    const estimate = calculateBookingEstimate({
      nightlyRateUgx: 480_000,
      checkIn: "2026-09-12",
      checkOut: "2026-09-15",
      experiences: [
        { priceFromUgx: 350_000, guests: 2 },
        { priceFromUgx: 120_000, guests: 2 },
      ],
    });
    expect(estimate.experiencesSubtotalUgx).toBe(940_000);
    expect(estimate.estimatedTotalUgx).toBe(1_440_000 + 940_000);
    expect(estimate.hasUnpricedExperiences).toBe(false);
  });

  it("contributes nothing for an experience with no published price", () => {
    const estimate = calculateBookingEstimate({
      nightlyRateUgx: 100_000,
      checkIn: "2026-09-12",
      checkOut: "2026-09-13",
      experiences: [{ priceFromUgx: null, guests: 4 }],
    });
    expect(estimate.experiencesSubtotalUgx).toBe(0);
    expect(estimate.hasUnpricedExperiences).toBe(true);
    // Flagged rather than invented — the UI says "on request", not "free".
    expect(estimate.estimatedTotalUgx).toBe(100_000);
  });

  it("yields zero for an incomplete trip instead of a partial number", () => {
    const estimate = calculateBookingEstimate({
      nightlyRateUgx: 480_000,
      checkIn: "2026-09-12",
      checkOut: null,
      experiences: [{ priceFromUgx: 350_000, guests: 2 }],
    });
    expect(estimate.nights).toBe(0);
    expect(estimate.accommodationSubtotalUgx).toBe(0);
  });

  it("keeps the total equal to the sum of its parts", () => {
    // The same invariant the `bookings_total_matches_parts` check enforces.
    for (const guests of [1, 2, 5]) {
      const estimate = calculateBookingEstimate({
        nightlyRateUgx: 333_333,
        checkIn: "2026-09-12",
        checkOut: "2026-09-19",
        experiences: [{ priceFromUgx: 77_777, guests }],
      });
      expect(estimate.estimatedTotalUgx).toBe(
        estimate.accommodationSubtotalUgx + estimate.experiencesSubtotalUgx,
      );
      expect(Number.isInteger(estimate.estimatedTotalUgx)).toBe(true);
    }
  });

  it("ignores nonsense experience quantities", () => {
    expect(experienceLineTotal(100_000, 0)).toBe(0);
    expect(experienceLineTotal(100_000, -3)).toBe(0);
    expect(experienceLineTotal(100_000, 1.5)).toBe(0);
    expect(experienceLineTotal(null, 3)).toBe(0);
  });
});

describe("booking reference", () => {
  it("matches the published format", () => {
    const reference = generateBookingReference(new Date("2026-08-10T00:00:00Z"));
    expect(reference).toMatch(BOOKING_REFERENCE_PATTERN);
    expect(reference.startsWith("PT-2026-")).toBe(true);
  });

  it("never uses characters that can be misread", () => {
    // I, L, O and U are excluded so a reference read over the phone is
    // unambiguous and cannot spell anything.
    const references = Array.from({ length: 400 }, () => generateBookingReference());
    for (const reference of references) {
      expect(reference.slice(8)).not.toMatch(/[ILOU]/);
    }
  });

  it("does not repeat itself across a large batch", () => {
    const references = new Set(
      Array.from({ length: 2000 }, () => generateBookingReference()),
    );
    // Uniqueness is *guaranteed* by the database index, not by this — but a
    // generator producing collisions at this scale would be broken.
    expect(references.size).toBeGreaterThan(1990);
  });

  it("uses the whole alphabet rather than a biased subset", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 3000; i += 1) {
      for (const character of generateBookingReference().slice(8)) seen.add(character);
    }
    expect(seen.size).toBe(32);
  });

  it("normalises a reference from a URL and rejects junk", () => {
    expect(parseBookingReference("pt-2026-k4m8xq")).toBe("PT-2026-K4M8XQ");
    expect(parseBookingReference("  PT-2026-K4M8XQ  ")).toBe("PT-2026-K4M8XQ");

    for (const bad of [
      null,
      "",
      "PT-2026",
      "PT-2026-TOOLONG1",
      "PT-2026-K4M8X",
      "XX-2026-K4M8XQ",
      "PT-2026-K4M8XI",
      "'; DROP TABLE bookings; --",
    ]) {
      expect(parseBookingReference(bad)).toBeNull();
    }
  });
});

describe("masking on the confirmation page", () => {
  it("leaves an email recognisable but not usable", () => {
    const masked = maskEmail("amina@example.com");
    expect(masked.startsWith("a")).toBe(true);
    expect(masked.endsWith("@example.com")).toBe(true);
    expect(masked).not.toContain("amina@");
  });

  it("keeps a phone number identifiable by its last digits only", () => {
    const masked = maskPhone("+256772123456");
    expect(masked.endsWith("456")).toBe(true);
    expect(masked).not.toContain("772123");
  });

  it("does not fall apart on short or malformed values", () => {
    expect(maskEmail("@")).toBe("•••");
    expect(maskEmail("a@b.co")).toContain("@b.co");
    expect(maskPhone("+256")).toBe("•••");
  });
});

/**
 * Choosing an accommodation.
 *
 * These guard a specific failure seen on the deployed flow: a sold-out option
 * was still the default and still passed step 1, so a traveller could fill in
 * dates, experiences and their personal details before being told at
 * submission that the room was gone. Nothing was ever overbooked — the
 * exclusion constraint held — but the rejection arrived four steps too late.
 */
describe("choosing an accommodation", () => {
  const options = [
    { slug: "forest-suite", available: 0 },
    { slug: "canopy-room", available: 4 },
    { slug: "family-cottage", available: 2 },
  ];

  it("keeps the option the traveller arrived with, even when it is taken", () => {
    // Swapping their choice silently would answer a question they did not ask.
    expect(chooseInitialOption(options, "forest-suite", true)).toBe("forest-suite");
  });

  it("opens on something bookable when nothing was pre-selected", () => {
    expect(chooseInitialOption(options, null, true)).toBe("canopy-room");
  });

  it("falls back to the first option when every one is taken", () => {
    const soldOut = options.map((o) => ({ ...o, available: 0 }));
    expect(chooseInitialOption(soldOut, null, true)).toBe("forest-suite");
  });

  it("ignores availability before dates are chosen", () => {
    // Without dates there is nothing to be available for, so the listed order
    // is the only meaningful one.
    expect(chooseInitialOption(options, null, false)).toBe("forest-suite");
  });

  it("ignores an option slug that does not belong to this property", () => {
    expect(chooseInitialOption(options, "somebody-elses-suite", true)).toBe("canopy-room");
  });

  it("blocks the step when the chosen accommodation is taken for those dates", () => {
    const errors = validateOptionChoice({ slug: "forest-suite", available: 0 }, true);
    expect(errors.option).toMatch(/taken for your dates/i);
  });

  it("allows an accommodation with a unit free", () => {
    expect(validateOptionChoice({ slug: "canopy-room", available: 1 }, true)).toEqual({});
  });

  it("does not judge availability before dates exist", () => {
    expect(validateOptionChoice({ slug: "forest-suite", available: 0 }, false)).toEqual({});
  });

  it("requires an accommodation at all", () => {
    expect(validateOptionChoice(null, true).option).toMatch(/choose an accommodation/i);
  });
});
