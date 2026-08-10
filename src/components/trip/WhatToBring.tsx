import type { StayType } from "@/lib/stay-types";

/**
 * What to bring.
 *
 * A Server Component: this is derived content with no interactivity, so it
 * costs the browser nothing.
 *
 * Deliberately **general travel preparation**, not advice. It suggests a rain
 * jacket; it does not suggest medication, vaccination, insurance or anything
 * else that would be a claim Pearl Trails is not qualified to make. Everything
 * here follows from facts the booking already holds — the kind of stay, and
 * whether the traveller asked for a trek or a drive.
 */

interface Props {
  stayType: StayType;
  destination: string;
  /** Titles from the itinerary, used only to detect activity kinds. */
  itineraryTitles: string[];
}

/**
 * Keyed on the real `STAY_TYPES` vocabulary. `Record` rather than `Partial`, so
 * adding a stay type later is a type error here instead of a silent fallback
 * that quietly recommends nothing in particular.
 */
const BY_STAY_TYPE: Record<StayType, string[]> = {
  campsite: [
    "A warm layer — nights under canvas get cold",
    "A head torch and spare batteries",
    "Refillable water bottle",
  ],
  "tented-camp": [
    "A warm layer for the evening",
    "A head torch for moving around after dark",
    "Refillable water bottle",
  ],
  "safari-lodge": ["A light layer for early starts", "Refillable water bottle"],
  "eco-lodge": [
    "A light layer for the evening",
    "Insect repellent",
    "Refillable water bottle",
  ],
  cabin: ["A warm layer for the evening", "Refillable water bottle"],
  cottage: ["A light layer for the evening", "Refillable water bottle"],
  "lakeside-stay": [
    "Swimwear and a quick-dry towel",
    "Sun hat and high-factor sun cream",
    "Refillable water bottle",
  ],
};

export function WhatToBring({ stayType, destination, itineraryTitles }: Props) {
  const haystack = itineraryTitles.join(" ").toLowerCase();

  const activity: string[] = [];
  if (/trek|hike|walk|forest|gorilla|chimp/.test(haystack)) {
    activity.push(
      "Broken-in walking boots with ankle support",
      "Long trousers and long sleeves for the undergrowth",
      "A rain jacket — forest weather changes fast",
      "A small daypack",
    );
  }
  if (/safari|game drive|wildlife|boat/.test(haystack)) {
    activity.push(
      "Neutral colours — avoid bright white and dark blue",
      "Sun hat and high-factor sun cream",
      "Binoculars if you have them",
    );
  }
  if (/bird/.test(haystack)) {
    activity.push("Binoculars and a bird list for the region");
  }

  const base = BY_STAY_TYPE[stayType];

  // De-duplicated, order preserved: two experiences can suggest the same thing.
  const items = [...new Set([...activity, ...base])];

  return (
    <section aria-labelledby="bring-heading">
      <h2 id="bring-heading" className="text-[1.15rem] text-forest">
        What to bring
      </h2>
      <p className="mt-1.5 text-[0.85rem] text-muted">
        Suggestions based on your stay and the experiences you asked for.
      </p>

      <ul className="mt-4 grid gap-2 sm:grid-cols-2">
        {items.map((item) => (
          <li
            key={item}
            className="flex gap-2.5 rounded-sm border border-line px-3.5 py-2.5 text-[0.86rem] leading-relaxed text-ink"
          >
            <span aria-hidden="true" className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-gold" />
            {item}
          </li>
        ))}
      </ul>

      <p className="mt-4 text-[0.78rem] leading-relaxed text-muted">
        General packing suggestions for {destination}, not travel, health or safety
        advice. Check permit requirements and current conditions with the property before
        you travel.
      </p>
    </section>
  );
}
