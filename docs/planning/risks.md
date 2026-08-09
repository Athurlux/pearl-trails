# Risks

Known hazards in booking systems. Recorded now so design decisions account for them.

| Risk | Why it matters |
|---|---|
| Double-booking under concurrency | Two guests confirmed for one unit; check-then-write races are the usual cause |
| Overbooking via held/pending bookings | Holds that never expire silently consume inventory |
| Payment timeout with unknown outcome | Neither "paid" nor "failed" — must not double-charge or release the unit |
| Duplicate payment on retry or double-click | Requires idempotent payment operations |
| Cancellation/refund policy drift | Policy applied inconsistently between UI, backend, and reports |
| Timezone and date-boundary errors | Check-in dates shifting by a day across timezones |
| Availability cache going stale | Showing free units that are actually booked |
| Rate/pricing changes applied retroactively | Historical bookings must keep the price they were made at |

None are addressed yet. Each should be resolved by an explicit decision, not by implementation accident.
