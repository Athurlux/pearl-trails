import { config } from "dotenv";
import { inArray, sql } from "drizzle-orm";
import { getDb } from "./index";
import { amenities, destinations, stayAmenities, stays } from "./schema";
import { amenitySeed, destinationSeed, staySeed } from "./seed-data";

config({ path: ".env.local", quiet: true });

/** `excluded."column"` — the row Postgres was about to insert, for upserts. */
const excluded = (column: string) => sql.raw(`excluded."${column}"`);

/**
 * Idempotent seed.
 *
 * Every write is an upsert keyed on the natural slug, and amenity links are
 * replaced rather than appended. Running this twice produces exactly the same
 * database as running it once — no duplicated catalogue, nothing dropped.
 *
 * This is a deliberate operator command (`npm run db:seed`). It is never
 * invoked from application code and never runs on server start.
 */
async function seed() {
  const db = getDb();

  const destinationRows = await db
    .insert(destinations)
    .values(destinationSeed.map((d) => ({ ...d })))
    .onConflictDoUpdate({
      target: destinations.slug,
      set: {
        name: excluded("name"),
        region: excluded("region"),
        tagline: excluded("tagline"),
        blurb: excluded("blurb"),
        image: excluded("image"),
        imageAlt: excluded("image_alt"),
        updatedAt: new Date(),
      },
    })
    .returning({ id: destinations.id, slug: destinations.slug });

  const amenityRows = await db
    .insert(amenities)
    .values(amenitySeed.map((a) => ({ ...a })))
    .onConflictDoUpdate({
      target: amenities.slug,
      set: { name: excluded("name") },
    })
    .returning({ id: amenities.id, slug: amenities.slug });

  const destinationId = new Map(destinationRows.map((r) => [r.slug, r.id]));
  const amenityId = new Map(amenityRows.map((r) => [r.slug, r.id]));

  const stayRows = await db
    .insert(stays)
    .values(
      staySeed.map((s) => {
        const id = destinationId.get(s.destination);
        if (!id) throw new Error(`Unknown destination slug: ${s.destination}`);
        return {
          slug: s.slug,
          name: s.name,
          destinationId: id,
          stayType: s.stayType,
          shortDescription: s.shortDescription,
          description: s.description,
          priceFromUgx: s.priceFromUgx,
          currency: "UGX",
          rating: s.rating,
          reviewCount: s.reviewCount,
          maxGuests: s.maxGuests,
          featured: s.featured,
          image: s.image,
          imageAlt: s.imageAlt,
          latitude: s.latitude,
          longitude: s.longitude,
        };
      }),
    )
    .onConflictDoUpdate({
      target: stays.slug,
      set: {
        name: excluded("name"),
        destinationId: excluded("destination_id"),
        stayType: excluded("stay_type"),
        shortDescription: excluded("short_description"),
        description: excluded("description"),
        priceFromUgx: excluded("price_from_ugx"),
        rating: excluded("rating"),
        reviewCount: excluded("review_count"),
        maxGuests: excluded("max_guests"),
        featured: excluded("featured"),
        image: excluded("image"),
        imageAlt: excluded("image_alt"),
        latitude: excluded("latitude"),
        longitude: excluded("longitude"),
        updatedAt: new Date(),
      },
    })
    .returning({ id: stays.id, slug: stays.slug });

  const stayId = new Map(stayRows.map((r) => [r.slug, r.id]));

  // Replace, do not append: clear links for the seeded stays, then reinsert.
  // Amenities removed from seed-data must disappear from the database too.
  const seededStayIds = [...stayId.values()];
  if (seededStayIds.length > 0) {
    await db.delete(stayAmenities).where(inArray(stayAmenities.stayId, seededStayIds));
  }

  const links = staySeed.flatMap((s) => {
    const sid = stayId.get(s.slug);
    if (!sid) return [];
    return s.amenities.map((slug) => {
      const aid = amenityId.get(slug);
      if (!aid) throw new Error(`Unknown amenity slug: ${slug} on ${s.slug}`);
      return { stayId: sid, amenityId: aid };
    });
  });

  await db.insert(stayAmenities).values(links);

  console.log(
    `Seeded ${destinationRows.length} destinations, ${amenityRows.length} amenities, ` +
      `${stayRows.length} stays, ${links.length} amenity links.`,
  );
}

seed()
  .then(() => process.exit(0))
  .catch((err: unknown) => {
    console.error("Seed failed:", err);
    process.exit(1);
  });
