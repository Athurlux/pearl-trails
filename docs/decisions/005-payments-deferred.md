# 005 — Payments are deferred, and the product says so

## Context

The plan after Release 5 was Release 6: payments. It was scoped in detail — a `Payment`
entity separate from `Booking`, a state machine with explicit legal transitions,
idempotent initiation, signed webhooks with replay and out-of-order protection, amount
and currency verification against the booking snapshot, and provider reconciliation for
ambiguous outcomes.

It was not built. Pearl Trails has no merchant account, and no sandbox credentials for
any provider.

## Decision

**Payments are deferred in full.** Release 5 is followed by Release 7 (the operations
console), and the first customer-facing MVP ships without a payment layer.

Nothing in the product implies otherwise. The booking flow, the confirmation page and
the trip page all state that no payment has been taken and none is due through Pearl
Trails. Prices are labelled "estimated total" throughout, and the totals stored on a
booking are described as snapshots of what the traveller was quoted — not as an amount
owed.

## Why not build it against a simulator

The tempting middle path was to build the whole payment domain behind a provider adapter
and ship a sandbox simulator, leaving one file to write when credentials arrive. That is
a reasonable engineering shape, and it was rejected for two reasons.

**A payment integration is mostly the integration.** The parts that are genuinely hard —
what a specific provider's webhook signature covers, which of its statuses are final,
what it does on a timeout, whether its idempotency key is scoped per-request or
per-merchant, what a mobile-money collection actually returns when the customer never
approves it — cannot be learned from a simulator written by the same person who wrote the
code under test. A simulator agrees with whatever its author assumed. Passing tests
against it would demonstrate internal consistency and nothing about correctness.

**A payment surface that cannot take money is a claim.** A "Pay" button on a public
travel site is read as a real one. Building the flow, styling the states and then
disabling it — or worse, wiring it to a simulator that reports success — puts a false
statement in front of a user in exchange for a screenshot. Release 4 and 5 were built on
the rule that the product never claims more than has happened; a fake payment would be
the largest possible violation of it.

Deferring costs nothing that cannot be recovered: the booking domain already snapshots
every value a payment would need, and `bookings.estimated_total_ugx` is the amount a
future payment would be checked against.

## What would need to be true to start

1. A merchant account with a provider that serves Uganda and supports mobile money —
   Flutterwave and Pesapal are the obvious candidates, and the choice should be made
   against their **current** documentation, not from memory.
2. Sandbox credentials, so the flow can be exercised end to end against the real API
   before anything reaches production.
3. A decision, recorded here, on whether a successful payment makes a booking
   `confirmed` or leaves it `pending` awaiting the property. These are different
   businesses, and the code should not guess.

## Consequences

- `BOOKING_STATUSES` already contains `confirmed`, which no code currently writes. That
  is deliberate — the enum was sized once so a populated table would not need migrating —
  and Release 7 gives operations staff a legitimate way to set it.
- No `Payment` table, no ledger, no `financial-transactions-and-ledger-integrity` work.
  Booking totals are display snapshots, not balances, and nothing treats them as money
  owed.
- The MVP is complete without payments. It is a reservation-request product: a traveller
  discovers, books, plans and returns; staff review and respond. Money is a later
  business decision, not a missing piece of this one.
