import { describe, expect, it } from "vitest";
import {
  MAX_TRIP_NIGHTS,
  estimateStay,
  formatDateRange,
  nightsBetween,
  parseIsoDate,
  parseTripContext,
  stayHref,
} from "./trip-params";

describe("parseIsoDate", () => {
  it("accepts a real calendar date", () => {
    expect(parseIsoDate("2026-09-12")).toBe("2026-09-12");
  });

  it("rejects impossible and malformed dates", () => {
    expect(parseIsoDate("2026-02-31")).toBeNull();
    expect(parseIsoDate("2026-13-01")).toBeNull();
    expect(parseIsoDate("12/09/2026")).toBeNull();
    expect(parseIsoDate("")).toBeNull();
    expect(parseIsoDate(null)).toBeNull();
  });
});

describe("nightsBetween", () => {
  it("counts whole nights", () => {
    expect(nightsBetween("2026-09-12", "2026-09-15")).toBe(3);
    expect(nightsBetween("2026-09-12", "2026-09-13")).toBe(1);
  });

  it("counts across a month boundary", () => {
    expect(nightsBetween("2026-09-28", "2026-10-02")).toBe(4);
  });

  it("is unaffected by daylight saving in the running environment", () => {
    // Parsed as UTC calendar dates, so a server in any timezone agrees.
    expect(nightsBetween("2026-03-28", "2026-03-30")).toBe(2);
    expect(nightsBetween("2026-10-24", "2026-10-26")).toBe(2);
  });

  it("returns zero for reversed, equal or incomplete ranges", () => {
    expect(nightsBetween("2026-09-15", "2026-09-12")).toBe(0);
    expect(nightsBetween("2026-09-12", "2026-09-12")).toBe(0);
    expect(nightsBetween("2026-09-12", null)).toBe(0);
    expect(nightsBetween(null, null)).toBe(0);
  });
});

describe("parseTripContext", () => {
  it("defaults to an empty trip", () => {
    expect(parseTripContext({})).toEqual({
      checkIn: null,
      checkOut: null,
      guests: null,
      option: null,
    });
  });

  it("keeps a valid trip intact", () => {
    expect(
      parseTripContext({
        checkIn: "2026-09-12",
        checkOut: "2026-09-15",
        guests: "2",
        option: "forest-suite",
      }),
    ).toEqual({
      checkIn: "2026-09-12",
      checkOut: "2026-09-15",
      guests: 2,
      option: "forest-suite",
    });
  });

  it("drops a checkout that is not after the checkin", () => {
    expect(parseTripContext({ checkIn: "2026-09-12", checkOut: "2026-09-12" }).checkOut)
      .toBeNull();
    expect(parseTripContext({ checkIn: "2026-09-12", checkOut: "2026-09-10" }).checkOut)
      .toBeNull();
  });

  it("drops a checkout with no checkin to anchor it", () => {
    expect(parseTripContext({ checkOut: "2026-09-15" }).checkOut).toBeNull();
  });

  it("rejects an absurdly long stay", () => {
    const trip = parseTripContext({ checkIn: "2026-01-01", checkOut: "2027-01-01" });
    expect(trip.checkOut).toBeNull();
    expect(nightsBetween("2026-01-01", "2026-01-31")).toBeLessThanOrEqual(MAX_TRIP_NIGHTS);
  });

  it("clamps guests and rejects nonsense", () => {
    expect(parseTripContext({ guests: "500" }).guests).toBe(16);
    expect(parseTripContext({ guests: "0" }).guests).toBe(1);
    expect(parseTripContext({ guests: "-2" }).guests).toBeNull();
    expect(parseTripContext({ guests: "two" }).guests).toBeNull();
  });

  it("rejects an option slug carrying punctuation", () => {
    expect(parseTripContext({ option: "forest-suite'; DROP TABLE stays;--" }).option)
      .toBeNull();
    expect(parseTripContext({ option: "forest-suite" }).option).toBe("forest-suite");
  });
});

describe("estimateStay", () => {
  it("multiplies nightly rate by nights", () => {
    const e = estimateStay(480000, "2026-09-12", "2026-09-15");
    expect(e.nights).toBe(3);
    expect(e.subtotalUgx).toBe(1440000);
    expect(e.complete).toBe(true);
  });

  it("is incomplete without a full date range", () => {
    expect(estimateStay(480000, "2026-09-12", null).complete).toBe(false);
    expect(estimateStay(480000, "2026-09-12", null).subtotalUgx).toBe(0);
  });

  it("is incomplete without a usable rate", () => {
    expect(estimateStay(0, "2026-09-12", "2026-09-15").complete).toBe(false);
    expect(estimateStay(null, "2026-09-12", "2026-09-15").complete).toBe(false);
  });

  it("adds no taxes or fees the database does not model", () => {
    const e = estimateStay(100000, "2026-09-12", "2026-09-14");
    expect(e.subtotalUgx).toBe(200000);
  });
});

describe("formatDateRange", () => {
  // en-GB abbreviates September as "Sept"; the rest are three letters.
  it("collapses a range inside one month", () => {
    expect(formatDateRange("2026-09-12", "2026-09-15")).toBe("12 – 15 Sept 2026");
    expect(formatDateRange("2026-11-02", "2026-11-06")).toBe("2 – 6 Nov 2026");
  });

  it("spells out both months across a boundary", () => {
    expect(formatDateRange("2026-09-28", "2026-10-02")).toBe("28 Sept – 2 Oct 2026");
  });

  it("shows both years across a new year", () => {
    expect(formatDateRange("2026-12-30", "2027-01-02")).toBe(
      "30 Dec 2026 – 2 Jan 2027",
    );
  });

  it("shows a single date and nothing at all when appropriate", () => {
    expect(formatDateRange("2026-09-12", null)).toBe("12 Sept 2026");
    expect(formatDateRange(null, null)).toBeNull();
  });
});

describe("stayHref", () => {
  it("omits empty trip context", () => {
    expect(stayHref("forest-canopy-lodge")).toBe("/stays/forest-canopy-lodge");
  });

  it("carries trip context forward", () => {
    expect(
      stayHref("forest-canopy-lodge", {
        checkIn: "2026-09-12",
        checkOut: "2026-09-15",
        guests: 2,
        option: "forest-suite",
      }),
    ).toBe(
      "/stays/forest-canopy-lodge?checkIn=2026-09-12&checkOut=2026-09-15&guests=2&option=forest-suite",
    );
  });
});
