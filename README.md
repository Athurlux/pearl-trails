# Pearl Trails

*Stays that stay with you.*

Lodges, campsites and experiences across Uganda — the Pearl of Africa.

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
| Database | **None in Release 1** — Neon PostgreSQL is deferred |

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
npm run preview      # build for Workers and preview in the Workers runtime
npm run deploy       # build and deploy to Cloudflare Workers
npm run cf-typegen   # regenerate Cloudflare env types
```

## Layout

```
public/brand/        integrated brand assets (logos, marks, app icons)
public/img/          licensed photography — see docs/IMAGE-CREDITS.md
assets/brand/        untouched original brand kit
src/app/             layout, page, global styles, favicon
src/components/      layout/, sections/, ui/
src/data/            demo data + shared types
src/lib/             formatting + the cross-island search store
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

Neon PostgreSQL, real availability and booking, payments, accounts, owner tooling,
notifications, search infrastructure, and per-stay detail pages. See
`docs/decisions/` for the reasoning as those land.

## Credits

Photography: Unsplash, under the Unsplash License. Full list in
[`docs/IMAGE-CREDITS.md`](docs/IMAGE-CREDITS.md).
