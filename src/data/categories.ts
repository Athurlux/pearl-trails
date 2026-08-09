import type { StayType } from "@/lib/stay-types";

/**
 * Editorial framing for the stay-type filters.
 *
 * The copy and photography live here; the counts do not — those come from the
 * database at render time, because a category tile claiming "42 safari lodges"
 * when the catalogue holds four is a false statement, not a placeholder.
 *
 * `types` is what the tile actually filters by, so a tile can group more than
 * one stay type without inventing a category the database does not know about.
 */
export interface StayCategory {
  slug: string;
  name: string;
  description: string;
  image: string;
  imageAlt: string;
  types: StayType[];
}

export const categories: StayCategory[] = [
  {
    slug: "safari-lodges",
    name: "Safari Lodges",
    description: "Full service, close to the game.",
    image: "/img/stay-kazinga.jpg",
    imageAlt: "Open-sided lodge lounge beneath a high thatched roof",
    types: ["safari-lodge"],
  },
  {
    slug: "campsites",
    name: "Campsites",
    description: "Pitch up where the quiet is.",
    image: "/img/stay-forest-canopy.jpg",
    imageAlt: "Small dome tents pitched on grass beside dense green vegetation",
    types: ["campsite"],
  },
  {
    slug: "eco-lodges",
    name: "Eco Lodges",
    description: "Low impact, deep in the landscape.",
    image: "/img/stay-kidepo-plains.jpg",
    imageAlt: "Timber deck with open-air bathing looking out over wild bush",
    types: ["eco-lodge"],
  },
  {
    slug: "tented-camps",
    name: "Tented Camps",
    description: "Canvas walls, uninterrupted sound.",
    image: "/img/stay-bunyonyi-ridge.jpg",
    imageAlt: "Large canvas safari tent open to a green clearing",
    types: ["tented-camp"],
  },
  {
    slug: "cabins-cottages",
    name: "Cabins & Cottages",
    description: "Solid walls, wood smoke, long mornings.",
    image: "/img/stay-jinja-cabins.jpg",
    imageAlt: "Timber cottage with a veranda surrounded by forest and planted gardens",
    types: ["cabin", "cottage"],
  },
  {
    slug: "lakeside-stays",
    name: "Lakeside Stays",
    description: "Water at the doorstep.",
    image: "/img/dest-bunyonyi.jpg",
    imageAlt: "Hillsides dropping into a still lake",
    types: ["lakeside-stay"],
  },
];
