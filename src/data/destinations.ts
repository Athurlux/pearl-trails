import type { Destination } from "./types";

export const destinations: Destination[] = [
  {
    slug: "bwindi",
    name: "Bwindi",
    region: "Southwestern Uganda",
    tagline: "Ancient forests. Extraordinary encounters.",
    blurb:
      "Mist settles between the trees before sunrise. Somewhere on the slope, a family of mountain gorillas is already awake.",
    image: "/img/dest-bwindi.jpg",
    imageAlt: "Mountain gorilla resting among dense green forest foliage",
    staysCount: 24,
    featured: true,
  },
  {
    slug: "murchison-falls",
    name: "Murchison Falls",
    region: "Northwestern Uganda",
    tagline: "Where the Nile narrows and roars.",
    blurb:
      "The river forces itself through a seven-metre gap and drops into a valley full of elephant, giraffe and open sky.",
    image: "/img/dest-murchison.jpg",
    imageAlt: "Boat on calm water at golden hour near Murchison Falls",
    staysCount: 18,
  },
  {
    slug: "queen-elizabeth",
    name: "Queen Elizabeth",
    region: "Western Uganda",
    tagline: "Savanna, crater lakes and tree-climbing lions.",
    blurb:
      "Grassland meets the Rwenzori foothills, and the Kazinga Channel carries life between two lakes all day long.",
    image: "/img/dest-queen-elizabeth.jpg",
    imageAlt: "Antelope grazing on open savanna grassland",
    staysCount: 21,
  },
  {
    slug: "kidepo-valley",
    name: "Kidepo Valley",
    region: "Northeastern Uganda",
    tagline: "The most remote wilderness in the country.",
    blurb:
      "Few roads, fewer visitors, and a valley that stretches until the mountains of the border take over.",
    image: "/img/dest-kidepo.jpg",
    imageAlt: "Acacia trees silhouetted against a dusk sky on open plains",
    staysCount: 9,
    featured: true,
  },
  {
    slug: "lake-bunyonyi",
    name: "Lake Bunyonyi",
    region: "Southwestern Uganda",
    tagline: "Twenty-nine islands. No hurry at all.",
    blurb:
      "Terraced hills drop straight into still water, and the swimming here is famously yours alone.",
    image: "/img/dest-bunyonyi.jpg",
    imageAlt: "Terraced green hillsides surrounding the still water of Lake Bunyonyi",
    staysCount: 15,
  },
  {
    slug: "jinja",
    name: "Jinja",
    region: "Eastern Uganda",
    tagline: "The river starts here. So does the adrenaline.",
    blurb:
      "Source of the Nile, rapids that earned their reputation, and long evenings on the water afterwards.",
    image: "/img/dest-jinja.jpg",
    imageAlt: "Wooden footbridge crossing white water at sunrise near the source of the Nile",
    staysCount: 12,
  },
];

export const destinationOptions = destinations.map((d) => ({
  slug: d.slug,
  name: d.name,
  region: d.region,
}));
