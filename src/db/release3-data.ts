/**
 * Release 3 property detail content.
 *
 * Keyed by the stay slugs seeded in Release 2, so this extends the existing
 * catalogue rather than replacing it.
 *
 * Two rules held throughout:
 *   1. A campsite must not read like a lodge. Options, policies, highlights and
 *      copy vary by property type, not just by name.
 *   2. Galleries are drawn from destination-themed pools, so a Bwindi property
 *      shows forest and a Kidepo property shows savanna. Every image was
 *      reviewed before it entered a pool.
 */

interface GalleryImage {
  url: string;
  alt: string;
}

/** Supporting shots by landscape. The stay's own hero always leads the gallery. */
export const galleryPools: Record<string, GalleryImage[]> = {
  forest: [
    { url: "/img/gallery/forest-lodge-night.jpg", alt: "Lodge windows glowing through dense forest after dark" },
    { url: "/img/gallery/forest-garden-path.jpg", alt: "Stone path winding through thick tropical planting" },
    { url: "/img/gallery/forest-river.jpg", alt: "Clear water running over rock between forested banks" },
    { url: "/img/exp-gorilla.jpg", alt: "Mountain gorilla resting among green forest vegetation" },
    { url: "/img/exp-hiking.jpg", alt: "Mist moving across steep forested mountain slopes" },
    { url: "/img/gallery/lodge-bathroom.jpg", alt: "Freestanding bath framed by tall canvas windows" },
  ],
  savanna: [
    { url: "/img/gallery/savanna-elephant.jpg", alt: "Elephant crossing tall grass with hills beyond" },
    { url: "/img/gallery/savanna-giraffes.jpg", alt: "Two giraffes standing together in open grassland" },
    { url: "/img/gallery/savanna-buffalo.jpg", alt: "Herd of buffalo gathered under a flat-topped acacia" },
    { url: "/img/gallery/savanna-lions.jpg", alt: "Lions resting in dry grass at the edge of scrub" },
    { url: "/img/gallery/savanna-waterhole.jpg", alt: "Elephants at a waterhole in front of a tented camp" },
    { url: "/img/gallery/savanna-game-vehicle.jpg", alt: "Open safari vehicle pausing for a giraffe on the track" },
    { url: "/img/gallery/lodge-pool-patio.jpg", alt: "Infinity pool on a stone terrace looking over open bush" },
    { url: "/img/gallery/lodge-bathroom.jpg", alt: "Freestanding bath framed by tall canvas windows" },
  ],
  lake: [
    { url: "/img/gallery/lake-sunset.jpg", alt: "Sun dropping towards still water behind palm fronds" },
    { url: "/img/gallery/lake-hillside.jpg", alt: "Terraced green hillsides running down to the shoreline" },
    { url: "/img/dest-bunyonyi.jpg", alt: "Hillsides dropping into the still water of a lake" },
    { url: "/img/stays/stilt-hut-water.jpg", alt: "Thatched hut on stilts standing over open water" },
    { url: "/img/gallery/lodge-pool-patio.jpg", alt: "Infinity pool on a stone terrace above the water" },
  ],
  river: [
    { url: "/img/gallery/river-rapids.jpg", alt: "White water breaking over rock in a wide river" },
    { url: "/img/gallery/forest-river.jpg", alt: "Clear water running over rock between forested banks" },
    { url: "/img/dest-jinja.jpg", alt: "Wooden footbridge crossing white water at sunrise" },
    { url: "/img/exp-boat.jpg", alt: "Wooden boats drawn up on a green riverbank" },
    { url: "/img/gallery/forest-garden-path.jpg", alt: "Stone path winding through thick tropical planting" },
  ],
  highland: [
    { url: "/img/gallery/highland-waterfall.jpg", alt: "Waterfall dropping through a green gorge with a rainbow in the spray" },
    { url: "/img/gallery/highland-slopes.jpg", alt: "Green valley and distant mountains under moving cloud" },
    { url: "/img/dest-sipi.jpg", alt: "Powerful waterfall falling into a river below the escarpment" },
    { url: "/img/exp-birding.jpg", alt: "Small group scanning the canopy with binoculars" },
    { url: "/img/gallery/forest-garden-path.jpg", alt: "Stone path winding through thick tropical planting" },
  ],
};

export interface AccommodationSeed {
  slug: string;
  name: string;
  shortDescription: string;
  guestCapacity: number;
  bedDescription: string;
  priceFromUgx: number;
  sizeSqm?: number;
  features: string[];
  image: string;
  imageAlt: string;
}

export interface StayDetailSeed {
  /** Which themed pool this property draws its gallery from. */
  pool: keyof typeof galleryPools;
  /** Indexes into the pool — varied so neighbouring properties differ. */
  gallery: number[];
  highlights: string[];
  locationNote: string;
  gettingThere: string;
  checkInTime: string;
  checkOutTime: string;
  childrenNote: string;
  petsNote: string;
  smokingNote: string;
  mealsNote: string;
  accessibilityNote: string;
  ratings: { cleanliness: string; location: string; service: string; experience: string };
  options: AccommodationSeed[];
}

const LODGE_BED = "/img/stays/lodge-bedroom.jpg";
const LODGE_BED_ALT = "Lodge bedroom with a draped four-poster bed and deep sofas";
const TENT_INT = "/img/stays/tent-interior.jpg";
const TENT_INT_ALT = "Interior of a canvas tent with folding chairs and a writing table";
const ROOM_INT = "/img/stays/room-interior.jpg";
const ROOM_INT_ALT = "Guest room corner with cushioned seating and woven wall art";
const CANVAS = "/img/stays/tented-camp-canvas.jpg";
const CANVAS_ALT = "Large canvas safari tent standing open beneath green trees";
const DOME = "/img/stay-forest-canopy.jpg";
const DOME_ALT = "Small dome tents pitched on grass beside dense vegetation";
const CABIN = "/img/stay-jinja-cabins.jpg";
const CABIN_ALT = "Timber and stone cottage with a veranda set against forest";
const BATH = "/img/gallery/lodge-bathroom.jpg";
const BATH_ALT = "Freestanding bath framed by tall canvas windows";
const STILT = "/img/stays/stilt-hut-water.jpg";
const STILT_ALT = "Thatched banda on stilts standing over open water";
const FLOAT = "/img/stays/floating-bungalows.jpg";
const FLOAT_ALT = "Floating bungalows moored on calm water";
const DECK = "/img/stay-kidepo-plains.jpg";
const DECK_ALT = "Timber deck with an open-air bath above wild bush";

