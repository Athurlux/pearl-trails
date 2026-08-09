import "server-only";
import { and, asc, desc, eq, gte, ilike, inArray, lte, or, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { amenities, destinations, stayAmenities, stays } from "@/db/schema";
import { STAY_TYPES, type StayType } from "./stay-types";
import { PAGE_SIZE, type StaysParams } from "./stays-params";

/**
 * The Explore query.
 *
 * Everything that narrows results happens in Postgres. The browser never
 * receives rows it is not going to show, and the page never loads the whole
 * catalogue to filter it in JavaScript.
 */

export interface StayResult {
  id: number;
  slug: string;
  name: string;
  stayType: StayType;
  shortDescription: string;
  priceFromUgx: number;
  currency: string;
  rating: number;
  reviewCount: number;
  maxGuests: number;
  featured: boolean;
  image: string;
  imageAlt: string;
  destinationSlug: string;
  destinationName: string;
  amenities: string[];
}

export interface StaysPage {
  results: StayResult[];
  total: number;
  page: number;
  pageCount: number;
}

/** Weighted search vector — must mirror the expression behind stays_search_idx. */
const searchVector = sql`(
  setweight(to_tsvector('english', ${stays.name}), 'A') ||
  setweight(to_tsvector('english', ${stays.shortDescription}), 'C') ||
  setweight(to_tsvector('english', ${stays.description}), 'D')
)`;

function buildWhere(p: StaysParams) {
  const clauses = [];

  if (p.destination) clauses.push(eq(destinations.slug, p.destination));
  if (p.types.length) clauses.push(inArray(stays.stayType, p.types));
  if (p.minPrice != null) clauses.push(gte(stays.priceFromUgx, p.minPrice));
  if (p.maxPrice != null) clauses.push(lte(stays.priceFromUgx, p.maxPrice));
  if (p.guests != null) clauses.push(gte(stays.maxGuests, p.guests));
  if (p.minRating != null) clauses.push(gte(stays.rating, String(p.minRating)));

  if (p.q) {
    // websearch_to_tsquery tolerates whatever a human types — quotes, OR, a
    // stray hyphen — without us hand-parsing a query language. The ILIKE arm
    // catches partial words the tokenizer would miss ("bunyo").
    clauses.push(
      or(
        sql`${searchVector} @@ websearch_to_tsquery('english', ${p.q})`,
        ilike(stays.name, `%${p.q}%`),
      ),
    );
  }

  // Amenity filter is AND: "pool and wifi" means both, not either. One EXISTS
  // per amenity keeps it index-friendly and bounded by MAX_AMENITIES.
  for (const slug of p.amenities) {
    clauses.push(
      sql`EXISTS (
        SELECT 1 FROM ${stayAmenities}
        JOIN ${amenities} ON ${amenities.id} = ${stayAmenities.amenityId}
        WHERE ${stayAmenities.stayId} = ${stays.id} AND ${amenities.slug} = ${slug}
      )`,
    );
  }

  return clauses.length ? and(...clauses) : undefined;
}

function buildOrder(p: StaysParams) {
  // Every ordering ends with id so pagination is deterministic and rows cannot
  // shuffle between pages when values tie.
  const tie = asc(stays.id);

  switch (p.sort) {
    case "price-asc":
      return [asc(stays.priceFromUgx), tie];
    case "price-desc":
      return [desc(stays.priceFromUgx), tie];
    case "rating":
      return [desc(stays.rating), desc(stays.reviewCount), tie];
    default:
      // "Recommended" is a stated rule, not a black box: a text query ranks by
      // relevance first, otherwise featured stays lead, then rating.
      return p.q
        ? [
            desc(sql`ts_rank(${searchVector}, websearch_to_tsquery('english', ${p.q}))`),
            desc(stays.featured),
            desc(stays.rating),
            tie,
          ]
        : [desc(stays.featured), desc(stays.rating), desc(stays.reviewCount), tie];
  }
}

export async function findStays(p: StaysParams): Promise<StaysPage> {
  const db = getDb();
  const where = buildWhere(p);
  const offset = (p.page - 1) * PAGE_SIZE;

  // The total comes back as a window function on the same scan rather than a
  // second round trip.
  const rows = await db
    .select({
      id: stays.id,
      slug: stays.slug,
      name: stays.name,
      stayType: stays.stayType,
      shortDescription: stays.shortDescription,
      priceFromUgx: stays.priceFromUgx,
      currency: stays.currency,
      rating: stays.rating,
      reviewCount: stays.reviewCount,
      maxGuests: stays.maxGuests,
      featured: stays.featured,
      image: stays.image,
      imageAlt: stays.imageAlt,
      destinationSlug: destinations.slug,
      destinationName: destinations.name,
      total: sql<number>`count(*) over ()`.mapWith(Number),
    })
    .from(stays)
    .innerJoin(destinations, eq(destinations.id, stays.destinationId))
    .where(where)
    .orderBy(...buildOrder(p))
    .limit(PAGE_SIZE)
    .offset(offset);

  // `count(*) OVER ()` rides along with the rows, so the common case costs one
  // query. Past the last page there are no rows to carry it, and reporting zero
  // there would tell the user the catalogue is empty when it is not — so that
  // one case pays for a real count.
  let total = rows[0]?.total ?? 0;
  if (rows.length === 0 && p.page > 1) {
    const [counted] = await db
      .select({ total: sql<number>`count(*)`.mapWith(Number) })
      .from(stays)
      .innerJoin(destinations, eq(destinations.id, stays.destinationId))
      .where(where);
    total = counted?.total ?? 0;
  }

  // Amenity names for the visible page only, in one batched query — never one
  // query per card.
  const amenityMap = new Map<number, string[]>();
  if (rows.length > 0) {
    const links = await db
      .select({ stayId: stayAmenities.stayId, name: amenities.name })
      .from(stayAmenities)
      .innerJoin(amenities, eq(amenities.id, stayAmenities.amenityId))
      .where(
        inArray(
          stayAmenities.stayId,
          rows.map((r) => r.id),
        ),
      )
      .orderBy(asc(amenities.id));

    for (const link of links) {
      const list = amenityMap.get(link.stayId);
      if (list) list.push(link.name);
      else amenityMap.set(link.stayId, [link.name]);
    }
  }

  return {
    results: rows.map((r) => ({
      ...r,
      rating: Number(r.rating),
      amenities: amenityMap.get(r.id) ?? [],
    })),
    total,
    page: p.page,
    pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  };
}

export async function listDestinations() {
  const db = getDb();
  return db
    .select({
      slug: destinations.slug,
      name: destinations.name,
      region: destinations.region,
    })
    .from(destinations)
    .orderBy(asc(destinations.name));
}

/**
 * Destination tiles for the landing page, with a real count per destination in
 * one grouped query rather than one count per tile.
 */
export async function listDestinationsWithCounts() {
  const db = getDb();
  return db
    .select({
      slug: destinations.slug,
      name: destinations.name,
      region: destinations.region,
      tagline: destinations.tagline,
      blurb: destinations.blurb,
      image: destinations.image,
      imageAlt: destinations.imageAlt,
      stayCount: sql<number>`count(${stays.id})`.mapWith(Number),
    })
    .from(destinations)
    .leftJoin(stays, eq(stays.destinationId, destinations.id))
    .groupBy(destinations.id)
    .orderBy(desc(sql`count(${stays.id})`), asc(destinations.name));
}

/** Featured stays for the landing page showcase. */
export async function listFeaturedStays(limit = 6): Promise<StayResult[]> {
  const db = getDb();
  const rows = await db
    .select({
      id: stays.id,
      slug: stays.slug,
      name: stays.name,
      stayType: stays.stayType,
      shortDescription: stays.shortDescription,
      priceFromUgx: stays.priceFromUgx,
      currency: stays.currency,
      rating: stays.rating,
      reviewCount: stays.reviewCount,
      maxGuests: stays.maxGuests,
      featured: stays.featured,
      image: stays.image,
      imageAlt: stays.imageAlt,
      destinationSlug: destinations.slug,
      destinationName: destinations.name,
    })
    .from(stays)
    .innerJoin(destinations, eq(destinations.id, stays.destinationId))
    .orderBy(desc(stays.featured), desc(stays.rating), asc(stays.id))
    .limit(limit);

  if (rows.length === 0) return [];

  const links = await db
    .select({ stayId: stayAmenities.stayId, name: amenities.name })
    .from(stayAmenities)
    .innerJoin(amenities, eq(amenities.id, stayAmenities.amenityId))
    .where(
      inArray(
        stayAmenities.stayId,
        rows.map((r) => r.id),
      ),
    )
    .orderBy(asc(amenities.id));

  const amenityMap = new Map<number, string[]>();
  for (const link of links) {
    const list = amenityMap.get(link.stayId);
    if (list) list.push(link.name);
    else amenityMap.set(link.stayId, [link.name]);
  }

  return rows.map((r) => ({
    ...r,
    rating: Number(r.rating),
    amenities: amenityMap.get(r.id) ?? [],
  }));
}

/** Real counts per stay type, for the category tiles. One grouped query. */
export async function countStaysByType(): Promise<Record<StayType, number>> {
  const db = getDb();
  const rows = await db
    .select({ stayType: stays.stayType, count: sql<number>`count(*)`.mapWith(Number) })
    .from(stays)
    .groupBy(stays.stayType);

  const counts = Object.fromEntries(
    STAY_TYPES.map((t) => [t, 0]),
  ) as Record<StayType, number>;
  for (const row of rows) counts[row.stayType] = row.count;
  return counts;
}

export async function listAmenities() {
  const db = getDb();
  return db
    .select({ slug: amenities.slug, name: amenities.name })
    .from(amenities)
    .orderBy(asc(amenities.id));
}

export async function findStayBySlug(slug: string) {
  const db = getDb();
  const [row] = await db
    .select({
      slug: stays.slug,
      name: stays.name,
      stayType: stays.stayType,
      shortDescription: stays.shortDescription,
      description: stays.description,
      priceFromUgx: stays.priceFromUgx,
      rating: stays.rating,
      reviewCount: stays.reviewCount,
      maxGuests: stays.maxGuests,
      image: stays.image,
      imageAlt: stays.imageAlt,
      destinationSlug: destinations.slug,
      destinationName: destinations.name,
      destinationRegion: destinations.region,
    })
    .from(stays)
    .innerJoin(destinations, eq(destinations.id, stays.destinationId))
    .where(eq(stays.slug, slug))
    .limit(1);

  if (!row) return null;
  return { ...row, rating: Number(row.rating) };
}
