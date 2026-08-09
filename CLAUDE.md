# Pearl Trails — Project Instructions

Project-specific context. Global engineering policy, skill routing, and the master
workflow live in `~/.claude/CLAUDE.md` and are **not** repeated here.

## Status

**Release 1 shipped: a single landing page, deployed to Cloudflare Workers.**

There is no database, no persistence, no auth and no booking. `src/data/*` is demo data
shaped like an API response. Do not add a database, ORM, queue, cache, search engine or
background worker without a decision record in `docs/decisions/`.

## What this is

Pearl Trails — a web application for booking lodge accommodation and campsite pitches
in Uganda.

Tagline: *Stays that stay with you.*

Brand assets and the colour palette live in `assets/brand/` (originals, do not edit) and
`public/brand/` (integrated). See `assets/brand/README.md` before making any visual
decision.

## Stack

Next.js 16 App Router · TypeScript · Tailwind CSS v4 (`@theme` in `src/app/globals.css`)
· Cloudflare Workers via `@opennextjs/cloudflare`.

`@cloudflare/next-on-pages` and Cloudflare Pages are deprecated for Next.js. Do not
reintroduce them from older examples.

## Architecture rules

- `src/app/page.tsx` stays a **Server Component**. Do not add `"use client"` to it.
- Client islands are `Header`, `SearchBar`, `StaysGrid`, `StayCard`, `Reveal`. Adding a
  fifth needs a reason.
- Cross-island state goes through `src/lib/searchStore.ts` (module store +
  `useSyncExternalStore`), not a page-wide provider.
- `src/data/*` mirrors the shape a Neon-backed API would return. Keep it that way so the
  swap is a loader change, not a rewrite.
- No animation library. Motion is CSS plus one IntersectionObserver.

## Content honesty rules

These are not stylistic preferences — they are the difference between a demo and a
misrepresentation.

- Properties, prices, ratings and itineraries are **fictional examples**. Never present
  them as real businesses or live rates, and keep the two on-page disclaimers.
- Structured data stays limited to `WebSite`/`Organization`. **Do not** emit
  `LodgingBusiness`, `Hotel`, `Offer` or `AggregateRating` for invented properties.
- **Look at every image before using it.** Three "safari camp" photos in the first pass
  were Wadi Rum and the Sahara. Alt text must describe what is actually in the frame,
  and the photo must plausibly depict the place it is captioned as.
- Photography is Unsplash-licensed and downloaded into `public/img/`. Record anything
  new in `docs/IMAGE-CREDITS.md`.

## Domain invariants to protect

These are the correctness rules a booking system lives or dies by. They are not yet
implemented — they are recorded now so design decisions respect them later.

- **No double-booking.** A given unit (room or pitch) cannot be held by two confirmed
  bookings for overlapping dates. This must be enforced where concurrency actually meets
  persistence, not in UI validation.
- **Availability is derived, not stored loosely.** Whatever represents "free" must
  reconcile against authoritative bookings.
- **Money is authoritative in one place.** Deposits, balances, refunds, and cancellation
  fees have one source of truth.
- **A payment attempt with an unknown outcome is not a failure.** Timeouts must not
  silently release or double-charge a booking.
- **Cancellation and refund rules are business policy**, not incidental code behavior —
  they need to be stated before they are implemented.
- **Date semantics must be explicit.** Check-in/check-out are calendar dates in a stated
  timezone, not timestamps that shift.

Record decisions about these in `docs/decisions/` rather than discovering them in code
later.

## Conventions

- Planning documents are Markdown under `docs/`.
- One decision per file in `docs/decisions/`, named `NNN-short-title.md`.
- No dependency, framework, or infrastructure choice is made without a corresponding
  decision record.

## Commands

```bash
npm run dev          # local dev server
npm run build        # production build
npm run lint         # eslint
npm run typecheck    # tsc --noEmit
npm run preview      # build for Workers and preview in the Workers runtime
npm run deploy       # build and deploy to Cloudflare Workers
```

The quality gate before any deploy is: `lint` → `typecheck` → `build` → look at the page
at 1440 / 1024 / 768 / 390 → no console errors → no horizontal overflow.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
