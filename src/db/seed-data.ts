import type { StayType } from "./schema";

/**
 * Release 2 demo catalogue.
 *
 * Every property here is invented for this prototype. None of these are real
 * businesses and every price is illustrative, not a live rate. Photography is
 * Unsplash-licensed and each image was viewed before it was assigned — no
 * photograph is used by more than one stay.
 */

export const destinationSeed = [
  {
    slug: "bwindi",
    name: "Bwindi",
    region: "Southwestern Uganda",
    tagline: "Ancient forest, and the gorillas who own it.",
    blurb:
      "Impenetrable is not marketing. The forest closes over the trail within minutes, and somewhere on the slope a family of mountain gorillas is already awake.",
    image: "/img/dest-bwindi.jpg",
    imageAlt: "Mountain gorilla resting among dense green forest vegetation",
  },
  {
    slug: "murchison-falls",
    name: "Murchison Falls",
    region: "Northwestern Uganda",
    tagline: "The Nile forced through a seven metre gap.",
    blurb:
      "The whole river squeezes through a cleft in the rock and falls into the gorge below. Upstream it widens again and the banks fill with hippo and elephant.",
    image: "/img/dest-murchison.jpg",
    imageAlt: "Wooden boats on still water under an orange sunset sky",
  },
  {
    slug: "queen-elizabeth",
    name: "Queen Elizabeth",
    region: "Western Uganda",
    tagline: "Savanna, crater lakes and a channel full of hippo.",
    blurb:
      "Uganda most visited park earns it. The Kazinga Channel links two lakes and everything in the park eventually comes down to drink.",
    image: "/img/dest-queen-elizabeth.jpg",
    imageAlt: "Open savanna grassland with scattered trees and distant hills",
  },
  {
    slug: "kidepo-valley",
    name: "Kidepo Valley",
    region: "Northeastern Uganda",
    tagline: "The park most travellers never reach.",
    blurb:
      "Closer to South Sudan than to Kampala. Getting there takes a flight or a long deliberate drive, which is exactly why the plains stay empty.",
    image: "/img/dest-kidepo.jpg",
    imageAlt: "Wide savanna plains beneath a burning sunset sky",
  },
  {
    slug: "lake-bunyonyi",
    name: "Lake Bunyonyi",
    region: "Southwestern Uganda",
    tagline: "Terraced hills falling into still water.",
    blurb:
      "Twenty nine islands, no crocodiles, no bilharzia, and swimming that is famously yours alone. The quietest water in the country.",
    image: "/img/dest-bunyonyi.jpg",
    imageAlt: "Terraced green hillsides surrounding the still water of a lake",
  },
  {
    slug: "jinja",
    name: "Jinja",
    region: "Eastern Uganda",
    tagline: "The river starts here. So does the adrenaline.",
    blurb:
      "Source of the Nile, rapids that earned their reputation, and long evenings on the water once the day is done.",
    image: "/img/dest-jinja.jpg",
    imageAlt:
      "Wooden footbridge crossing white water at sunrise near the source of the Nile",
  },
  {
    slug: "sipi-falls",
    name: "Sipi Falls",
    region: "Eastern Uganda",
    tagline: "Three waterfalls and the coffee grown between them.",
    blurb:
      "On the lower slopes of Mount Elgon, where arabica grows in the shade and the falls drop in three stages down the escarpment.",
    image: "/img/dest-sipi.jpg",
    imageAlt: "Powerful waterfall dropping into a river through a green gorge",
  },
  {
    slug: "fort-portal",
    name: "Fort Portal",
    region: "Western Uganda",
    tagline: "Crater lakes under the Mountains of the Moon.",
    blurb:
      "Tea estates, dozens of crater lakes, and the Rwenzori range holding the western horizon on the days it clears.",
    image: "/img/dest-fort-portal.jpg",
    imageAlt: "Green terraced hills and cultivated valleys under a bright sky",
  },
] as const;

