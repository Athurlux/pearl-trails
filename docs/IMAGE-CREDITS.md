# Image credits

Every photograph in `public/img/` comes from [Unsplash](https://unsplash.com) and is
used under the [Unsplash License](https://unsplash.com/license), which permits free
commercial and non-commercial use without permission. Files were downloaded into the
repository rather than hot-linked, so the site has no third-party image dependency at
runtime.

Attribution is not legally required by the Unsplash License, but it is recorded here
because knowing the provenance of an asset matters more than the licence minimum.

## Verification rule

**Every image was opened and looked at before it was used.** Three photographs that
matched the search terms turned out to be shot in Wadi Rum and the Sahara — they were
removed and replaced rather than shipped as Ugandan lodges. Any future image added to
this project gets the same treatment: view it, confirm it plausibly depicts the place
it claims to, then write an `imageAlt` that describes what is actually in the frame.

Release 2 added fifteen stay photographs in `public/img/stays/` plus destination images
for Sipi Falls and Fort Portal. All were reviewed on a single contact sheet before use;
six candidates were rejected — two desert scenes, one showing a real camp's name on a
sign, one near-duplicate of an existing photo, and two too weak to carry a card. One more
was dropped after it turned out to be the same room, from the same shoot, as an image
already in use.

**No two stays share a photograph.** Enforced by the seed and checked in the database:

```sql
SELECT count(*), count(DISTINCT image) FROM stays;  -- must be equal
```

## Files

| File | Used for |
| --- | --- |
| `hero-uganda.jpg` | Hero background — terraced hills above a lake |
| `editorial-kidepo.jpg` | Editorial feature — acacia at sunset |
| `cta-savanna.jpg` | Final CTA background |
| `dest-bwindi.jpg` | Destination: Bwindi |
| `dest-murchison.jpg` | Destination: Murchison Falls |
| `dest-queen-elizabeth.jpg` | Destination: Queen Elizabeth |
| `dest-kidepo.jpg` | Destination: Kidepo Valley |
| `dest-bunyonyi.jpg` | Destination: Lake Bunyonyi + Lakeside Stays category |
| `dest-jinja.jpg` | Destination: Jinja |
| `stay-bwindi-canopy.jpg` | Stay: Forest Canopy Lodge |
| `stay-nile-bend.jpg` | Stay: Nile Bend Safari Camp |
| `stay-bunyonyi-ridge.jpg` | Stay: Bunyonyi Ridge Retreat + Tented Camps category |
| `stay-kidepo-plains.jpg` | Stay: Kidepo Plains Camp + Eco Lodges category |
| `stay-kazinga.jpg` | Stay: Kazinga Wilderness Lodge + Safari Lodges category |
| `stay-jinja-cabins.jpg` | Stay: Nile Source Cabins + Cabins & Cottages category |
| `stay-forest-canopy.jpg` | Campsites category |
| `exp-gorilla.jpg` | Experience: Gorilla Trekking |
| `exp-game-drive.jpg` | Experience: Game Drives |
| `exp-boat.jpg` | Experience: Boat Safaris |
| `exp-hiking.jpg` | Experience: Hiking |
| `exp-birding.jpg` | Experience: Bird Watching |
| `exp-culture.jpg` | Experience: Cultural Experiences |

## Brand assets

Everything in `public/brand/` and the favicons are the supplied Pearl Trails brand kit.
The originals are preserved untouched in `assets/brand/` — see `assets/brand/README.md`.
