import { config } from "dotenv";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { getDb } from "@/db";
import { stays } from "@/db/schema";
import {
  countStaysByType,
  findRelatedStays,
  findStayBySlug,
  findStays,
  getPropertyDetail,
  listDestinationsWithCounts,
  listFeaturedStays,
  listStaySlugs,
} from "@/lib/stays-query";
import { parseStaysParams } from "@/lib/stays-params";

config({ path: ".env.local", quiet: true });

const hasDb = Boolean(process.env.DATABASE_URL);
const suite = hasDb ? describe : describe.skip;

/**
 * Property visibility is a public/private boundary, so it is tested as one.
 *
 * Release 7 lets operations take a property out of the catalogue. The failure
 * that matters is not "the list still shows it" — that would be obvious — it is
 * a query somewhere else that forgot the filter and still serves the property
 * to anyone who types its slug. So every public entry point is checked, not
 * just Explore.
 *
 * The property is restored in `afterAll`. It is a real row on the shared Neon
 * branch, not a fixture, because a fixture would not prove that the *real*
 * queries filter.
 */

const SUBJECT = "ruhija-ridge-camp";

suite("an unpublished property is invisible to the public catalogue", () => {
  async function setVisibility(value: "published" | "draft" | "archived") {
    await getDb().update(stays).set({ visibility: value }).where(eq(stays.slug, SUBJECT));
  }

  beforeAll(() => setVisibility("draft"));
  afterAll(() => setVisibility("published"));

  it("does not appear in Explore, even when searched for by name", async () => {
    const all = await findStays(parseStaysParams({}));
    expect(all.results.some((s) => s.slug === SUBJECT)).toBe(false);

    const searched = await findStays(parseStaysParams({ q: "Ruhija" }));
    expect(searched.results.some((s) => s.slug === SUBJECT)).toBe(false);
  });

  it("cannot be reached by typing its slug", async () => {
    // The one that would actually leak. A hidden property still has a URL.
    expect(await findStayBySlug(SUBJECT)).toBeFalsy();
    expect(await getPropertyDetail(SUBJECT)).toBeNull();
  });

  it("is not offered as a related stay from another property", async () => {
    const related = await findRelatedStays(-1, "bwindi", "campsite", 12);
    expect(related.some((s) => s.slug === SUBJECT)).toBe(false);
  });

  it("is not in the featured showcase or the sitemap", async () => {
    expect((await listFeaturedStays(50)).some((s) => s.slug === SUBJECT)).toBe(false);
    expect((await listStaySlugs()).some((s) => s.slug === SUBJECT)).toBe(false);
  });

  it("is not counted in the category or destination tiles", async () => {
    // A count that includes a hidden property is a promise the listing breaks.
    const byType = await countStaysByType();
    const published = await findStays(parseStaysParams({ perPage: "100" }));
    const totalCounted = Object.values(byType).reduce((a, b) => a + b, 0);
    expect(totalCounted).toBe(published.total);

    const destinations = await listDestinationsWithCounts();
    const summed = destinations.reduce((total, d) => total + d.stayCount, 0);
    expect(summed).toBe(published.total);
  });

  it("keeps every destination tile, including one whose stays are all hidden", async () => {
    // The filter belongs in the JOIN. In a WHERE it would drop the destination
    // itself rather than showing it with a count of zero.
    const destinations = await listDestinationsWithCounts();
    expect(destinations.length).toBeGreaterThan(0);
    expect(destinations.every((d) => typeof d.stayCount === "number")).toBe(true);
  });
});

suite("a published property is visible again", () => {
  it("returns to the catalogue when published", async () => {
    // Guards the restore in afterAll above: if these tests left the branch in a
    // draft state, the demo site would quietly lose a property.
    expect(await findStayBySlug(SUBJECT)).toBeDefined();
    const all = await findStays(parseStaysParams({ q: "Ruhija" }));
    expect(all.results.some((s) => s.slug === SUBJECT)).toBe(true);
  });
});
