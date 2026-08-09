/**
 * Release 1 demo-data contracts.
 *
 * These shapes are intentionally close to what a Neon-backed API would return,
 * so swapping the source later means changing the loader — not the components.
 */

export type Slug = string;

export interface Destination {
  slug: Slug;
  name: string;
  region: string;
  tagline: string;
  blurb: string;
  image: string;
  imageAlt: string;
  staysCount: number;
  featured?: boolean;
}

export type StayType =
  | "Safari Lodge"
  | "Tented Camp"
  | "Eco Lodge"
  | "Campsite"
  | "Cabin"
  | "Lakeside Retreat";

export interface Stay {
  slug: Slug;
  name: string;
  destinationSlug: Slug;
  destinationName: string;
  type: StayType;
  rating: number;
  reviews: number;
  /** Nightly "from" price in UGX minor-unit-free whole shillings (demo data). */
  fromPriceUgx: number;
  image: string;
  imageAlt: string;
}

export interface StayCategory {
  slug: Slug;
  name: string;
  description: string;
  image: string;
  imageAlt: string;
  count: number;
}

export interface Experience {
  slug: Slug;
  name: string;
  destination: string;
  duration: string;
  image: string;
  imageAlt: string;
}

export interface ItineraryActivity {
  time: string;
  title: string;
}

export interface ItineraryDay {
  day: number;
  label: string;
  activities: ItineraryActivity[];
}

export interface ItineraryPreview {
  title: string;
  destination: string;
  nights: number;
  days: ItineraryDay[];
}
