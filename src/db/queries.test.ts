import { config } from "dotenv";
import { beforeAll, describe, expect, it } from "vitest";
import { parseStaysParams } from "@/lib/stays-params";
import {
  countStaysByType,
  findStayBySlug,
  findStays,
  listAmenities,
  listDestinations,
} from "@/lib/stays-query";

config({ path: ".env.local", quiet: true });

/**
 * Integration tests against the real Neon branch.
 *
 * They assert relationships rather than exact numbers wherever possible, so
 * adding a stay to the seed does not break the suite — but filtering, sorting
 * and pagination must genuinely narrow, order and slice the result set.
 *
 * Skipped when DATABASE_URL is absent so a fresh clone can still run `npm test`.
 */
const hasDb = Boolean(process.env.DATABASE_URL);
const suite = hasDb ? describe : describe.skip;

suite("stays queries", () => {
  let total = 0;

  beforeAll(async () => {
    const all = await findStays(parseStaysParams({}));
    total = all.total;
  });

  it("connects and returns a seeded catalogue", () => {
    expect(total).toBeGreaterThanOrEqual(18);
  });

  it("seeds every destination and amenity", async () => {
    const [destinations, amenities] = await Promise.all([
      listDestinations(),
      listAmenities(),
    ]);
    expect(destinations.length).toBe(8);
    expect(amenities.length).toBe(12);
    expect(destinations.map((d) => d.slug)).toContain("bwindi");
  });

  it("filters by destination", async () => {
    const page = await findStays(parseStaysParams({ destination: "bwindi" }));
    expect(page.total).toBeGreaterThan(0);
    expect(page.total).toBeLessThan(total);
    expect(page.results.every((s) => s.destinationSlug === "bwindi")).toBe(true);
  });

  it("filters by stay type", async () => {
    const page = await findStays(parseStaysParams({ type: "campsite" }));
    expect(page.total).toBeGreaterThan(0);
    expect(page.results.every((s) => s.stayType === "campsite")).toBe(true);
  });

  it("filters by maximum price", async () => {
    const page = await findStays(parseStaysParams({ maxPrice: "400000" }));
    expect(page.total).toBeGreaterThan(0);
    expect(page.results.every((s) => s.priceFromUgx <= 400000)).toBe(true);
  });

  it("filters by guest capacity", async () => {
    const page = await findStays(parseStaysParams({ guests: "8" }));
    expect(page.results.every((s) => s.maxGuests >= 8)).toBe(true);
  });

  it("filters by minimum rating", async () => {
    const page = await findStays(parseStaysParams({ minRating: "4.5" }));
    expect(page.total).toBeGreaterThan(0);
    expect(page.results.every((s) => s.rating >= 4.5)).toBe(true);
  });

  it("combines filters conjunctively", async () => {
    const params = parseStaysParams({
      destination: "queen-elizabeth",
      type: "safari-lodge",
      maxPrice: "900000",
    });
    const page = await findStays(params);
    expect(
      page.results.every(
        (s) =>
          s.destinationSlug === "queen-elizabeth" &&
          s.stayType === "safari-lodge" &&
          s.priceFromUgx <= 900000,
      ),
    ).toBe(true);
  });

  it("treats multiple amenities as AND, not OR", async () => {
    const both = await findStays(parseStaysParams({ amenity: "pool,wifi" }));
    const poolOnly = await findStays(parseStaysParams({ amenity: "pool" }));
    expect(both.total).toBeLessThanOrEqual(poolOnly.total);
    expect(both.results.every((s) => s.amenities.includes("Pool"))).toBe(true);
  });

  it("finds stays by name through search", async () => {
    const page = await findStays(parseStaysParams({ q: "Kidepo Plains" }));
    expect(page.results[0]?.slug).toBe("kidepo-plains-camp");
  });

  it("finds stays by a partial word the tokenizer would miss", async () => {
    const page = await findStays(parseStaysParams({ q: "Bunyo" }));
    expect(page.total).toBeGreaterThan(0);
  });

  it("returns an empty page rather than throwing for nonsense queries", async () => {
    const page = await findStays(parseStaysParams({ q: "zzzzqqqx" }));
    expect(page.total).toBe(0);
    expect(page.results).toEqual([]);
  });

  it("sorts by price ascending and descending", async () => {
    const asc = await findStays(parseStaysParams({ sort: "price-asc" }));
    const desc = await findStays(parseStaysParams({ sort: "price-desc" }));
    const ascPrices = asc.results.map((s) => s.priceFromUgx);
    const descPrices = desc.results.map((s) => s.priceFromUgx);
    expect([...ascPrices].sort((a, b) => a - b)).toEqual(ascPrices);
    expect([...descPrices].sort((a, b) => b - a)).toEqual(descPrices);
    expect(ascPrices[0]).toBeLessThan(descPrices[0]);
  });

  it("sorts by rating", async () => {
    const page = await findStays(parseStaysParams({ sort: "rating" }));
    const ratings = page.results.map((s) => s.rating);
    expect([...ratings].sort((a, b) => b - a)).toEqual(ratings);
  });

  it("paginates without repeating or dropping rows", async () => {
    const one = await findStays(parseStaysParams({ page: "1", sort: "price-asc" }));
    const two = await findStays(parseStaysParams({ page: "2", sort: "price-asc" }));
    expect(one.results).toHaveLength(9);
    expect(one.pageCount).toBe(Math.ceil(total / 9));
    const overlap = one.results.filter((a) => two.results.some((b) => b.id === a.id));
    expect(overlap).toEqual([]);
  });

  it("returns an empty page past the end instead of failing", async () => {
    const page = await findStays(parseStaysParams({ page: "50" }));
    expect(page.results).toEqual([]);
    expect(page.total).toBe(total);
  });

  it("attaches amenities without an extra query per card", async () => {
    const page = await findStays(parseStaysParams({}));
    expect(page.results.every((s) => Array.isArray(s.amenities))).toBe(true);
    expect(page.results.some((s) => s.amenities.length > 0)).toBe(true);
  });

  it("counts every stay type", async () => {
    const counts = await countStaysByType();
    const sum = Object.values(counts).reduce((a, b) => a + b, 0);
    expect(sum).toBe(total);
  });

  it("looks up a single stay by slug, and returns null for an unknown one", async () => {
    const stay = await findStayBySlug("forest-canopy-lodge");
    expect(stay?.name).toBe("Forest Canopy Lodge");
    expect(await findStayBySlug("no-such-stay")).toBeNull();
  });
});
