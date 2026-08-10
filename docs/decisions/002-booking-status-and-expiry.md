# 002 — Booking status model, and why there is no expiry

## Context

Release 4 stores reservation requests. It has no payment, no operator tooling and no
background worker. The status vocabulary has to describe what the system can actually
observe, and the set of statuses that block inventory is compiled into an exclusion
constraint (`001-booking-availability-and-concurrency.md`), so it is a schema decision
rather than an application detail.

## Decision

Four statuses, as the Postgres enum `booking_status`:

| Status | Meaning | Blocks inventory |
| --- | --- | --- |
| `pending` | Request received, not yet reviewed by the property. | **Yes** |
| `confirmed` | The property has accepted the request. | **Yes** |
| `cancelled` | Withdrawn by the traveller or the property. | No |
| `expired` | A request that lapsed before it was actioned. | No |

Every booking created in Release 4 starts as `pending`. **Nothing in Release 4 writes any
other status** — there is no operator dashboard to confirm, no cancellation flow, and no
scheduler to expire. The values exist because the blocking set lives inside a constraint
predicate, and defining it correctly once is cheaper and safer than a constraint migration
on a populated table later.

The UI never prints the raw enum. `pending` renders as **"Pending review"** with a
sentence explaining that the property has not yet responded.

## No `expiresAt` column

Considered and rejected.

A pending request blocks a unit. Left alone forever, abandoned requests would slowly
consume demo inventory. The obvious fix is `expires_at` plus a job that flips lapsed rows
to `expired`.

There is no job. Release 4 adds no queue, scheduler or worker — `CLAUDE.md` requires a
decision record before any of those, and none is justified by this release.

Enforcing expiry at read time instead — treating a pending row with `expires_at < now()`
as non-blocking in the availability query — was rejected because it desynchronises the
query from the constraint. Exclusion constraint predicates must be immutable and cannot
call `now()`, so the constraint would keep blocking a row the query had already declared
free. The traveller would be shown availability and then be refused on submit. A wrong
answer delivered confidently is worse than a conservative one.

So: **a pending request blocks its unit until something explicitly cancels it.** No column
that nothing writes, no scheduler that does not exist, and no expiry language anywhere in
the interface.

## Consequences

- Demo inventory can be consumed by abandoned requests. Acceptable at this stage: counts
  are small, and clearing them is a deliberate operator action.
- Adding expiry later means: add `expires_at`, add the worker, and migrate the constraint
  predicate. The predicate change is the expensive part and is understood now rather than
  discovered later.
- No status transition logic exists yet, because no transition is reachable. When one is
  added, valid transitions (`pending → confirmed | cancelled | expired`,
  `confirmed → cancelled`) belong in the service layer, not in the enum.
- Confirmation pages must not imply a property has accepted anything while the status is
  `pending`.
