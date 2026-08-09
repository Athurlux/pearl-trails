import { describe, expect, it } from "vitest";
import {
  MAX_PRICE,
  buildStaysQuery,
  hasActiveFilters,
  parseStaysParams,
  staysHref,
} from "./stays-params";

/**
 * These parameters reach a database query, so the tests that matter are the
 * hostile ones: what happens when the URL is wrong, absurd, or malicious.
 */
describe("parseStaysParams", () => {
  it("defaults everything when the query string is empty", () => {
    const p = parseStaysParams({});
    expect(p).toMatchObject({
      q: null,
      destination: null,
      types: [],
      amenities: [],
      minPrice: null,
      maxPrice: null,
      guests: null,
      minRating: null,
      sort: "recommended",
      page: 1,
      checkIn: null,
      checkOut: null,
    });
  });

  it("keeps only known stay types and drops invented ones", () => {
    const p = parseStaysParams({ type: "eco-lodge,not-a-type,campsite" });
    expect(p.types).toEqual(["eco-lodge", "campsite"]);
  });

  it("accepts repeated params as well as comma lists, deduped", () => {
    const p = parseStaysParams({ type: ["eco-lodge", "eco-lodge,campsite"] });
    expect(p.types).toEqual(["eco-lodge", "campsite"]);
  });

  it("clamps absurd prices instead of passing them through", () => {
    const p = parseStaysParams({ minPrice: "999999999", maxPrice: "999999999" });
    expect(p.minPrice).toBe(MAX_PRICE);
    expect(p.maxPrice).toBe(MAX_PRICE);
  });

  it("swaps a reversed price range rather than returning nothing", () => {
    const p = parseStaysParams({ minPrice: "900000", maxPrice: "100000" });
    expect(p.minPrice).toBe(100000);
    expect(p.maxPrice).toBe(900000);
  });

  it("clamps page and guests to their bounds", () => {
    expect(parseStaysParams({ page: "9999" }).page).toBe(50);
    expect(parseStaysParams({ page: "0" }).page).toBe(1);
    expect(parseStaysParams({ guests: "500" }).guests).toBe(16);
  });

  it("falls back to page 1 for non-numeric page values", () => {
    expect(parseStaysParams({ page: "abc" }).page).toBe(1);
    expect(parseStaysParams({ page: "-3" }).page).toBe(1);
  });

  it("rejects a destination slug containing SQL punctuation", () => {
    expect(parseStaysParams({ destination: "bwindi'; DROP TABLE stays;--" }).destination)
      .toBeNull();
    expect(parseStaysParams({ destination: "bwindi" }).destination).toBe("bwindi");
  });

  it("truncates an over-long search query", () => {
    const p = parseStaysParams({ q: "x".repeat(500) });
    expect(p.q).toHaveLength(80);
  });

  it("ignores an unknown sort mode", () => {
    expect(parseStaysParams({ sort: "cheapest-ever" }).sort).toBe("recommended");
    expect(parseStaysParams({ sort: "price-desc" }).sort).toBe("price-desc");
  });

  it("rejects impossible calendar dates", () => {
    expect(parseStaysParams({ checkIn: "2026-02-31" }).checkIn).toBeNull();
    expect(parseStaysParams({ checkIn: "not-a-date" }).checkIn).toBeNull();
    expect(parseStaysParams({ checkIn: "2026-09-12" }).checkIn).toBe("2026-09-12");
  });

  it("drops a checkout that is not after the checkin", () => {
    const p = parseStaysParams({ checkIn: "2026-09-12", checkOut: "2026-09-10" });
    expect(p.checkIn).toBe("2026-09-12");
    expect(p.checkOut).toBeNull();
  });

  it("bounds the number of amenities a single request can ask for", () => {
    const many = Array.from({ length: 40 }, (_, i) => `amenity-${i}`).join(",");
    expect(parseStaysParams({ amenity: many }).amenities.length).toBeLessThanOrEqual(12);
  });
});

describe("buildStaysQuery", () => {
  it("omits defaults so shared links stay short", () => {
    expect(buildStaysQuery(parseStaysParams({}))).toBe("");
    expect(buildStaysQuery(parseStaysParams({ sort: "recommended", page: "1" }))).toBe("");
  });

  it("round-trips a full search", () => {
    const original = parseStaysParams({
      destination: "bwindi",
      type: "eco-lodge,cabin",
      maxPrice: "600000",
      guests: "2",
      sort: "price-asc",
      page: "2",
      checkIn: "2026-09-12",
      checkOut: "2026-09-15",
    });
    const qs = buildStaysQuery(original);
    const reparsed = parseStaysParams(
      Object.fromEntries(new URLSearchParams(qs).entries()),
    );
    expect(reparsed).toEqual(original);
  });

  it("resets to page 1 when an override says so", () => {
    const p = parseStaysParams({ page: "4", destination: "jinja" });
    expect(staysHref(p, { page: 1 })).toBe("/stays?destination=jinja");
  });
});

describe("hasActiveFilters", () => {
  it("does not count sort or pagination as filters", () => {
    expect(hasActiveFilters(parseStaysParams({ sort: "rating", page: "3" }))).toBe(false);
  });

  it("counts anything that narrows results", () => {
    expect(hasActiveFilters(parseStaysParams({ destination: "bwindi" }))).toBe(true);
    expect(hasActiveFilters(parseStaysParams({ q: "lodge" }))).toBe(true);
    expect(hasActiveFilters(parseStaysParams({ amenity: "pool" }))).toBe(true);
  });
});
