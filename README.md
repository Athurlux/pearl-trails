# Pearl Trails

*Stays that stay with you.*

Lodges, campsites and experiences across Uganda — the Pearl of Africa.

## Release 4 — Booking Flow & Reservation Requests

Pearl Trails stops being a discovery product and becomes a reservation-request product. A
traveller can go from the landing page to a stored booking with a reference, and come back
to it later.

### The journey

`/book/[slug]` is a five-step flow, carrying whatever the traveller already chose on the
property page:

1. **Your stay** — pick an accommodation, with live availability for the chosen dates.
2. **Dates & guests** — validated against the accommodation's real capacity.
3. **Experiences** — optional, skippable, priced per guest.
4. **Your details** — name, email, phone, country, notes. Nothing more.
5. **Review** — everything editable in place, then *Request booking*.

Submission lands on `/booking/[reference]`, which survives refresh, a new browser session
and a redeploy, because it is a row in Neon.

### What makes it correct

- **Availability is real.** `inventory_count` per accommodation option, minus blocking
  bookings that overlap the requested nights. Half-open dates: a checkout on the 15th does
  not conflict with a check-in on the 15th.
- **Double-booking is impossible, not merely unlikely.** A Postgres
  `EXCLUDE USING gist` constraint over (option, unit, date range) refuses it at the
  storage layer. Application bugs, scripts and future admin tools all hit the same wall.
  This matters because the Cloudflare-compatible Neon HTTP driver has no interactive
  transactions — the constraint is what replaces `SELECT … FOR UPDATE`.
- **The client cannot set a price.** There is no total, subtotal or rate field in the
  form. The server reloads catalogue prices and recomputes every figure.
- **Double submits collapse into one booking.** Each attempt carries a `requestToken`
  under a unique index; a replay returns the original reference.
- **PII stays out of the URL**, and the confirmation page masks contact details, exposes
  no internal ids and emits no social metadata — the reference is a capability.

### What it does not claim

No payment is taken. No property has seen the request. Nothing is emailed. A submitted
booking is `pending`, and every screen says so in those words.

### New database objects

| Object | Purpose |
| --- | --- |
| `bookings` | The reservation request, with price and night-count snapshots |
| `booking_experiences` | Selected experiences, with name and price snapshots |
| `booking_status` enum | `pending`, `confirmed`, `cancelled`, `expired` |
| `accommodation_options.inventory_count` | How many equivalent units exist |
| `bookings_no_overlapping_unit` | The exclusion constraint that forbids double-booking |
| `bookings_option_stay_fk` | Composite FK: an accommodation must belong to its stay |

Migration `drizzle/0002_release4_bookings.sql` is additive — two new tables, one enum, and
one column with a safe default. Nothing is dropped, renamed or retyped, so Release 3 code
runs unchanged against this schema and an application rollback needs no schema rollback.

```bash
npm run db:generate   # write a migration from schema changes
npm run db:migrate    # apply pending migrations
npm run db:seed       # idempotent; sets per-option inventory
npm run test          # 144 tests, incl. overlap, capacity, idempotency, concurrency
npm run deploy        # build for Workers and deploy to Cloudflare
```

### Deferred on purpose

Payments, traveller accounts, email/SMS, operator confirmation, cancellations and refunds,
automatic expiry of pending requests, multi-room bookings, and activity scheduling. Each
is absent because the data or infrastructure to do it honestly does not exist yet —
see `docs/decisions/002` for why there is no `expiresAt` column.

## Release 3 — Property Details

Every stay now has a full property page at `/stays/[slug]`:

- **Gallery** — hero plus a two-by-two block on desktop, a snap rail on mobile, and a
  keyboard-navigable lightbox (arrows, Escape, focus return) written in-house rather than
  pulled from a dependency.
- **Overview, highlights, amenities** — amenities use one inline icon family, with the
  overflow behind a `<details>` so it works without JavaScript.
- **Ways to stay** — 1–3 accommodation options per property, varied by type. A campsite
  offers a pitch and a ready tent; an escarpment lodge offers rooms and a suite.
- **Experiences, location, good to know, guest ratings, related stays.**
- **Trip planner** — dates, guests and accommodation held in the URL, with a live
  estimated stay subtotal. Sticky sidebar on desktop, bottom bar on mobile.

Trip context (`checkIn`, `checkOut`, `guests`, `option`) carries from Explore through the
property page into `/book/[slug]`. Release 4 turned that hand-off into the real booking
flow and added `exp` for selected experiences.

*At the time of Release 3 there was no availability model, and the planner said so.
Release 4 added one — the planner's "nothing is reserved" wording is still accurate, since
a hold only exists once a request is submitted.*

## Release 2 — Explore Stays

`/stays` is a database-backed discovery experience: search, filter, sort and page through
a catalogue of Ugandan lodges, campsites, cabins and lakeside retreats.

- **Search** — Postgres full-text over name, summary and description (weighted, GIN
  indexed), with a substring fallback so partial words still match.
- **Filters** — destination, stay type (multi), max price, guests, minimum rating, and
  amenities (AND semantics: "pool and Wi-Fi" means both).
- **Sort** — Recommended (featured, then rating; relevance first when searching), price
  low→high, price high→low, top rated. Every ordering ends with `id` so pages are stable.
- **State lives in the URL** — every search is shareable, survives refresh, and the back
  button steps through it.
