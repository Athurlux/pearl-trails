/**
 * The canonical stay-type vocabulary.
 *
 * Lives here rather than in the Drizzle schema so client components can import
 * it without pulling the ORM into the browser bundle. `src/db/schema.ts` builds
 * its Postgres enum from this list, so the two can never drift apart.
 */
export const STAY_TYPES = [
  "safari-lodge",
  "campsite",
  "eco-lodge",
  "tented-camp",
  "cabin",
  "cottage",
  "lakeside-stay",
] as const;

export type StayType = (typeof STAY_TYPES)[number];

export const STAY_TYPE_LABELS: Record<StayType, string> = {
  "safari-lodge": "Safari Lodge",
  campsite: "Campsite",
  "eco-lodge": "Eco Lodge",
  "tented-camp": "Tented Camp",
  cabin: "Cabin",
  cottage: "Cottage",
  "lakeside-stay": "Lakeside Stay",
};
