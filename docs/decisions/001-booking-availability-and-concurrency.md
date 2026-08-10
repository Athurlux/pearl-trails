# 001 — Booking availability and concurrency

## Context

Release 4 introduces the first reservation requests. Two travellers can request the last
Forest Suite for overlapping dates at the same moment. The project invariant recorded in
`CLAUDE.md` is explicit:

> **No double-booking.** A given unit cannot be held by two confirmed bookings for
> overlapping dates. This must be enforced where concurrency actually meets persistence,
> not in UI validation.

The runtime constrains how that can be done. The database driver is
`drizzle-orm/neon-http` over `@neondatabase/serverless`, chosen in Release 2 because
Cloudflare Workers cannot open raw TCP sockets. That driver **throws** on
`db.transaction()`:

```
Error: No transactions support in neon-http driver
```

Only `db.batch()` exists, which sends a fixed list of statements in one implicit
transaction and cannot branch on a result mid-flight. So the usual
`BEGIN … SELECT FOR UPDATE … INSERT … COMMIT` is unavailable.

`check availability → return → insert` across two round trips is unsafe regardless of
driver: another request fits between the two.

## Decision

**Availability is a derived query. The no-overlap rule is enforced by a Postgres
exclusion constraint, and booking creation is a single atomic statement.**

Three parts.

### 1. Inventory

`accommodation_options.inventory_count` — how many equivalent units of that option exist
(3 Forest Suites, 12 camping pitches). `smallint NOT NULL DEFAULT 1 CHECK (> 0)`.

Default 1 is deliberately conservative: existing rows become single-unit rather than
silently unlimited. The seed then sets realistic per-option counts.

This is not a hotel inventory engine. There is no per-unit identity, no room numbering,
no rate calendar. It is the minimum needed to stop a demo booking exceeding a real
configured capacity.

### 2. Overlap semantics

Standard hotel half-open intervals: `[check_in, check_out)`. A stay checking out on the
15th does not conflict with one checking in on the 15th.

Expressed once, as `daterange(check_in, check_out, '[)')`, and used by both the
availability query and the constraint — so they cannot drift apart.

### 3. The constraint, and unit assignment

Each booking is assigned a `unit_index` in `1..inventory_count`. The constraint:

```sql
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE bookings ADD CONSTRAINT bookings_no_overlapping_unit EXCLUDE USING gist (
  accommodation_option_id WITH =,
  unit_index              WITH =,
  daterange(check_in, check_out, '[)') WITH &&
) WHERE (status IN ('pending', 'confirmed'));
```

Postgres now refuses to store two blocking bookings on the same unit of the same option
over overlapping dates. Not "the application refuses" — the database refuses. A bug in a
route handler, a mistaken script, or a future admin tool cannot produce an overbooking.

Creation is one statement. Free unit selection, the insert, and the experience rows all
happen inside it, so there is no window between reading and writing:

```sql
WITH free AS (
  SELECT g AS unit_index
  FROM generate_series(1, (SELECT inventory_count FROM accommodation_options WHERE id = $1)) g
  WHERE g NOT IN (
    SELECT unit_index FROM bookings
    WHERE accommodation_option_id = $1
      AND status IN ('pending', 'confirmed')
      AND daterange(check_in, check_out, '[)') && daterange($2, $3, '[)')
  )
  ORDER BY g LIMIT 1
),
new_booking AS (INSERT INTO bookings (...) SELECT ... FROM free RETURNING ...),
new_experiences AS (INSERT INTO booking_experiences (...) SELECT ... FROM new_booking, jsonb_to_recordset($n) ...)
SELECT * FROM new_booking;
```

`inventory_count` is read from the database inside the statement, never accepted from the
caller. If `free` is empty the insert writes zero rows and the service reports a conflict.

Under a genuine race both statements can pick the same `unit_index` — each takes its
snapshot before the other commits. The second then violates the exclusion constraint and
fails with SQLSTATE `23P01`. The service catches that, retries, and the retry's fresh
snapshot sees the committed row and picks the next free unit. Retries are bounded
(`inventory_count + 2`, capped) and exhaustion is reported as a conflict, not a crash.

So the constraint is the authority and the retry is the recovery, which is the correct
ordering: correctness does not depend on the retry working.

## Alternatives rejected

**`SELECT … FOR UPDATE` on the option row.** Needs an interactive transaction the driver
does not have. Even as a single statement with a locking CTE it is unsound at READ
COMMITTED: a statement that blocks on a row lock keeps its original snapshot, so the
counting subquery can still miss the row that just committed.

**Advisory locks.** `pg_advisory_xact_lock` needs a transaction. Session-level
`pg_advisory_lock` over HTTP is worse — each statement may land on a different backend,
so the lock leaks and is never released.

**Switching to the websocket/pool driver to get transactions.** Reverses a deliberate
Release 2 decision and reintroduces the socket problem on Workers, to solve a problem an
exclusion constraint already solves better. A constraint holds against every writer;
a transaction only holds against writers that remember to use it.

**Redis or an external lock service.** A whole dependency and failure surface for an
invariant Postgres enforces natively.

**A `units` table with one row per physical unit.** More faithful long-term, but Release 4
has no per-unit attributes to store, and it would add a join to every availability query
for no behavioural gain. `unit_index` can be backfilled into such a table later.

## Consequences

- `btree_gist` is now a required extension on the Neon branch. It ships with Neon; the
  migration creates it and is idempotent.
- Blocking statuses are baked into the constraint predicate. Changing which statuses block
  inventory is a migration, not a code edit — see `002-booking-status-and-expiry.md`.
- One booking holds exactly one unit. Multi-unit and group bookings are not supported and
  would need a real `units` table plus a quantity column.
- The availability count shown to a traveller is advisory. It is recomputed on submit and
  the constraint is final, so a stale reading loses a race gracefully instead of
  overbooking.
- Availability queries are indexed by `(accommodation_option_id, check_in, check_out)`
  filtered on blocking statuses; the GiST index backing the constraint serves the overlap
  test itself.