export const stayDetails: Record<string, StayDetailSeed> = {
  // ---------------- Bwindi ----------------
  "forest-canopy-lodge": {
    pool: "forest",
    // Skips forest-lodge-night (index 0): it is a lit lodge in dark jungle, too
    // close to this property's own hero to sit beside it in one gallery.
    gallery: [1, 2, 3, 5],
    highlights: ["Forest setting", "Guided gorilla trekking", "Breakfast included", "Solar powered", "Twenty minutes from the trailhead"],
    locationNote: "On the slope above Buhoma, with the forest boundary about two hundred metres from the last room.",
    gettingThere: "Roughly nine hours by road from Kampala, or a scheduled flight to Kihihi and a ninety minute transfer.",
    checkInTime: "14:00",
    checkOutTime: "10:00",
    childrenNote: "Children over eight are welcome. Gorilla permits are issued from fifteen years old.",
    petsNote: "No pets, in line with park rules on the forest boundary.",
    smokingNote: "No smoking anywhere on the property. The forest edge is dry for much of the year.",
    mealsNote: "Breakfast included. Lunch and dinner served on the deck, with trek packed lunches on request.",
    accessibilityNote: "The site is built on a slope with steps between levels. One ground-floor room avoids the main stairs.",
    ratings: { cleanliness: "4.9", location: "5.0", service: "4.8", experience: "4.9" },
    options: [
      { slug: "forest-suite", name: "Forest Suite", shortDescription: "Corner room with glass on two sides and a private veranda over the canopy.", guestCapacity: 2, bedDescription: "1 king bed", priceFromUgx: 1120000, sizeSqm: 42, features: ["Private veranda", "Forest view", "Wood stove", "Breakfast included"], image: LODGE_BED, imageAlt: LODGE_BED_ALT },
      { slug: "canopy-room", name: "Canopy Room", shortDescription: "The original rooms along the upper walkway, quieter and closer to the trees.", guestCapacity: 2, bedDescription: "1 queen bed", priceFromUgx: 920000, sizeSqm: 30, features: ["Forest view", "Private bathroom", "Breakfast included"], image: ROOM_INT, imageAlt: ROOM_INT_ALT },
      { slug: "family-cottage", name: "Family Cottage", shortDescription: "Two connected rooms with a shared sitting area, set slightly apart from the main lodge.", guestCapacity: 4, bedDescription: "1 king bed and 2 singles", priceFromUgx: 1480000, sizeSqm: 58, features: ["Two bedrooms", "Sitting room", "Family friendly", "Breakfast included"], image: CABIN, imageAlt: CABIN_ALT },
    ],
  },
  "mubwindi-treetop-cabins": {
    pool: "forest",
    gallery: [1, 2, 4, 0],
    highlights: ["Cabins on stilts", "Level with the canopy", "Exceptional birding", "Off the main trail"],
    locationNote: "Above the Mubwindi swamp trail on the eastern side of the forest, at about 2350 metres.",
    gettingThere: "Ninety minutes on rough road from Buhoma. A high-clearance vehicle is strongly recommended.",
    checkInTime: "14:00",
    checkOutTime: "10:00",
    childrenNote: "Suitable for children over twelve. The walkways are high and unfenced in places.",
    petsNote: "No pets.",
    smokingNote: "No smoking. The cabins are timber and the walkways are timber.",
    mealsNote: "Breakfast included. A set dinner is served in the main cabin at seven.",
    accessibilityNote: "Reached by raised boardwalk and steps only. Not suitable for wheelchair users.",
    ratings: { cleanliness: "4.7", location: "4.9", service: "4.6", experience: "4.8" },
    options: [
      { slug: "treetop-cabin", name: "Treetop Cabin", shortDescription: "A single cabin on its own platform, glass on the forest side from floor to ceiling.", guestCapacity: 2, bedDescription: "1 double bed", priceFromUgx: 640000, sizeSqm: 24, features: ["Forest view", "Private bathroom", "Boardwalk access"], image: ROOM_INT, imageAlt: ROOM_INT_ALT },
      { slug: "birders-cabin", name: "Birders Cabin", shortDescription: "The furthest cabin along the walkway, facing the swamp where the turacos come through at dawn.", guestCapacity: 2, bedDescription: "2 single beds", priceFromUgx: 700000, sizeSqm: 24, features: ["Swamp outlook", "Early breakfast", "Guided activities"], image: LODGE_BED, imageAlt: LODGE_BED_ALT },
    ],
  },
  "ruhija-ridge-camp": {
    pool: "forest",
    gallery: [4, 0, 2, 3],
    highlights: ["High ridge position", "Walk-in canvas tents", "Campfire evenings", "Serious birding trail below camp"],
    locationNote: "On the eastern ridge at Ruhija, with the forest falling away on both sides of the camp.",
    gettingThere: "About two hours from Buhoma on the forest road, or four from Kabale.",
    checkInTime: "13:00",
    checkOutTime: "10:00",
    childrenNote: "Children over ten. Nights are cold and the walk to the ablutions is unlit.",
    petsNote: "No pets.",
    smokingNote: "Smoking only at the fire pit.",
    mealsNote: "Breakfast included. Simple dinners cooked over wood, vegetarian by default unless you say otherwise.",
    accessibilityNote: "Uneven ground and a short climb from the parking area. Shared bathrooms are a short walk from the tents.",
    ratings: { cleanliness: "4.5", location: "4.8", service: "4.6", experience: "4.7" },
    options: [
      { slug: "ridge-tent", name: "Ridge Tent", shortDescription: "Walk-in canvas with a proper bed, a writing desk and a bucket shower filled on request.", guestCapacity: 2, bedDescription: "1 double bed", priceFromUgx: 380000, features: ["Forest view", "Campfire", "Bucket shower"], image: TENT_INT, imageAlt: TENT_INT_ALT },
    ],
  },

  // ---------------- Murchison Falls ----------------
  "nile-bend-safari-camp": {
    pool: "savanna",
    gallery: [4, 0, 5, 7],
    highlights: ["Riverbank terrace", "Game drives from camp", "Boat trip to the falls", "Hippo audible at night"],
    locationNote: "On the south bank where the Nile turns north, inside the park boundary.",
    gettingThere: "Five to six hours from Kampala by road, or a short flight to Pakuba and a transfer.",
    checkInTime: "14:00",
    checkOutTime: "10:00",
    childrenNote: "Children of all ages, though under-fives are not permitted on the boat trip.",
    petsNote: "No pets inside the national park.",
    smokingNote: "Smoking on the terrace only.",
    mealsNote: "Breakfast included. Lunch and dinner available; the kitchen holds food for late game drives.",
    accessibilityNote: "Level paths between the tents and the terrace, with a short ramp to the dining area.",
    ratings: { cleanliness: "4.8", location: "4.9", service: "4.8", experience: "4.9" },
    options: [
      { slug: "river-tent", name: "River Tent", shortDescription: "Canvas on a raised deck facing the water, with the terrace a few steps away.", guestCapacity: 2, bedDescription: "1 king bed", priceFromUgx: 780000, sizeSqm: 36, features: ["River view", "Private deck", "Private bathroom", "Breakfast included"], image: CANVAS, imageAlt: CANVAS_ALT },
      { slug: "family-tent", name: "Family Tent", shortDescription: "A larger tent set back from the bank with a partitioned second sleeping area.", guestCapacity: 4, bedDescription: "1 king bed and 2 singles", priceFromUgx: 1180000, sizeSqm: 52, features: ["Family friendly", "Private bathroom", "Breakfast included"], image: TENT_INT, imageAlt: TENT_INT_ALT },
    ],
  },
  "victoria-nile-camp": {
    pool: "river",
    gallery: [0, 2, 3, 4],
    highlights: ["Riverside pitches", "Bring your own or take a ready tent", "Shared kitchen", "Central fire pit"],
    locationNote: "On the riverbank outside the park gate, a short drive from the ferry crossing.",
    gettingThere: "Five hours from Kampala on tar and then twenty minutes of murram.",
    checkInTime: "12:00",
    checkOutTime: "11:00",
    childrenNote: "Family friendly. The riverbank is unfenced, so children need supervision.",
    petsNote: "Well-behaved dogs are accepted outside park boundaries.",
    smokingNote: "Smoking at the fire pit and on your own pitch.",
    mealsNote: "Self-catering with a covered kitchen and gas rings. A simple breakfast can be ordered the night before.",
    accessibilityNote: "Grass pitches and shared ablutions. The ground is flat but soft after rain.",
    ratings: { cleanliness: "4.2", location: "4.6", service: "4.4", experience: "4.5" },
    options: [
      { slug: "own-tent-pitch", name: "Own Tent Pitch", shortDescription: "A marked grass pitch on the terrace above the river with power at the kitchen.", guestCapacity: 3, bedDescription: "Bring your own", priceFromUgx: 150000, features: ["Campfire", "Shared kitchen", "Parking", "Family friendly"], image: DOME, imageAlt: DOME_ALT },
      { slug: "ready-tent", name: "Ready Tent", shortDescription: "A pitched dome tent with mattresses and bedding already in place.", guestCapacity: 2, bedDescription: "2 mattresses with bedding", priceFromUgx: 260000, features: ["Bedding provided", "Campfire", "Shared kitchen"], image: DOME, imageAlt: DOME_ALT },
    ],
  },
  "paraa-escarpment-lodge": {
    pool: "savanna",
    gallery: [6, 0, 1, 4],
    highlights: ["Escarpment position", "Pool facing west", "Airstrip transfers", "Late dining for game drives"],
    locationNote: "Along the ridge above the delta, with the river visible from every room on a clear day.",
    gettingThere: "Scheduled flights to Pakuba take about an hour from Entebbe; transfers are included on request.",
    checkInTime: "14:00",
    checkOutTime: "10:00",
    childrenNote: "All ages. Two family rooms have interconnecting doors.",
    petsNote: "No pets inside the national park.",
    smokingNote: "Designated area beside the pool terrace.",
    mealsNote: "Breakfast included; full board available. The dining room stays open for anyone back late from the falls.",
    accessibilityNote: "Level access from the car park to reception, dining and the pool. Two rooms are step-free.",
    ratings: { cleanliness: "4.9", location: "4.9", service: "4.9", experience: "4.8" },
    options: [
      { slug: "escarpment-room", name: "Escarpment Room", shortDescription: "West-facing room along the ridge with a private balcony over the delta.", guestCapacity: 2, bedDescription: "1 king bed", priceFromUgx: 1150000, sizeSqm: 38, features: ["River view", "Balcony", "Air conditioning", "Breakfast included"], image: LODGE_BED, imageAlt: LODGE_BED_ALT },
      { slug: "delta-suite", name: "Delta Suite", shortDescription: "The two end suites, with a separate sitting room and an outdoor bath on the terrace.", guestCapacity: 2, bedDescription: "1 king bed", priceFromUgx: 1680000, sizeSqm: 64, features: ["Outdoor bath", "Sitting room", "River view", "Breakfast included"], image: BATH, imageAlt: BATH_ALT },
      { slug: "family-room", name: "Family Room", shortDescription: "Interconnecting rooms sharing a balcony, set at the quieter end of the ridge.", guestCapacity: 4, bedDescription: "1 king bed and 2 singles", priceFromUgx: 1720000, sizeSqm: 60, features: ["Family friendly", "Balcony", "Pool access", "Breakfast included"], image: ROOM_INT, imageAlt: ROOM_INT_ALT },
    ],
  },

  // ---------------- Queen Elizabeth ----------------
  "kazinga-wilderness-lodge": {
    pool: "savanna",
    gallery: [0, 5, 4, 6],
    highlights: ["Open-sided lounge", "Ten minutes from the channel jetty", "Boat safaris", "Family friendly"],
    locationNote: "Between the two lakes near the Kazinga Channel, with the jetty a short drive from the gate.",
    gettingThere: "Six hours from Kampala via Mbarara, or a flight to Mweya airstrip.",
    checkInTime: "14:00",
    checkOutTime: "10:00",
    childrenNote: "All ages welcome. Life jackets in child sizes are carried on the boat.",
    petsNote: "No pets inside the national park.",
    smokingNote: "Smoking outside the main building only.",
    mealsNote: "Breakfast included. Lunch and dinner served in the open lounge; packed lunches for full-day drives.",
    accessibilityNote: "The lounge and dining area are step-free. Rooms are reached by a short gravel path.",
    ratings: { cleanliness: "4.7", location: "4.8", service: "4.7", experience: "4.7" },
    options: [
      { slug: "channel-room", name: "Channel Room", shortDescription: "Paired rooms behind the lounge, each with a shaded veranda facing the water.", guestCapacity: 2, bedDescription: "1 queen bed", priceFromUgx: 870000, sizeSqm: 32, features: ["Veranda", "Private bathroom", "Breakfast included"], image: ROOM_INT, imageAlt: ROOM_INT_ALT },
      { slug: "savanna-suite", name: "Savanna Suite", shortDescription: "A larger corner suite with its own sitting area and a wider outlook over the plain.", guestCapacity: 3, bedDescription: "1 king bed and 1 single", priceFromUgx: 1240000, sizeSqm: 48, features: ["Sitting area", "Plains view", "Breakfast included"], image: LODGE_BED, imageAlt: LODGE_BED_ALT },
    ],
  },
  "kyambura-gorge-retreat": {
    pool: "savanna",
    gallery: [6, 7, 4, 1],
    highlights: ["Built on the gorge rim", "Pool cut into the terrace", "Chimpanzee tracking", "Local stone construction"],
    locationNote: "On the lip of the Kyambura gorge, where the forest below sits well beneath the surrounding savanna.",
    gettingThere: "About forty minutes from Katunguru gate on the Ishasha road.",
    checkInTime: "14:00",
    checkOutTime: "11:00",
    childrenNote: "Children over twelve. Chimpanzee tracking is permitted from fifteen.",
    petsNote: "No pets inside the national park.",
    smokingNote: "No smoking in the rooms or on the terrace.",
    mealsNote: "Breakfast included. The kitchen leans on produce from the neighbouring co-operative.",
    accessibilityNote: "Stone paths with occasional steps between the terrace and the rooms.",
    ratings: { cleanliness: "4.9", location: "4.9", service: "4.9", experience: "5.0" },
    options: [
      { slug: "gorge-room", name: "Gorge Room", shortDescription: "Stone-walled room opening onto the terrace, with the gorge directly below.", guestCapacity: 2, bedDescription: "1 king bed", priceFromUgx: 1050000, sizeSqm: 40, features: ["Gorge view", "Terrace access", "Pool", "Breakfast included"], image: LODGE_BED, imageAlt: LODGE_BED_ALT },
      { slug: "rim-suite", name: "Rim Suite", shortDescription: "The furthest room along the rim, with an outdoor bath under the acacia.", guestCapacity: 2, bedDescription: "1 king bed", priceFromUgx: 1420000, sizeSqm: 56, features: ["Outdoor bath", "Gorge view", "Pool", "Breakfast included"], image: BATH, imageAlt: BATH_ALT },
    ],
  },
  "ishasha-fig-tree-camp": {
    pool: "savanna",
    gallery: [3, 2, 5, 0],
    highlights: ["Southern sector", "Fig grove setting", "Tree-climbing lions", "No fence, no generator after ten"],
    locationNote: "In the fig grove near the Ntungwe river, in the quiet southern sector of the park.",
    gettingThere: "Two hours south of Mweya on the Ishasha road, or three from Bwindi coming north.",
    checkInTime: "13:00",
    checkOutTime: "10:00",
    childrenNote: "Children over twelve. The camp is unfenced and animals move through at night.",
    petsNote: "No pets inside the national park.",
    smokingNote: "Smoking at the fire pit only.",
    mealsNote: "Breakfast included. Dinner is a set menu served around one table.",
    accessibilityNote: "Sandy paths between tents. Solar lanterns are provided for the walk after dark.",
    ratings: { cleanliness: "4.5", location: "4.8", service: "4.7", experience: "4.8" },
    options: [
      { slug: "fig-tree-tent", name: "Fig Tree Tent", shortDescription: "Canvas under the figs with a bucket shower and a view onto the riverine strip.", guestCapacity: 2, bedDescription: "1 double bed", priceFromUgx: 560000, features: ["Campfire", "Private bathroom", "Guided activities"], image: CANVAS, imageAlt: CANVAS_ALT },
      { slug: "river-tent-ishasha", name: "River Tent", shortDescription: "The two tents closest to the Ntungwe, where the lions are most often heard.", guestCapacity: 2, bedDescription: "1 queen bed", priceFromUgx: 690000, features: ["River outlook", "Campfire", "Guided activities"], image: TENT_INT, imageAlt: TENT_INT_ALT },
    ],
  },

  // ---------------- Kidepo Valley ----------------
  "kidepo-plains-camp": {
    pool: "savanna",
    gallery: [4, 2, 0, 7],
    highlights: ["Outdoor bath on every deck", "Rock outcrop above the valley", "Buffalo herds below camp", "Fly-in access"],
    locationNote: "On a granite outcrop above the Narus valley, with the Morungole range holding the eastern horizon.",
    gettingThere: "A scheduled flight from Entebbe takes about two hours. By road it is a full day and a half.",
    checkInTime: "14:00",
    checkOutTime: "10:00",
    childrenNote: "Children over twelve. The decks are open and the drop below the outcrop is real.",
    petsNote: "No pets inside the national park.",
    smokingNote: "No smoking in the rooms. The valley is tinder dry in the long season.",
    mealsNote: "Full board. Everything is flown or driven in, so menus follow what arrived.",
    accessibilityNote: "Rooms are reached by stone steps cut into the outcrop. Not step-free.",
    ratings: { cleanliness: "5.0", location: "5.0", service: "4.9", experience: "5.0" },
    options: [
      { slug: "valley-room", name: "Valley Room", shortDescription: "Stone and canvas room with its own deck and an outdoor bath facing the plain.", guestCapacity: 2, bedDescription: "1 king bed", priceFromUgx: 1480000, sizeSqm: 46, features: ["Outdoor bath", "Private deck", "Valley view", "Full board"], image: DECK, imageAlt: DECK_ALT },
      { slug: "outcrop-suite", name: "Outcrop Suite", shortDescription: "The highest room on the rock, with a sitting area and the widest outlook in camp.", guestCapacity: 2, bedDescription: "1 king bed", priceFromUgx: 1980000, sizeSqm: 68, features: ["Outdoor bath", "Sitting room", "Valley view", "Full board"], image: BATH, imageAlt: BATH_ALT },
    ],
  },
  "narus-valley-tented-camp": {
    pool: "savanna",
    gallery: [0, 4, 1, 5],
    highlights: ["Seasonal camp", "Meals served outside", "Moved yearly to follow the water", "Very few other vehicles"],
    locationNote: "On the valley floor near the permanent water, where the game concentrates in the dry season.",
    gettingThere: "Fly to Kidepo airstrip and transfer twenty minutes, or drive from Kitgum in about four hours.",
    checkInTime: "14:00",
    checkOutTime: "10:00",
    childrenNote: "Children over twelve.",
    petsNote: "No pets inside the national park.",
    smokingNote: "Smoking at the fire only.",
    mealsNote: "Full board. Lunch and dinner are laid outside whenever the weather allows, which is most days.",
    accessibilityNote: "Flat ground throughout, though surfaces are natural and uneven in places.",
    ratings: { cleanliness: "4.7", location: "4.9", service: "4.7", experience: "4.9" },
    options: [
      { slug: "narus-tent", name: "Narus Tent", shortDescription: "Classic safari canvas with a bucket shower behind and the valley in front.", guestCapacity: 2, bedDescription: "1 double bed", priceFromUgx: 690000, features: ["Valley view", "Campfire", "Full board"], image: CANVAS, imageAlt: CANVAS_ALT },
    ],
  },
  "apoka-ridge-lodge": {
    pool: "savanna",
    gallery: [1, 3, 6, 4],
    highlights: ["Long afternoons by design", "Rebuilt around the original frame", "Early and late game drives", "Airstrip transfers"],
    locationNote: "On the ridge above Apoka, looking south across the valley towards the Narus.",
    gettingThere: "Twenty minutes from Kidepo airstrip. The road route is a full two days from Kampala.",
    checkInTime: "13:00",
    checkOutTime: "11:00",
    childrenNote: "All ages. Two rooms interconnect for families.",
    petsNote: "No pets inside the national park.",
    smokingNote: "Smoking on the lower terrace.",
    mealsNote: "Full board. The kitchen holds lunch for anyone still out on a drive.",
    accessibilityNote: "Level throughout the main building; one room has step-free access from the car park.",
    ratings: { cleanliness: "4.8", location: "4.9", service: "4.9", experience: "4.8" },
    options: [
      { slug: "ridge-room", name: "Ridge Room", shortDescription: "Deep chairs, a wide veranda and nothing at all to hurry for.", guestCapacity: 2, bedDescription: "1 king bed", priceFromUgx: 980000, sizeSqm: 40, features: ["Veranda", "Valley view", "Full board"], image: LODGE_BED, imageAlt: LODGE_BED_ALT },
      { slug: "ridge-family-room", name: "Ridge Family Room", shortDescription: "Two interconnecting rooms at the quiet end of the ridge with a shared veranda.", guestCapacity: 4, bedDescription: "1 king bed and 2 singles", priceFromUgx: 1560000, sizeSqm: 66, features: ["Family friendly", "Veranda", "Full board"], image: ROOM_INT, imageAlt: ROOM_INT_ALT },
    ],
  },

  // ---------------- Lake Bunyonyi ----------------
  "bunyonyi-ridge-retreat": {
    pool: "lake",
    gallery: [0, 1, 2, 4],
    highlights: ["Whole-lake outlook", "Swimming straight off the jetty", "No bilharzia, no crocodiles", "Canoes to borrow"],
    locationNote: "High on the western ridge, with the lake and most of its islands laid out below the tents.",
    gettingThere: "Twenty-five minutes from Kabale on a steep track. Transfers are arranged from town.",
    checkInTime: "14:00",
    checkOutTime: "10:00",
    childrenNote: "All ages, though the track down to the jetty is steep.",
    petsNote: "Dogs accepted by prior arrangement.",
    smokingNote: "Smoking on your own deck only.",
    mealsNote: "Breakfast included. Dinner is served in the main tent, usually around one table.",
    accessibilityNote: "The ridge site involves a steep approach and steps between levels.",
    ratings: { cleanliness: "4.9", location: "5.0", service: "4.9", experience: "4.9" },
    options: [
      { slug: "ridge-tent-bunyonyi", name: "Ridge Tent", shortDescription: "Tented room on a timber deck with the whole lake in front of it.", guestCapacity: 2, bedDescription: "1 queen bed", priceFromUgx: 640000, sizeSqm: 30, features: ["Lake view", "Private deck", "Breakfast included"], image: CANVAS, imageAlt: CANVAS_ALT },
      { slug: "lake-suite", name: "Lake Suite", shortDescription: "The largest deck on the ridge, with a bath positioned to face the water.", guestCapacity: 2, bedDescription: "1 king bed", priceFromUgx: 940000, sizeSqm: 44, features: ["Outdoor bath", "Lake view", "Breakfast included"], image: BATH, imageAlt: BATH_ALT },
      { slug: "ridge-family-tent", name: "Family Tent", shortDescription: "A double tent sharing one deck, suited to a family or two couples travelling together.", guestCapacity: 4, bedDescription: "1 queen bed and 2 singles", priceFromUgx: 1180000, sizeSqm: 52, features: ["Family friendly", "Lake view", "Breakfast included"], image: ROOM_INT, imageAlt: ROOM_INT_ALT },
    ],
  },
  "heron-island-bandas": {
    pool: "lake",
    gallery: [3, 0, 2, 1],
    highlights: ["Reached only by canoe", "Built out over the water", "No road noise at all", "Breakfast paddled in"],
    locationNote: "On one of the smaller islands, twenty minutes of paddling from the mainland jetty.",
    gettingThere: "Drive to the jetty below Kabale, then a canoe transfer arranged with your arrival time.",
    checkInTime: "15:00",
    checkOutTime: "10:00",
    childrenNote: "Children over eight, and only with an adult on the water.",
    petsNote: "No pets.",
    smokingNote: "No smoking in the bandas. The structures are timber and thatch.",
    mealsNote: "Breakfast included and delivered by canoe. Dinner by arrangement the day before.",
    accessibilityNote: "Access is by canoe and a short jetty. Not suitable for limited mobility.",
    ratings: { cleanliness: "4.6", location: "5.0", service: "4.5", experience: "4.8" },
    options: [
      { slug: "water-banda", name: "Water Banda", shortDescription: "Thatched banda on stilts with the lake directly beneath the floor.", guestCapacity: 2, bedDescription: "1 double bed", priceFromUgx: 430000, features: ["Lake view", "Over-water deck", "Breakfast included"], image: STILT, imageAlt: STILT_ALT },
      { slug: "island-banda", name: "Island Banda", shortDescription: "The banda set back on the island itself, a little larger and out of the wind.", guestCapacity: 3, bedDescription: "1 double bed and 1 single", priceFromUgx: 520000, features: ["Lake view", "Family friendly", "Breakfast included"], image: FLOAT, imageAlt: FLOAT_ALT },
    ],
  },
  "kyabahinga-lakeside-camp": {
    pool: "lake",
    gallery: [1, 2, 0, 4],
    highlights: ["Pitches ten metres from the water", "Hot showers", "Canoes to borrow", "Cheapest way to wake up on Bunyonyi"],
    locationNote: "On the terraced shoreline on the eastern side of the lake, below the main road.",
    gettingThere: "Fifteen minutes from Kabale, with the last stretch on murram.",
    checkInTime: "12:00",
    checkOutTime: "11:00",
    childrenNote: "Family friendly, though the water is deep close to the shore.",
    petsNote: "Dogs welcome on a lead.",
    smokingNote: "Smoking on your own pitch and at the fire.",
    mealsNote: "Self-catering with a small shared kitchen. Breakfast can be ordered the night before.",
    accessibilityNote: "Terraced grass pitches reached by steps from the parking area.",
    ratings: { cleanliness: "4.2", location: "4.7", service: "4.3", experience: "4.4" },
    options: [
      { slug: "shoreline-pitch", name: "Shoreline Pitch", shortDescription: "A grass terrace pitch on the water, with power at the kitchen.", guestCapacity: 3, bedDescription: "Bring your own", priceFromUgx: 110000, features: ["Lake view", "Campfire", "Shared kitchen", "Family friendly"], image: DOME, imageAlt: DOME_ALT },
      { slug: "lakeside-ready-tent", name: "Ready Tent", shortDescription: "A pitched tent with mattresses and bedding, set on the lowest terrace.", guestCapacity: 2, bedDescription: "2 mattresses with bedding", priceFromUgx: 190000, features: ["Lake view", "Bedding provided", "Campfire"], image: DOME, imageAlt: DOME_ALT },
    ],
  },

  // ---------------- Jinja ----------------
  "nile-source-cabins": {
    pool: "river",
    gallery: [2, 4, 1, 3],
    highlights: ["Established garden", "Short walk to the water", "Rafting pick-up from the gate", "Late breakfast"],
    locationNote: "In a mature garden above the river, a few minutes from the source and the town.",
    gettingThere: "Two hours from Kampala on the Jinja road, or ninety minutes outside the morning rush.",
    checkInTime: "14:00",
    checkOutTime: "10:00",
    childrenNote: "Family friendly. The garden is enclosed and away from the road.",
    petsNote: "Dogs welcome by arrangement.",
    smokingNote: "Smoking on the verandas only.",
    mealsNote: "Breakfast included and served until eleven, which suits people back from the early rafting run.",
    accessibilityNote: "Level garden paths; two cabins have step-free entry.",
    ratings: { cleanliness: "4.8", location: "4.7", service: "4.8", experience: "4.7" },
    options: [
      { slug: "garden-cabin", name: "Garden Cabin", shortDescription: "Timber and stone cabin with a veranda facing the trees.", guestCapacity: 2, bedDescription: "1 queen bed", priceFromUgx: 430000, sizeSqm: 28, features: ["Veranda", "Wi-Fi", "Breakfast included"], image: CABIN, imageAlt: CABIN_ALT },
      { slug: "family-cabin-jinja", name: "Family Cabin", shortDescription: "The two-bedroom cabin at the end of the garden, with its own sitting room.", guestCapacity: 5, bedDescription: "1 queen bed and 3 singles", priceFromUgx: 780000, sizeSqm: 54, features: ["Two bedrooms", "Family friendly", "Wi-Fi", "Breakfast included"], image: ROOM_INT, imageAlt: ROOM_INT_ALT },
    ],
  },
  "bujagali-rapids-camp": {
    pool: "river",
    gallery: [0, 2, 3, 1],
    highlights: ["Above the rapids", "Pitch or pre-pitched tent", "Bar with a view of the wave", "Rafting and kayaking on the doorstep"],
    locationNote: "On the escarpment above Bujagali, where the kayakers work the standing wave until dark.",
    gettingThere: "Twenty minutes north of Jinja town on the east bank road.",
    checkInTime: "12:00",
    checkOutTime: "11:00",
    childrenNote: "Family friendly, though the escarpment edge is unfenced.",
    petsNote: "Dogs welcome.",
    smokingNote: "Smoking outside the dorm and bar areas.",
    mealsNote: "Self-catering plus a bar kitchen serving simple food most of the day.",
    accessibilityNote: "Grass pitches on a gentle slope with shared ablutions.",
    ratings: { cleanliness: "4.1", location: "4.7", service: "4.4", experience: "4.6" },
    options: [
      { slug: "lawn-pitch", name: "Lawn Pitch", shortDescription: "Pitch on the grass above the rapids, with power and water at the block.", guestCapacity: 4, bedDescription: "Bring your own", priceFromUgx: 95000, features: ["Campfire", "Parking", "Wi-Fi", "Family friendly"], image: DOME, imageAlt: DOME_ALT },
      { slug: "pre-pitched-tent", name: "Pre-pitched Tent", shortDescription: "A dome tent already up on the lawn with mattresses and bedding inside.", guestCapacity: 2, bedDescription: "2 mattresses with bedding", priceFromUgx: 160000, features: ["Bedding provided", "Campfire", "Wi-Fi"], image: DOME, imageAlt: DOME_ALT },
    ],
  },
  "itanda-falls-house": {
    pool: "river",
    gallery: [1, 4, 0, 2],
    highlights: ["Whole house, one party", "Cook available", "Falls audible from the veranda", "Lit garden path"],
    locationNote: "Above the escarpment near Itanda, with the falls a short walk downstream.",
    gettingThere: "Forty minutes north of Jinja town, the last stretch on graded murram.",
    checkInTime: "15:00",
    checkOutTime: "11:00",
    childrenNote: "Family friendly. The garden runs towards the escarpment, so children need watching.",
    petsNote: "Dogs welcome by arrangement.",
    smokingNote: "Smoking outside only.",
    mealsNote: "Self-catering, or a cook can be arranged with the house for an additional daily rate.",
    accessibilityNote: "Single storey with level access from the driveway to the main rooms.",
    ratings: { cleanliness: "4.7", location: "4.6", service: "4.6", experience: "4.7" },
    options: [
      { slug: "whole-house", name: "The Whole House", shortDescription: "Four bedrooms, a garden and a veranda, let to one party at a time.", guestCapacity: 8, bedDescription: "2 doubles and 4 singles", priceFromUgx: 720000, sizeSqm: 210, features: ["Whole property", "Kitchen", "Wi-Fi", "Family friendly", "Parking"], image: CABIN, imageAlt: CABIN_ALT },
    ],
  },

  // ---------------- Sipi Falls ----------------
  "sipi-ridge-cabins": {
    pool: "highland",
    gallery: [0, 1, 2, 4],
    highlights: ["Escarpment cabins", "Rock pool below the middle fall", "Plains view towards Kenya", "Coffee walks"],
    locationNote: "On the escarpment above Sipi trading centre, facing east over the plains towards Kenya.",
    gettingThere: "Six hours from Kampala via Mbale, then forty minutes uphill.",
    checkInTime: "14:00",
    checkOutTime: "10:00",
    childrenNote: "Children over six. The paths to the falls are steep and slippery after rain.",
    petsNote: "No pets.",
    smokingNote: "Smoking on your own veranda.",
    mealsNote: "Breakfast included. Dinner is a set menu; the coffee is grown on the slope below.",
    accessibilityNote: "The cabins sit along a sloping ridge with steps between them.",
    ratings: { cleanliness: "4.6", location: "4.9", service: "4.6", experience: "4.8" },
    options: [
      { slug: "escarpment-cabin", name: "Escarpment Cabin", shortDescription: "Timber cabin on the ridge with a veranda facing the plains.", guestCapacity: 2, bedDescription: "1 double bed", priceFromUgx: 340000, sizeSqm: 26, features: ["Plains view", "Veranda", "Breakfast included"], image: CABIN, imageAlt: CABIN_ALT },
      { slug: "falls-cabin", name: "Falls Cabin", shortDescription: "The cabin nearest the path down to the middle fall, with the water audible at night.", guestCapacity: 3, bedDescription: "1 double bed and 1 single", priceFromUgx: 420000, sizeSqm: 32, features: ["Waterfall outlook", "Veranda", "Breakfast included"], image: ROOM_INT, imageAlt: ROOM_INT_ALT },
    ],
  },
  "chebonet-coffee-cottage": {
    pool: "highland",
    gallery: [1, 4, 3, 0],
    highlights: ["Working arabica farm", "Three generations on the same slope", "Roasting demonstration", "Two rooms only"],
    locationNote: "On the lower slopes of Mount Elgon, in the middle of the family coffee shamba.",
    gettingThere: "Twenty minutes from Sipi trading centre on a farm track.",
    checkInTime: "13:00",
    checkOutTime: "10:00",
    childrenNote: "Family friendly. The farm is working land, so children stay with an adult.",
    petsNote: "Farm dogs are already in residence; guest pets are not accepted.",
    smokingNote: "No smoking on the farm.",
    mealsNote: "Breakfast included, cooked by the family. Lunch and dinner on request.",
    accessibilityNote: "Farm tracks and uneven ground throughout.",
    ratings: { cleanliness: "4.5", location: "4.6", service: "4.8", experience: "4.7" },
    options: [
      { slug: "farmhouse-room", name: "Farmhouse Room", shortDescription: "One of two rooms in the family house, simple and very quiet.", guestCapacity: 2, bedDescription: "1 double bed", priceFromUgx: 260000, features: ["Breakfast included", "Farm tour", "Family friendly"], image: ROOM_INT, imageAlt: ROOM_INT_ALT },
    ],
  },

  // ---------------- Fort Portal ----------------
  "rwenzori-trail-house": {
    pool: "highland",
    gallery: [1, 2, 0, 3],
    highlights: ["Rwenzori trailhead base", "Heated pool", "Drying room for wet kit", "Long lawn under the mountains"],
    locationNote: "Outside Fort Portal on the road towards the Rwenzori trailheads, with the range behind the garden.",
    gettingThere: "Five hours from Kampala, or a short flight to Kasese and a forty minute transfer.",
    checkInTime: "14:00",
    checkOutTime: "11:00",
    childrenNote: "All ages. The pool is unfenced and needs supervision.",
    petsNote: "Dogs welcome by arrangement.",
    smokingNote: "Smoking on the lawn only.",
    mealsNote: "Breakfast included and served early for anyone starting a climb.",
    accessibilityNote: "Single storey with level access from the drive to all main rooms.",
    ratings: { cleanliness: "4.6", location: "4.6", service: "4.7", experience: "4.6" },
    options: [
      { slug: "trail-room", name: "Trail Room", shortDescription: "A simple, warm room built for people arriving off the mountain.", guestCapacity: 2, bedDescription: "1 double bed", priceFromUgx: 560000, sizeSqm: 26, features: ["Pool", "Wi-Fi", "Drying room", "Breakfast included"], image: ROOM_INT, imageAlt: ROOM_INT_ALT },
      { slug: "mountain-suite", name: "Mountain Suite", shortDescription: "The corner suite with a sitting area and the clearest view of the range.", guestCapacity: 3, bedDescription: "1 king bed and 1 single", priceFromUgx: 820000, sizeSqm: 44, features: ["Mountain view", "Sitting room", "Pool", "Breakfast included"], image: LODGE_BED, imageAlt: LODGE_BED_ALT },
      { slug: "trail-family-room", name: "Family Room", shortDescription: "Two rooms sharing a door, with space for wet boots and packs.", guestCapacity: 4, bedDescription: "1 double bed and 2 singles", priceFromUgx: 940000, sizeSqm: 48, features: ["Family friendly", "Pool", "Wi-Fi", "Breakfast included"], image: CABIN, imageAlt: CABIN_ALT },
    ],
  },
  "crater-lakes-eco-lodge": {
    pool: "lake",
    gallery: [0, 1, 4, 2],
    highlights: ["Rooms on pontoons", "Solar and composting systems", "No road, so no road noise", "Breakfast by canoe"],
    locationNote: "On one of the smaller crater lakes south of Fort Portal, reached on foot and then by water.",
    gettingThere: "Forty minutes from Fort Portal, then a ten minute walk and a short paddle. Luggage is ferried for you.",
    checkInTime: "14:00",
    checkOutTime: "10:00",
    childrenNote: "Children over ten, and only with an adult on the water.",
    petsNote: "No pets.",
    smokingNote: "No smoking on the pontoons.",
    mealsNote: "Breakfast included and paddled out to you. Dinner is served on the main deck.",
    accessibilityNote: "Access involves a walking path and a canoe transfer.",
    ratings: { cleanliness: "4.8", location: "4.9", service: "4.7", experience: "4.9" },
    options: [
      { slug: "floating-room", name: "Floating Room", shortDescription: "A room built on its own pontoon, with the water on all four sides.", guestCapacity: 2, bedDescription: "1 double bed", priceFromUgx: 480000, sizeSqm: 24, features: ["Lake view", "Solar powered", "Breakfast included"], image: FLOAT, imageAlt: FLOAT_ALT },
      { slug: "shore-cabin", name: "Shore Cabin", shortDescription: "The one land-based cabin, set into the crater wall above the water.", guestCapacity: 3, bedDescription: "1 double bed and 1 single", priceFromUgx: 560000, sizeSqm: 30, features: ["Crater view", "Family friendly", "Breakfast included"], image: CABIN, imageAlt: CABIN_ALT },
    ],
  },
};

