# 004 — Trip access, itinerary ownership, and idempotent generation

## Context

Release 5 gives a booking a trip planner: a day-by-day itinerary the traveller can read
on the road and edit. That changes the security question Release 4 answered.

Decision 003 made the booking reference a capability: ~30 bits, unguessable in practice,
guarding a **read-only** page with masked contact details. That was proportionate.

A trip planner is not read-only. It accepts writes, stores free text the traveller wrote
themselves, and shows the itinerary unmasked. Guarding *mutation* with the same 30 bits
the traveller reads aloud over the phone to a lodge is a worse trade than guarding a
masked summary with it.

There are still no accounts, and Release 5 is not the release that adds them.

## Decision

### A separate trip token

The trip planner lives at `/trip/[token]`.

- 160 bits from `crypto.getRandomValues`, rendered in the same Crockford-style base32
  alphabet as the reference (32 characters, no `I`/`L`/`O`/`U`).
- The database stores **only a SHA-256 hash** (`bookings.trip_token_hash`, unique). A
  dump of the bookings table does not hand anyone a working trip URL.
- Lookup hashes the incoming token and matches on the hash, so the raw token exists only
  in the traveller's URL bar and in the request line.

This is deliberately *not* derived from the reference. If it were, the reference would
still be the real credential and the token would be decoration.

### How a traveller gets the link

Two paths, and neither is "type your reference and you are in":

1. **Straight after booking.** The submit redirect carries the token once:
   `/booking/PT-2026-K4M8XQ?trip=<token>`. The confirmation page validates it against
   that booking and, if it matches, renders a direct "Open your trip planner" link. The
   traveller has just proved they are the traveller by creating the booking.
2. **Later, from the reference alone.** The confirmation page offers a small form: the
   email address on the booking. A match **mints a new token**, replaces the stored hash,
   and redirects to the new trip URL. This is the second factor — something the holder of
   a guessed reference does not know.

   It mints rather than retrieves because only a hash is stored, so there is nothing to
   retrieve. That is a consequence worth stating plainly instead of designing around: a
   previously saved trip link stops working when this is used, and the form says so
   before the traveller submits it. The alternative — keeping the token in plain text so
   it can be re-shown — trades a permanent weakness for a small convenience.

The email check compares a normalised address in constant-ish time and answers the same
way whether the booking is missing or the email is wrong, so it cannot be used to
enumerate references or confirm that a given address booked a given stay.

### Read-only stays read-only

`/booking/[reference]` is unchanged from Release 4: reference-keyed, masked contact
details, no mutation, no itinerary detail, no trip note. Everything Release 4 promised
about that page still holds. The trip planner is strictly additive.

### The booking owns the itinerary

No `Trip` entity. In this product one booking *is* one trip — one stay, one property, one
date range — so a separate table would carry a foreign key, a status mirroring the
booking's, and nothing else. `itinerary_items` hangs off `bookings` directly.

### Item provenance decides what may be touched

`itinerary_items.source` is one of:

| source | comes from | traveller may |
| --- | --- | --- |
| `system` | check-in and check-out, from the booking and the property's stated times | nothing |
| `experience` | an experience requested with the booking | move the day and time of day |
| `traveller` | something they added themselves | edit and delete freely |

This is enforced in the `WHERE` clause of every mutation, not by hiding buttons. A
traveller cannot delete their check-out by posting an id, and cannot remove a requested
experience from their booking by removing it from the plan — those are different acts,
and only the first is a plan edit. Booking truth is changed through booking management,
which does not exist yet, and the interface says so rather than pretending.

### Generation is idempotent by constraint, not by checking first

Opening a trip generates any missing base items. That runs on every visit, including
concurrent ones, so "check whether items exist, then insert" is a race that produces
duplicate check-ins.

Instead two partial unique indexes make duplication impossible:

```
unique (booking_id, system_kind)          where system_kind is not null
unique (booking_id, booking_experience_id) where booking_experience_id is not null
```

Generation is a single `INSERT … ON CONFLICT DO NOTHING`. Running it a hundred times in
parallel produces exactly one check-in, one check-out, and one item per requested
experience. This also handles the Release 4 bookings that predate itineraries: there is
no backfill migration, because the first visit *is* the backfill.

### Dates are bounded by the booking, in SQL

A traveller item must fall within `[check_in, check_out]`. A `CHECK` constraint cannot see
another row, so the bound is applied inside the write itself:

```sql
INSERT INTO itinerary_items (booking_id, day, …)
SELECT b.id, $day, … FROM bookings b
WHERE b.id = $id AND $day >= b.check_in AND $day <= b.check_out
```

No row inserted means out of range. There is no window between checking and writing.

### Times of day, not invented clock times

Only check-in and check-out carry an exact time, and those come from the property's
published `check_in_time` / `check_out_time`. Everything else is `morning`, `afternoon`,
`evening` or `flexible`.

Printing "08:00 — Gorilla Trekking" would be inventing an appointment nobody made. The
permit time is arranged with the traveller afterwards, and Release 5 has no operator
scheduling to make it true.

## Rejected

**Reusing the booking reference for the trip.** One less concept, one less link to keep.
Rejected because it puts write access behind the value travellers are told to quote
publicly.

**A token in a query string on the trip page itself** (`/trip/REF?k=…`). Query strings
end up in more logs and are stripped by more link handlers than path segments. The token
is the whole address instead.

**Storing the token in plain text.** Cheaper lookup, but then read access to one table is
write access to every trip.

**A `sort_order` column as the primary ordering.** Ordering is `day`, then time of day,
then a stable tie-break on id — derived from meaning rather than from a number that has
to be rewritten every time something moves.

**Server-rendered PDF.** Print CSS gets the traveller a saved itinerary with the browser
they already have, and adds no dependency and no rendering service.

## Consequences

- `bookings.trip_token_hash` is `NOT NULL` for new rows. Release 4 bookings created before
  this migration get a token generated in the migration itself, so no booking is left
  without a trip.
- The token is a credential and must never be logged, put in analytics, or included in
  an error report. Trip pages set `referrer: no-referrer` so an outbound click cannot leak
  the address.
- Trip pages are `noindex, nofollow` with no social card, for the same reasons as 003.
- When accounts arrive, a trip can be claimed by an owner and the token demoted to a
  share link, without changing the itinerary model.
