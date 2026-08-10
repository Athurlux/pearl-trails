# Architecture Decision Records

One file per decision: `NNN-short-title.md`.

Each record states: **context** (what forced the decision), **decision** (what was chosen),
**alternatives** (what was rejected and why), and **consequences** (what this commits us to).

No framework, database, hosting, or major dependency choice should be made without a record here.

## Index

- [001 — Booking availability and concurrency](001-booking-availability-and-concurrency.md)
  — inventory counts, half-open date overlap, and the exclusion constraint that makes
  double-booking impossible without interactive transactions.
- [002 — Booking status model, and why there is no expiry](002-booking-status-and-expiry.md)
  — the four statuses, which two block inventory, and why `expiresAt` was left out.
- [003 — Booking reference, idempotency, and confirmation-page privacy](003-booking-reference-and-idempotency.md)
  — reference format, the request token that makes submission idempotent, and treating the
  confirmation URL as a credential.