export interface ExperienceSeed {
  slug: string;
  name: string;
  shortDescription: string;
  description: string;
  destination: string | null;
  category: string;
  duration: string;
  priceFromUgx: number | null;
  image: string;
  imageAlt: string;
  featured: boolean;
}

export const experienceSeed: ExperienceSeed[] = [
  { slug: "gorilla-trekking", name: "Gorilla Trekking", shortDescription: "A permit, a guide, and however long the forest takes to give you an hour.", description: "Groups leave the briefing point at eight. The walk can be forty minutes or it can be six hours, and nobody can tell you which in advance. The hour you get with the family at the end of it is fixed by the park, and it is the reason people come to Uganda.", destination: "bwindi", category: "Wildlife", duration: "Full day", priceFromUgx: 2800000, image: "/img/exp-gorilla.jpg", imageAlt: "Mountain gorilla among green forest vegetation", featured: true },
  { slug: "forest-nature-walk", name: "Guided Nature Walk", shortDescription: "Three hours on the forest trails with a guide who knows what made the noise.", description: "A slower way into Bwindi than the trek. Waterfall trail, river trail or the Muzabajiro loop depending on your legs and the weather.", destination: "bwindi", category: "Walking", duration: "3 hours", priceFromUgx: 180000, image: "/img/exp-hiking.jpg", imageAlt: "Mist across steep forested slopes", featured: false },
  { slug: "game-drive", name: "Game Drive", shortDescription: "Out before the light, back when the plains go quiet.", description: "Morning and late afternoon drives in an open vehicle with a guide. Kidepo and Queen Elizabeth both reward the early start more than the late one.", destination: null, category: "Wildlife", duration: "Half day", priceFromUgx: 320000, image: "/img/exp-game-drive.jpg", imageAlt: "Two giraffes at golden hour", featured: true },
  { slug: "boat-safari", name: "Boat Safari", shortDescription: "Three hours on the water, level with whatever came down to drink.", description: "The Kazinga Channel carries one of the densest hippo populations anywhere. On the Nile the boat runs up to the base of the falls and turns in the spray.", destination: null, category: "Water", duration: "3 hours", priceFromUgx: 260000, image: "/img/exp-boat.jpg", imageAlt: "Small boat on calm water", featured: true },
  { slug: "chimpanzee-tracking", name: "Chimpanzee Tracking", shortDescription: "Down into the gorge, where the forest sits below the savanna.", description: "The Kyambura gorge holds a habituated community in a strip of riverine forest surrounded by open plain. Finding them is not guaranteed, and the guides say so.", destination: "queen-elizabeth", category: "Wildlife", duration: "Half day", priceFromUgx: 720000, image: "/img/exp-birding.jpg", imageAlt: "Group scanning the canopy with binoculars", featured: false },
  { slug: "bird-watching", name: "Bird Watching", shortDescription: "An early start with a guide who can name it before you have focused.", description: "Uganda lists over a thousand species. Bwindi has the Albertine Rift endemics, the Kazinga shoreline has the waders, and Mabamba has the shoebill.", destination: null, category: "Wildlife", duration: "Morning", priceFromUgx: 150000, image: "/img/exp-birding.jpg", imageAlt: "Group scanning the canopy with binoculars", featured: false },
  { slug: "waterfall-hike", name: "Waterfall Hike", shortDescription: "All three Sipi falls in a loop, with the middle one worth the detour.", description: "A guided loop down the escarpment taking in the three falls. Steep in places and genuinely slippery after rain, so proper shoes matter.", destination: "sipi-falls", category: "Walking", duration: "Half day", priceFromUgx: 120000, image: "/img/gallery/highland-waterfall.jpg", imageAlt: "Waterfall dropping through a green gorge", featured: false },
  { slug: "coffee-tour", name: "Coffee Farm Tour", shortDescription: "Cherry to cup on the slope where it grew, with the family who grew it.", description: "Picking, pulping, drying, hulling and roasting, walked through on a working arabica farm on the Elgon slopes. You drink the result.", destination: "sipi-falls", category: "Culture", duration: "3 hours", priceFromUgx: 90000, image: "/img/exp-culture.jpg", imageAlt: "People working together outdoors", featured: false },
  { slug: "white-water-rafting", name: "White Water Rafting", shortDescription: "Grade five water on the Nile, with a safety kayak for every raft.", description: "A full day on the river below the source. Rapids are graded and the operators run a safety boat alongside. There is a gentler family float if the big water is not for you.", destination: "jinja", category: "Adventure", duration: "Full day", priceFromUgx: 480000, image: "/img/gallery/river-rapids.jpg", imageAlt: "White water breaking over rock", featured: true },
  { slug: "canoe-trip", name: "Canoe Trip", shortDescription: "A dugout, a paddle, and the quietest water in the country.", description: "Out among the islands of Bunyonyi in a stable dugout with a local paddler, or out yourself if you would rather. Best in the first hour after sunrise.", destination: "lake-bunyonyi", category: "Water", duration: "2 hours", priceFromUgx: 70000, image: "/img/gallery/lake-sunset.jpg", imageAlt: "Sun dropping towards still water", featured: false },
  { slug: "community-visit", name: "Community Visit", shortDescription: "An afternoon arranged by the community, not about them.", description: "Village walks, craft workshops and dance run by community associations near the parks, with the fee going to the association rather than an intermediary.", destination: null, category: "Culture", duration: "Half day", priceFromUgx: 110000, image: "/img/exp-culture.jpg", imageAlt: "People dancing together on open ground", featured: false },
  { slug: "campfire-dinner", name: "Campfire Dinner", shortDescription: "Dinner cooked over wood and eaten outside, weather permitting.", description: "Arranged at camps that have the space for it. Simple food, a long table and no electric light. Cancelled without fuss when the rain comes.", destination: null, category: "Dining", duration: "Evening", priceFromUgx: 140000, image: "/img/stays/campfire-evening.jpg", imageAlt: "Guests gathered around an open campfire", featured: false },
];