export const amenitySeed = [
  { slug: "wifi", name: "Wi-Fi" },
  { slug: "restaurant", name: "Restaurant" },
  { slug: "private-bathroom", name: "Private bathroom" },
  { slug: "parking", name: "Parking" },
  { slug: "campfire", name: "Campfire" },
  { slug: "lake-view", name: "Lake view" },
  { slug: "forest-view", name: "Forest view" },
  { slug: "pool", name: "Pool" },
  { slug: "guided-activities", name: "Guided activities" },
  { slug: "family-friendly", name: "Family friendly" },
  { slug: "breakfast", name: "Breakfast" },
  { slug: "airport-transfer", name: "Airport transfer" },
] as const;

interface StaySeed {
  slug: string;
  name: string;
  destination: string;
  stayType: StayType;
  shortDescription: string;
  description: string;
  priceFromUgx: number;
  rating: string;
  reviewCount: number;
  maxGuests: number;
  featured: boolean;
  image: string;
  imageAlt: string;
  latitude: string;
  longitude: string;
  amenities: string[];
}

export const staySeed: StaySeed[] = [
  // ---- Bwindi -----------------------------------------------------------
  {
    slug: "forest-canopy-lodge",
    name: "Forest Canopy Lodge",
    destination: "bwindi",
    stayType: "eco-lodge",
    shortDescription: "Timber and glass on the forest edge, lit like a lantern after dark.",
    description:
      "Eight rooms built into the slope above the trailhead, each one facing the canopy rather than the car park. Solar carries the lighting, hot water comes from a wood boiler, and dinner is served on the deck while the forest turns loud. The gorilla briefing point is a twenty minute walk downhill.",
    priceFromUgx: 920000,
    rating: "4.9",
    reviewCount: 128,
    maxGuests: 6,
    featured: true,
    image: "/img/stay-bwindi-canopy.jpg",
    imageAlt: "Lodge lit up at dusk on a forested hillside",
    latitude: "-1.05680",
    longitude: "29.67210",
    amenities: ["restaurant", "private-bathroom", "forest-view", "guided-activities", "breakfast", "campfire"],
  },
  {
    slug: "mubwindi-treetop-cabins",
    name: "Mubwindi Treetop Cabins",
    destination: "bwindi",
    stayType: "cabin",
    shortDescription: "Four cabins on stilts, level with the crowns of the trees.",
    description:
      "Each cabin sits on its own platform among the branches, joined by a boardwalk rather than a path. Windows run floor to ceiling on the forest side. Bring a jumper, the nights up here are genuinely cold.",
    priceFromUgx: 640000,
    rating: "4.7",
    reviewCount: 84,
    maxGuests: 4,
    featured: false,
    image: "/img/stays/canopy-window.jpg",
    imageAlt: "Triangular timber window framing dense green forest",
    latitude: "-1.08340",
    longitude: "29.75600",
    amenities: ["private-bathroom", "forest-view", "breakfast", "guided-activities"],
  },
  {
    slug: "ruhija-ridge-camp",
    name: "Ruhija Ridge Camp",
    destination: "bwindi",
    stayType: "tented-camp",
    shortDescription: "Canvas on the high ridge, where the forest drops away on both sides.",
    description:
      "Six walk-in tents on the eastern ridge at 2350 metres. Proper beds, a writing desk, and a bucket shower filled on request. The birding on the trail below camp is some of the best in the country.",
    priceFromUgx: 380000,
    rating: "4.6",
    reviewCount: 61,
    maxGuests: 4,
    featured: false,
    image: "/img/stays/tent-interior.jpg",
    imageAlt: "Interior of a canvas tent with folding chairs and a writing table",
    latitude: "-1.04120",
    longitude: "29.77890",
    amenities: ["forest-view", "campfire", "guided-activities", "breakfast"],
  },

  // ---- Murchison Falls --------------------------------------------------
  {
    slug: "nile-bend-safari-camp",
    name: "Nile Bend Safari Camp",
    destination: "murchison-falls",
    stayType: "tented-camp",
    shortDescription: "A stone terrace above the river, and whatever walks past it.",
    description:
      "The camp sits on the bank where the Nile turns north. Tents are spaced far enough apart that you hear the river rather than your neighbours, and the terrace is where everybody ends up at six.",
    priceFromUgx: 780000,
    rating: "4.8",
    reviewCount: 94,
    maxGuests: 4,
    featured: false,
    image: "/img/stay-nile-bend.jpg",
    imageAlt: "Guest on a stone terrace looking out over riverside bush",
    latitude: "2.27650",
    longitude: "31.68030",
    amenities: ["restaurant", "private-bathroom", "guided-activities", "breakfast", "parking"],
  },
  {
    slug: "victoria-nile-camp",
    name: "Victoria Nile Camp",
    destination: "murchison-falls",
    stayType: "campsite",
    shortDescription: "Pitch your own or take a ready tent. The fire is lit either way.",
    description:
      "A simple riverside campsite with shared ablutions, a covered kitchen and a central fire pit. Popular with overlanders and with anyone who would rather spend the money on the boat trip than the bed.",
    priceFromUgx: 150000,
    rating: "4.4",
    reviewCount: 47,
    maxGuests: 6,
    featured: false,
    image: "/img/stays/campfire-evening.jpg",
    imageAlt: "Guests gathered around an open campfire at night",
    latitude: "2.24110",
    longitude: "31.71440",
    amenities: ["campfire", "parking", "family-friendly", "guided-activities"],
  },
  {
    slug: "paraa-escarpment-lodge",
    name: "Paraa Escarpment Lodge",
    destination: "murchison-falls",
    stayType: "safari-lodge",
    shortDescription: "Full service on the escarpment, with the delta laid out below.",
    description:
      "Fourteen rooms along the ridge, a long pool facing west, and a dining room that stays open late for people coming back from the falls. Airstrip transfers are arranged as a matter of course.",
    priceFromUgx: 1150000,
    rating: "4.9",
    reviewCount: 172,
    maxGuests: 8,
    featured: true,
    image: "/img/stays/lodge-dusk-pool.jpg",
    imageAlt: "Lodge lit by lanterns beside a still pool at dusk",
    latitude: "2.31980",
    longitude: "31.55620",
    amenities: ["restaurant", "private-bathroom", "pool", "wifi", "breakfast", "airport-transfer", "guided-activities"],
  },

  // ---- Queen Elizabeth --------------------------------------------------
  {
    slug: "kazinga-wilderness-lodge",
    name: "Kazinga Wilderness Lodge",
    destination: "queen-elizabeth",
    stayType: "safari-lodge",
    shortDescription: "An open-sided lounge under thatch, minutes from the channel.",
    description:
      "Built low and open so the breeze off the water moves through the whole building. Rooms sit behind the main lounge in pairs. Boat trips on the Kazinga Channel leave from a jetty ten minutes away.",
    priceFromUgx: 870000,
    rating: "4.7",
    reviewCount: 203,
    maxGuests: 6,
    featured: false,
    image: "/img/stay-kazinga.jpg",
    imageAlt: "Open-sided lodge lounge beneath a high thatched roof",
    latitude: "-0.19940",
    longitude: "29.89530",
    amenities: ["restaurant", "private-bathroom", "breakfast", "guided-activities", "parking", "family-friendly"],
  },
  {
    slug: "kyambura-gorge-retreat",
    name: "Kyambura Gorge Retreat",
    destination: "queen-elizabeth",
    stayType: "eco-lodge",
    shortDescription: "Stone arches, a cold pool, and the gorge chimpanzees below.",
    description:
      "Built from local stone on the lip of the gorge, with a pool cut into the terrace and acacia shade over the loungers. The chimpanzee tracking group leaves from the gate at half past seven.",
    priceFromUgx: 1050000,
    rating: "4.9",
    reviewCount: 88,
    maxGuests: 4,
    featured: true,
    image: "/img/stays/arch-pool-view.jpg",
    imageAlt: "View through a stone arch to a swimming pool and acacia trees",
    latitude: "-0.16720",
    longitude: "30.06880",
    amenities: ["restaurant", "private-bathroom", "pool", "guided-activities", "breakfast", "wifi"],
  },
  {
    slug: "ishasha-fig-tree-camp",
    name: "Ishasha Fig Tree Camp",
    destination: "queen-elizabeth",
    stayType: "tented-camp",
    shortDescription: "Canvas in the southern sector, under the trees the lions climb.",
    description:
      "Five tents in the fig grove near the Ntungwe river. No fence, no generator after ten. The tree-climbing lions of Ishasha are the reason people come this far south and the guides here know the individual prides.",
    priceFromUgx: 560000,
    rating: "4.6",
    reviewCount: 73,
    maxGuests: 4,
    featured: false,
    image: "/img/stays/tented-camp-canvas.jpg",
    imageAlt: "Large canvas safari tent standing open beneath green trees",
    latitude: "-0.85410",
    longitude: "29.66740",
    amenities: ["private-bathroom", "campfire", "guided-activities", "breakfast"],
  },

  // ---- Kidepo Valley ----------------------------------------------------
  {
    slug: "kidepo-plains-camp",
    name: "Kidepo Plains Camp",
    destination: "kidepo-valley",
    stayType: "safari-lodge",
    shortDescription: "A deck, a bath, and ninety degrees of empty valley.",
    description:
      "The most remote property we list. Six rooms on a rock outcrop above the Narus valley, each with an outdoor bath on its own deck. Buffalo move across the plain below in the hundreds. Access is by light aircraft or a very long day of driving.",
    priceFromUgx: 1480000,
    rating: "5.0",
    reviewCount: 61,
    maxGuests: 6,
    featured: true,
    image: "/img/stay-kidepo-plains.jpg",
    imageAlt: "Freestanding bath on a timber deck above open bush",
    latitude: "3.90120",
    longitude: "33.74560",
    amenities: ["restaurant", "private-bathroom", "guided-activities", "breakfast", "airport-transfer", "campfire"],
  },
  {
    slug: "narus-valley-tented-camp",
    name: "Narus Valley Tented Camp",
    destination: "kidepo-valley",
    stayType: "tented-camp",
    shortDescription: "Dinner laid out on the grass, and elephants that ignore it.",
    description:
      "Seasonal camp on the valley floor, moved each year to follow the water. Meals are served outside whenever the weather allows, which in Kidepo is most of the time.",
    priceFromUgx: 690000,
    rating: "4.7",
    reviewCount: 39,
    maxGuests: 4,
    featured: false,
    image: "/img/stays/elephants-dining.jpg",
    imageAlt: "Elephants passing behind a set outdoor dining table at a camp",
    latitude: "3.86790",
    longitude: "33.79210",
    amenities: ["private-bathroom", "campfire", "guided-activities", "breakfast"],
  },
  {
    slug: "apoka-ridge-lodge",
    name: "Apoka Ridge Lodge",
    destination: "kidepo-valley",
    stayType: "safari-lodge",
    shortDescription: "Wide beds, deep chairs, and nothing at all to hurry for.",
    description:
      "The oldest of our Kidepo properties, rebuilt room by room around its original frame. Long afternoons here are the point. Game drives leave early and return late, and the kitchen holds lunch for whoever is still out.",
    priceFromUgx: 980000,
    rating: "4.8",
    reviewCount: 54,
    maxGuests: 8,
    featured: false,
    image: "/img/stays/lodge-bedroom.jpg",
    imageAlt: "Lodge bedroom with a draped four-poster bed and deep upholstered sofas",
    latitude: "3.92330",
    longitude: "33.71080",
    amenities: ["restaurant", "private-bathroom", "breakfast", "guided-activities", "parking", "airport-transfer"],
  },

  // ---- Lake Bunyonyi ----------------------------------------------------
  {
    slug: "bunyonyi-ridge-retreat",
    name: "Bunyonyi Ridge Retreat",
    destination: "lake-bunyonyi",
    stayType: "lakeside-stay",
    shortDescription: "Canvas on the ridge, with the whole lake underneath you.",
    description:
      "Four tented rooms on the western ridge, reached by a steep track and worth every metre of it. Swimming is straight off the jetty, and the water is safe here in a way it is not elsewhere in the country.",
    priceFromUgx: 640000,
    rating: "4.9",
    reviewCount: 156,
    maxGuests: 4,
    featured: true,
    image: "/img/stay-bunyonyi-ridge.jpg",
    imageAlt: "Large canvas safari tent open to a green clearing",
    latitude: "-1.27340",
    longitude: "29.93460",
    amenities: ["private-bathroom", "lake-view", "breakfast", "restaurant", "campfire"],
  },
  {
    slug: "heron-island-bandas",
    name: "Heron Island Bandas",
    destination: "lake-bunyonyi",
    stayType: "lakeside-stay",
    shortDescription: "Thatched bandas on stilts, reached only by canoe.",
    description:
      "Three bandas built out over the water on one of the smaller islands. The only way in is a twenty minute paddle, which puts most of the noise of the world safely on the far shore.",
    priceFromUgx: 430000,
    rating: "4.6",
    reviewCount: 92,
    maxGuests: 3,
    featured: false,
    image: "/img/stays/stilt-hut-water.jpg",
    imageAlt: "Thatched hut on stilts standing over open water",
    latitude: "-1.30250",
    longitude: "29.91170",
    amenities: ["lake-view", "breakfast", "guided-activities"],
  },
  {
    slug: "kyabahinga-lakeside-camp",
    name: "Kyabahinga Lakeside Camp",
    destination: "lake-bunyonyi",
    stayType: "campsite",
    shortDescription: "Pitches on the shoreline terrace, ten metres from the water.",
    description:
      "Terraced camping right on the lake with hot showers, a small kitchen and canoes to borrow. The cheapest way to wake up on Bunyonyi, and arguably the best one.",
    priceFromUgx: 110000,
    rating: "4.3",
    reviewCount: 55,
    maxGuests: 6,
    featured: false,
    image: "/img/stays/lakeside-tents.jpg",
    imageAlt: "Bright dome tents reflected in still water at the edge of a forest",
    latitude: "-1.28870",
    longitude: "29.94980",
    amenities: ["lake-view", "campfire", "parking", "family-friendly"],
  },

  // ---- Jinja ------------------------------------------------------------
  {
    slug: "nile-source-cabins",
    name: "Nile Source Cabins",
    destination: "jinja",
    stayType: "cabin",
    shortDescription: "Timber and stone cottages in the garden above the river.",
    description:
      "Five cabins set in an established garden a short walk from the water. Verandas face the trees, breakfast runs late, and rafting pick-ups collect from the gate.",
    priceFromUgx: 430000,
    rating: "4.8",
    reviewCount: 87,
    maxGuests: 4,
    featured: false,
    image: "/img/stay-jinja-cabins.jpg",
    imageAlt: "Timber and stone cottage with a tiled roof set against dense green forest",
    latitude: "0.42440",
    longitude: "33.20410",
    amenities: ["wifi", "private-bathroom", "breakfast", "parking", "restaurant", "family-friendly"],
  },
  {
    slug: "bujagali-rapids-camp",
    name: "Bujagali Rapids Camp",
    destination: "jinja",
    stayType: "campsite",
    shortDescription: "Grass pitches above the rapids, and a bar that knows it.",
    description:
      "The budget end of Jinja and unapologetic about it. Pitch on the lawn or take a pre-pitched tent, then walk down to watch the kayakers work the wave until it gets dark.",
    priceFromUgx: 95000,
    rating: "4.4",
    reviewCount: 118,
    maxGuests: 8,
    featured: false,
    image: "/img/stay-forest-canopy.jpg",
    imageAlt: "Small dome tents pitched on grass beside dense green vegetation",
    latitude: "0.46020",
    longitude: "33.17690",
    amenities: ["campfire", "parking", "family-friendly", "wifi", "restaurant"],
  },
  {
    slug: "itanda-falls-house",
    name: "Itanda Falls House",
    destination: "jinja",
    stayType: "cottage",
    shortDescription: "One house, one garden, and the falls audible from the veranda.",
    description:
      "A whole house let to one party at a time, with a cook if you want one. The garden runs down towards the escarpment and the path through it is lit at night.",
    priceFromUgx: 720000,
    rating: "4.7",
    reviewCount: 44,
    maxGuests: 8,
    featured: false,
    image: "/img/stays/garden-path-dusk.jpg",
    imageAlt: "Stone path winding through a lantern-lit tropical garden at dusk",
    latitude: "0.51180",
    longitude: "33.11250",
    amenities: ["wifi", "private-bathroom", "parking", "family-friendly", "breakfast"],
  },

  // ---- Sipi Falls -------------------------------------------------------
  {
    slug: "sipi-ridge-cabins",
    name: "Sipi Ridge Cabins",
    destination: "sipi-falls",
    stayType: "cabin",
    shortDescription: "Cabins on the escarpment, with a rock pool below the middle fall.",
    description:
      "Four cabins strung along the ridge, each facing the plains that run east towards Kenya. The walk to the pool below the middle fall takes half an hour and the water is very cold.",
    priceFromUgx: 340000,
    rating: "4.7",
    reviewCount: 96,
    maxGuests: 4,
    featured: false,
    image: "/img/stays/river-pool.jpg",
    imageAlt: "Swimmer resting in a natural rock pool below an open sky",
    latitude: "1.33470",
    longitude: "34.37120",
    amenities: ["private-bathroom", "breakfast", "guided-activities", "campfire"],
  },
  {
    slug: "chebonet-coffee-cottage",
    name: "Chebonet Coffee Cottage",
    destination: "sipi-falls",
    stayType: "cottage",
    shortDescription: "Two rooms on a working arabica farm on the Elgon slopes.",
    description:
      "The farm has been growing coffee on this slope for three generations and guests are shown the whole process, from the cherry to the roast, whether or not they ask.",
    priceFromUgx: 260000,
    rating: "4.5",
    reviewCount: 38,
    maxGuests: 4,
    featured: false,
    image: "/img/stays/room-interior.jpg",
    imageAlt: "Guest room corner with cushioned seating and woven wall art",
    latitude: "1.31980",
    longitude: "34.39640",
    amenities: ["breakfast", "private-bathroom", "guided-activities", "family-friendly"],
  },

  // ---- Fort Portal ------------------------------------------------------
  {
    slug: "rwenzori-trail-house",
    name: "Rwenzori Trail House",
    destination: "fort-portal",
    stayType: "cottage",
    shortDescription: "A lawn, a long pool, and the Mountains of the Moon behind it.",
    description:
      "Base for the Rwenzori trailheads and comfortable enough that people stay an extra night before starting. The pool is heated, which after five days on the mountain matters more than it sounds.",
    priceFromUgx: 560000,
    rating: "4.6",
    reviewCount: 51,
    maxGuests: 6,
    featured: false,
    image: "/img/stays/pool-lawn.jpg",
    imageAlt: "Swimming pool with a circular seating island on a green lawn",
    latitude: "0.65410",
    longitude: "30.27390",
    amenities: ["pool", "wifi", "restaurant", "private-bathroom", "parking", "guided-activities"],
  },
  {
    slug: "crater-lakes-eco-lodge",
    name: "Crater Lakes Eco Lodge",
    destination: "fort-portal",
    stayType: "eco-lodge",
    shortDescription: "Floating rooms on a crater lake, off grid by design.",
    description:
      "Four rooms built on pontoons on one of the smaller crater lakes, with solar power, composting systems and no road noise because there is no road. Breakfast arrives by canoe.",
    priceFromUgx: 480000,
    rating: "4.8",
    reviewCount: 79,
    maxGuests: 4,
    featured: true,
    image: "/img/stays/floating-bungalows.jpg",
    imageAlt: "Row of floating bungalows on calm turquoise water",
    latitude: "0.47720",
    longitude: "30.21860",
    amenities: ["lake-view", "breakfast", "private-bathroom", "guided-activities"],
  },
];