- **Mobile** — a bottom sheet with a live "Show N stays" button, not a squeezed sidebar.
- **Saved stays** — localStorage only. No accounts in this release.

Dates are carried through the URL and shown in the hero, but there is no availability
model yet, so the page never claims a stay is free on them.

### Database

Neon PostgreSQL, accessed with Drizzle ORM over the Neon **HTTP** driver — Workers cannot
open raw TCP sockets, so pooled/websocket drivers are the wrong tool. Four tables:
`destinations`, `stays`, `amenities`, `stay_amenities`.

```bash
cp .env.example .env.local     # then paste your Neon connection string
npm run db:migrate             # apply migrations in drizzle/
npm run db:seed                # 8 destinations, 12 amenities, 22 stays
```

The seed is **idempotent** — every write upserts on a natural slug and amenity links are
replaced rather than appended, so re-running it produces the same database. It is an
operator command only; nothing invokes it automatically.

For production, `DATABASE_URL` is a Worker secret:

```bash
npx wrangler secret put DATABASE_URL
```

## Release 1 — landing page

Release 1 is a single, complete marketing landing page. It is deliberately not the
product: there is no database, no accounts, no booking and no payments. What it does
have is the real brand, real (freely licensed) photography, and interaction that works
rather than gestures at working.

**Sections, in order:** navigation · hero · search · Explore Uganda · exceptional stays ·
stay categories · experiences · editorial feature · trip preview · why Pearl Trails ·
final CTA · footer.

### What is real in this release

- The search control filters the demo stays and announces the result. It does not 404.
- Save-to-favourite toggles per stay card (client state only, not persisted).
- The header changes state over the hero and has a working mobile sheet.
- Prices are in UGX, formatted with `Intl.NumberFormat`.

### What is demo data

Properties, prices, ratings and itineraries are original examples written for this
preview. They are **not real businesses and not live rates**, and the page says so in
two places. Structured data is limited to `WebSite`/`Organization` — no fabricated
lodging listings.

## Stack

| Concern | Choice |
| --- | --- |
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 (CSS-first `@theme`) |
| Fonts | Fraunces + Inter via `next/font/google` |
| Hosting | Cloudflare Workers via `@opennextjs/cloudflare` |
| Database | Neon PostgreSQL |
| ORM | Drizzle (`drizzle-orm/neon-http`) |
| Tests | Vitest |

`@opennextjs/cloudflare` on Workers is the current, supported path. The older
`@cloudflare/next-on-pages` adapter and Cloudflare Pages deployment are deprecated for
Next.js and are deliberately not used here.

## Architecture

`src/app/page.tsx` is a Server Component. Only four things ship JavaScript:

- `Header` — scroll state and the mobile sheet
- `SearchBar` — the search form
- `StaysGrid` / `StayCard` — filtered results and the save toggle
- `Reveal` — an IntersectionObserver fade, no animation library

`SearchBar` and `StaysGrid` are separate islands with server-rendered content between
them. They share state through a module-level store (`src/lib/searchStore.ts`) read with
`useSyncExternalStore`, so no page-wide client provider is needed.

`src/data/*` is shaped like an API response on purpose. When Neon arrives, the loader
changes; the components do not.

## Commands

```bash
npm run dev          # local dev server
npm run build        # production build
npm run lint         # eslint
npm run typecheck    # tsc --noEmit
npm run test         # vitest — DB tests skip themselves without DATABASE_URL
npm run db:generate  # write a migration from schema changes
npm run db:migrate   # apply pending migrations
npm run db:seed      # idempotent demo catalogue
npm run db:studio    # inspect the database
npm run preview      # build for Workers and preview in the Workers runtime
npm run deploy       # build and deploy to Cloudflare Workers
npm run cf-typegen   # regenerate Cloudflare env types
```

### Deploying

1. `npm run lint && npm run typecheck && npm test`
2. `npm run db:migrate` against the target database
3. `npm run deploy`
4. Cold-load `/` and `/stays` on the deployed URL and confirm the filters respond — a
   client-side navigation can mask a hydration failure that a fresh load exposes.

## Layout

```
public/brand/        integrated brand assets (logos, marks, app icons)
public/img/          licensed photography — see docs/IMAGE-CREDITS.md
assets/brand/        untouched original brand kit
drizzle/             generated SQL migrations
src/app/             routes: /, /stays, /stays/[slug]
src/components/      layout/, sections/ (landing), stays/ (explore), ui/
src/db/              schema, connection, seed data, seed script
src/data/            editorial content that is not catalogue data
src/lib/             query layer, URL param parsing, formatting, saved stays
docs/                planning, decisions, image credits
wrangler.jsonc       Cloudflare Worker configuration
open-next.config.ts  OpenNext adapter configuration
```

## Accessibility and motion

Skip link, single `h1`, labelled form controls, `role="search"`, a polite live region on
search results, visible gold focus rings, and alt text that describes what is actually
in each photograph. All motion is disabled under `prefers-reduced-motion`, and the
reveal effect never hides content when scripting is unavailable.

## Deferred

Real availability and booking, payments, accounts, owner tooling, notifications, and the
full property-detail experience (Release 3). External search infrastructure is
deliberately not used — Postgres is more than sufficient at this scale, and the query
layer is separated from the UI so that can change without touching components.

## Credits

Photography: Unsplash, under the Unsplash License. Full list in
[`docs/IMAGE-CREDITS.md`](docs/IMAGE-CREDITS.md).