/** Which experiences belong to which stays, by slug. Varies by property type. */
export const stayExperienceMap: Record<string, string[]> = {
  "forest-canopy-lodge": ["gorilla-trekking", "forest-nature-walk", "bird-watching", "community-visit"],
  "mubwindi-treetop-cabins": ["bird-watching", "gorilla-trekking", "forest-nature-walk"],
  "ruhija-ridge-camp": ["bird-watching", "forest-nature-walk", "gorilla-trekking", "campfire-dinner"],
  "nile-bend-safari-camp": ["boat-safari", "game-drive", "bird-watching"],
  "victoria-nile-camp": ["boat-safari", "campfire-dinner", "game-drive"],
  "paraa-escarpment-lodge": ["boat-safari", "game-drive", "bird-watching", "community-visit"],
  "kazinga-wilderness-lodge": ["boat-safari", "game-drive", "chimpanzee-tracking", "bird-watching"],
  "kyambura-gorge-retreat": ["chimpanzee-tracking", "game-drive", "boat-safari", "community-visit"],
  "ishasha-fig-tree-camp": ["game-drive", "campfire-dinner", "bird-watching"],
  "kidepo-plains-camp": ["game-drive", "community-visit", "bird-watching"],
  "narus-valley-tented-camp": ["game-drive", "campfire-dinner", "bird-watching"],
  "apoka-ridge-lodge": ["game-drive", "community-visit", "campfire-dinner"],
  "bunyonyi-ridge-retreat": ["canoe-trip", "bird-watching", "community-visit"],
  "heron-island-bandas": ["canoe-trip", "bird-watching"],
  "kyabahinga-lakeside-camp": ["canoe-trip", "campfire-dinner", "community-visit"],
  "nile-source-cabins": ["white-water-rafting", "boat-safari", "community-visit"],
  "bujagali-rapids-camp": ["white-water-rafting", "campfire-dinner"],
  "itanda-falls-house": ["white-water-rafting", "waterfall-hike", "community-visit"],
  "sipi-ridge-cabins": ["waterfall-hike", "coffee-tour", "bird-watching"],
  "chebonet-coffee-cottage": ["coffee-tour", "waterfall-hike", "community-visit"],
  "rwenzori-trail-house": ["waterfall-hike", "bird-watching", "community-visit"],
  "crater-lakes-eco-lodge": ["canoe-trip", "bird-watching", "waterfall-hike"],
};
