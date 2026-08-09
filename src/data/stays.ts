import type { Stay } from "./types";

/**
 * Fictional showcase properties.
 *
 * These are original names created for this prototype. They are not real
 * businesses, and the prices are illustrative demo values — not live rates.
 */
export const stays: Stay[] = [
  {
    slug: "forest-canopy-lodge",
    name: "Forest Canopy Lodge",
    destinationSlug: "bwindi",
    destinationName: "Bwindi",
    type: "Eco Lodge",
    rating: 4.9,
    reviews: 128,
    fromPriceUgx: 920000,
    image: "/img/stay-bwindi-canopy.jpg",
    imageAlt: "Lodge lit up at dusk on a forested hillside",
  },
  {
    slug: "nile-bend-safari-camp",
    name: "Nile Bend Safari Camp",
    destinationSlug: "murchison-falls",
    destinationName: "Murchison Falls",
    type: "Tented Camp",
    rating: 4.8,
    reviews: 94,
    fromPriceUgx: 780000,
    image: "/img/stay-nile-bend.jpg",
    imageAlt: "Guest on a stone terrace looking out over riverside bush",
  },
  {
    slug: "bunyonyi-ridge-retreat",
    name: "Bunyonyi Ridge Retreat",
    destinationSlug: "lake-bunyonyi",
    destinationName: "Lake Bunyonyi",
    type: "Lakeside Retreat",
    rating: 4.9,
    reviews: 156,
    fromPriceUgx: 640000,
    image: "/img/stay-bunyonyi-ridge.jpg",
    imageAlt: "A single canvas retreat tent standing in an open green meadow",
  },
  {
    slug: "kidepo-plains-camp",
    name: "Kidepo Plains Camp",
    destinationSlug: "kidepo-valley",
    destinationName: "Kidepo Valley",
    type: "Safari Lodge",
    rating: 5.0,
    reviews: 61,
    fromPriceUgx: 1150000,
    image: "/img/stay-kidepo-plains.jpg",
    imageAlt: "Freestanding bath on a timber deck above open bush",
  },
  {
    slug: "kazinga-wilderness-lodge",
    name: "Kazinga Wilderness Lodge",
    destinationSlug: "queen-elizabeth",
    destinationName: "Queen Elizabeth",
    type: "Safari Lodge",
    rating: 4.7,
    reviews: 203,
    fromPriceUgx: 870000,
    image: "/img/stay-kazinga.jpg",
    imageAlt: "Open-sided lodge lounge beneath a high thatched roof",
  },
  {
    slug: "nile-source-cabins",
    name: "Nile Source Cabins",
    destinationSlug: "jinja",
    destinationName: "Jinja",
    type: "Cabin",
    rating: 4.8,
    reviews: 87,
    fromPriceUgx: 430000,
    image: "/img/stay-jinja-cabins.jpg",
    imageAlt: "Timber and stone cottage with a tiled roof set against dense green forest",
  },
];
