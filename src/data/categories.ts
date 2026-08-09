import type { StayCategory } from "./types";

/**
 * Categories reuse the stay photography deliberately — every image in this
 * project was checked against the place it claims to show, and there is a small
 * verified pool rather than a large unverified one.
 */
export const categories: StayCategory[] = [
  {
    slug: "safari-lodges",
    name: "Safari Lodges",
    description: "Full service, close to the game.",
    image: "/img/stay-kazinga.jpg",
    imageAlt: "Open-sided lodge lounge beneath a high thatched roof",
    count: 42,
  },
  {
    slug: "campsites",
    name: "Campsites",
    description: "Pitch up where the quiet is.",
    image: "/img/stay-forest-canopy.jpg",
    imageAlt: "Small dome tents pitched on grass beside dense green vegetation",
    count: 31,
  },
  {
    slug: "eco-lodges",
    name: "Eco Lodges",
    description: "Low impact, deep in the landscape.",
    image: "/img/stay-kidepo-plains.jpg",
    imageAlt: "Timber deck with open-air bathing looking out over wild bush",
    count: 26,
  },
  {
    slug: "tented-camps",
    name: "Tented Camps",
    description: "Canvas walls, uninterrupted sound.",
    image: "/img/stay-bunyonyi-ridge.jpg",
    imageAlt: "Large canvas safari tent open to a green clearing",
    count: 19,
  },
  {
    slug: "cabins-cottages",
    name: "Cabins & Cottages",
    description: "Solid walls, wood smoke, long mornings.",
    image: "/img/stay-jinja-cabins.jpg",
    imageAlt: "Timber cottage with a veranda surrounded by forest and planted gardens",
    count: 23,
  },
  {
    slug: "lakeside-stays",
    name: "Lakeside Stays",
    description: "Water at the doorstep.",
    image: "/img/dest-bunyonyi.jpg",
    imageAlt: "Hillsides dropping into a still lake",
    count: 17,
  },
];
