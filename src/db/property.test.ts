import { config } from "dotenv";
import { describe, expect, it } from "vitest";
import {
  findRelatedStays,
  getPropertyDetail,
  listStaySlugs,
} from "@/lib/stays-query";

config({ path: ".env.local", quiet: true });

const hasDb = Boolean(process.env.DATABASE_URL);
const suite = hasDb ? describe : describe.skip;

/**
 * Release 3 property detail against the real database. These assert structure
 * and relationships rather than exact copy, so editing seed prose does not
 * break the suite — but every stay must remain renderable.
 */
suite("property detail", () => {
  it("resolves a known stay with all its sections populated", async () => {
    const stay = await getPropertyDetail("forest-canopy-lodge");
    expect(stay).not.toBeNull();
    expect(stay!.name).toBe("Forest Canopy Lodge");
    expect(stay!.destination.slug).toBe("bwindi");
    expect(stay!.gallery.length).toBeGreaterThanOrEqual(4);
    expect(stay!.amenities.length).toBeGreaterThan(0);
    expect(stay!.options.length).toBeGreaterThan(0);
    expect(stay!.experiences.length).toBeGreaterThan(0);
    expect(stay!.highlights.length).toBeGreaterThan(0);
    expect(stay!.ratingBreakdown).toHaveLength(4);
  });

  it("returns null for an unknown slug rather than throwing", async () => {
    expect(await getPropertyDetail("no-such-stay")).toBeNull();
  });

  it("gives every seeded stay a renderable page", async () => {
    const slugs = await listStaySlugs();
    expect(slugs.length).toBeGreaterThanOrEqual(18);

    const details = await Promise.all(slugs.map((s) => getPropertyDetail(s.slug)));
    for (const [i, detail] of details.entries()) {
      expect(detail, `missing detail for ${slugs[i].slug}`).not.toBeNull();
      expect(detail!.gallery.length, `no gallery for ${slugs[i].slug}`).toBeGreaterThan(0);
      expect(detail!.options.length, `no options for ${slugs[i].slug}`).toBeGreaterThan(0);
      expect(detail!.highlights.length, `no highlights for ${slugs[i].slug}`).toBeGreaterThan(0);
    }
  });

  it("keeps every accommodation option within the property guest capacity story", async () => {
    const slugs = await listStaySlugs();
    const details = await Promise.all(slugs.map((s) => getPropertyDetail(s.slug)));
    for (const detail of details) {
      for (const option of detail!.options) {
        expect(option.guestCapacity).toBeGreaterThan(0);
        expect(option.priceFromUgx).toBeGreaterThan(0);
      }
    }
  });

  it("varies accommodation options rather than templating every property", async () => {
    const camp = await getPropertyDetail("bujagali-rapids-camp");
    const lodge = await getPropertyDetail("paraa-escarpment-lodge");
    expect(camp!.options.map((o) => o.name)).not.toEqual(
      lodge!.options.map((o) => o.name),
    );
    // A campsite pitch must not cost what an escarpment suite costs.
    expect(camp!.options[0].priceFromUgx).toBeLessThan(lodge!.options[0].priceFromUgx);
  });

  it("uses a gallery drawn from the property's own landscape", async () => {
    const bwindi = await getPropertyDetail("forest-canopy-lodge");
    const kidepo = await getPropertyDetail("kidepo-plains-camp");
    const bwindiUrls = bwindi!.gallery.map((g) => g.url).join();
    const kidepoUrls = kidepo!.gallery.map((g) => g.url).join();
    expect(bwindiUrls).not.toBe(kidepoUrls);
  });

  it("finds related stays and never includes the current one", async () => {
    const stay = await getPropertyDetail("forest-canopy-lodge");
    const related = await findRelatedStays(
      stay!.id,
      stay!.destination.slug,
      stay!.stayType,
      3,
    );
    expect(related.length).toBeGreaterThan(0);
    expect(related.length).toBeLessThanOrEqual(3);
    expect(related.some((r) => r.id === stay!.id)).toBe(false);
  });

  it("prefers related stays in the same destination", async () => {
    const stay = await getPropertyDetail("forest-canopy-lodge");
    const related = await findRelatedStays(
      stay!.id,
      stay!.destination.slug,
      stay!.stayType,
      3,
    );
    expect(related[0].destinationSlug).toBe("bwindi");
  });

  it("gives every stay a distinct hero image", async () => {
    const slugs = await listStaySlugs();
    const details = await Promise.all(slugs.map((s) => getPropertyDetail(s.slug)));
    const heroes = details.map((d) => d!.image);
    expect(new Set(heroes).size).toBe(heroes.length);
  });
});
