import { config } from "dotenv";
import { eq, inArray, sql } from "drizzle-orm";
import { getDb } from "./index";
import {
  accommodationOptions,
  amenities,
  destinations,
  experiences,
  stayAmenities,
  stayExperiences,
  stayImages,
  stays,
} from "./schema";
import { amenitySeed, destinationSeed, staySeed } from "./seed-data";
import {
  experienceSeed,
  galleryPools,
  stayDetails,
  stayExperienceMap,
} from "./release3-data";

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

  const detail = await seedRelease3(destinationId, stayId);

  console.log(
    `Seeded ${destinationRows.length} destinations, ${amenityRows.length} amenities, ` +
      `${stayRows.length} stays, ${links.length} amenity links, ` +
      `${detail.images} gallery images, ${detail.options} accommodation options, ` +
      `${detail.experiences} experiences, ${detail.experienceLinks} stay-experience links.`,
  );
}

/**
 * Release 3 property detail: galleries, accommodation options, experiences and
 * the practical information on each stay.
 *
 * Same replace-not-append discipline as the Release 2 seed, so running this
 * repeatedly converges on exactly the same database.
 */
async function seedRelease3(
  destinationId: Map<string, number>,
  stayId: Map<string, number>,
) {
  const db = getDb();

  // --- per-stay columns, galleries and accommodation options ---------------
  let imageCount = 0;
  let optionCount = 0;

  for (const [slug, detail] of Object.entries(stayDetails)) {
    const id = stayId.get(slug);
    if (!id) throw new Error(`release3-data references unknown stay: ${slug}`);

    await db
      .update(stays)
      .set({
        highlights: detail.highlights,
        locationNote: detail.locationNote,
        gettingThere: detail.gettingThere,
        checkInTime: detail.checkInTime,
        checkOutTime: detail.checkOutTime,
        childrenNote: detail.childrenNote,
        petsNote: detail.petsNote,
        smokingNote: detail.smokingNote,
        mealsNote: detail.mealsNote,
        accessibilityNote: detail.accessibilityNote,
        ratingCleanliness: detail.ratings.cleanliness,
        ratingLocation: detail.ratings.location,
        ratingService: detail.ratings.service,
        ratingExperience: detail.ratings.experience,
        updatedAt: new Date(),
      })
      .where(eq(stays.id, id));

    const pool = galleryPools[detail.pool];
    if (!pool) throw new Error(`Unknown gallery pool "${detail.pool}" for ${slug}`);

    const picks = detail.gallery.map((i) => {
      const image = pool[i];
      if (!image) throw new Error(`Gallery index ${i} out of range for ${slug}`);
      return image;
    });

    await db.delete(stayImages).where(eq(stayImages.stayId, id));
    await db.insert(stayImages).values(
      picks.map((image, i) => ({
        stayId: id,
        url: image.url,
        alt: image.alt,
        position: i + 1,
      })),
    );
    imageCount += picks.length;

    await db.delete(accommodationOptions).where(eq(accommodationOptions.stayId, id));
    await db.insert(accommodationOptions).values(
      detail.options.map((option, i) => ({
        stayId: id,
        slug: option.slug,
        name: option.name,
        shortDescription: option.shortDescription,
        guestCapacity: option.guestCapacity,
        bedDescription: option.bedDescription,
        priceFromUgx: option.priceFromUgx,
        currency: "UGX",
        sizeSqm: option.sizeSqm ?? null,
        features: option.features,
        image: option.image,
        imageAlt: option.imageAlt,
        position: i,
      })),
    );
    optionCount += detail.options.length;
  }

  // --- experiences ---------------------------------------------------------
  const experienceRows = await db
    .insert(experiences)
    .values(
      experienceSeed.map((e) => ({
        slug: e.slug,
        name: e.name,
        shortDescription: e.shortDescription,
        description: e.description,
        destinationId: e.destination ? (destinationId.get(e.destination) ?? null) : null,
        category: e.category,
        duration: e.duration,
        priceFromUgx: e.priceFromUgx,
        currency: "UGX",
        image: e.image,
        imageAlt: e.imageAlt,
        featured: e.featured,
      })),
    )
    .onConflictDoUpdate({
      target: experiences.slug,
      set: {
        name: excluded("name"),
        shortDescription: excluded("short_description"),
        description: excluded("description"),
        destinationId: excluded("destination_id"),
        category: excluded("category"),
        duration: excluded("duration"),
        priceFromUgx: excluded("price_from_ugx"),
        image: excluded("image"),
        imageAlt: excluded("image_alt"),
        featured: excluded("featured"),
      },
    })
    .returning({ id: experiences.id, slug: experiences.slug });

  const experienceId = new Map(experienceRows.map((r) => [r.slug, r.id]));

  const seededStayIds = [...stayId.values()];
  if (seededStayIds.length > 0) {
    await db.delete(stayExperiences).where(inArray(stayExperiences.stayId, seededStayIds));
  }

  const experienceLinks = Object.entries(stayExperienceMap).flatMap(([slug, list]) => {
    const sid = stayId.get(slug);
    if (!sid) throw new Error(`stayExperienceMap references unknown stay: ${slug}`);
    return list.map((expSlug, i) => {
      const eid = experienceId.get(expSlug);
      if (!eid) throw new Error(`Unknown experience slug: ${expSlug} on ${slug}`);
      return { stayId: sid, experienceId: eid, position: i };
    });
  });

  await db.insert(stayExperiences).values(experienceLinks);

  return {
    images: imageCount,
    options: optionCount,
    experiences: experienceRows.length,
    experienceLinks: experienceLinks.length,
  };
}

seed()
  .then(() => process.exit(0))
  .catch((err: unknown) => {
    console.error("Seed failed:", err);
    process.exit(1);
  });
