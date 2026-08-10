# 003 — Booking reference, idempotency, and confirmation-page privacy

## Context

A reservation request needs a reference a traveller can quote. There are no accounts in
Release 4, so that reference is also the only key to the confirmation page — which makes
it a credential, not just a label.

Separately, a booking must not be created twice because someone double-clicked, a mobile
connection retried, or a server action was replayed.

## Decision

### Reference format

`PT-2026-K4M8XQ` — prefix, year, six random characters.

The random part is drawn from a 32-character Crockford-style alphabet with `I`, `L`, `O`
and `U` removed, so it cannot be misread over a phone call or turn into a word. Six
characters is ~30 bits, about one in a billion.

Generated with `crypto.getRandomValues`, not `Math.random`, because this value guards a
page containing someone's name, email and phone number.

Uniqueness is enforced by a database unique index, not by generation. On a `23505`
collision the service generates a new reference and retries — bounded, and in practice
never reached. Checking for a free reference before inserting would be a race; the
constraint is the only thing that can actually guarantee it.

The year is derived from the server clock at creation, so references sort loosely by
season without exposing volume. Nothing in the string is sequential — you cannot tell how
many bookings exist, or guess a neighbour's.

The internal `bookings.id` stays private and never appears in a URL or response.

### Idempotency

Every booking flow session mints a `requestToken` (a v4 UUID) in the browser when the
traveller reaches the review step. It is submitted with the booking and stored in
`bookings.request_token` under a unique index.

- First submit: the row inserts, the booking is created.
- Any replay carrying the same token: the insert violates `bookings_request_token_key`,
  the service catches `23505`, loads the booking already stored under that token, and
  returns it. The traveller lands on their existing confirmation page.

The result is that a duplicate submission is *indistinguishable* from the first one from
the traveller's point of view, and produces exactly one row. The submit button is also
disabled while in flight, but that is a UX nicety — the unique index is the guarantee.

The token is regenerated after a *successful* booking, so a traveller who deliberately
books the same stay again gets a genuinely new reservation rather than a replay.

### Confirmation-page privacy

`/booking/[reference]` is readable by anyone holding the reference. That is intentional —
it is how a traveller returns to their request without an account — so the page is built
to be safe under that assumption:

- `robots: { index: false, follow: false }`, and no Open Graph or Twitter card at all, so
  the reference and traveller details cannot be scraped from social metadata.
- The page title is the reference alone. No name, no property, no email in `<title>`.
- Email and phone are **masked** on the page (`a•••@example.com`, `+256 7•• ••• 412`).
  The traveller can recognise their own contact details; someone who guessed the URL
  learns nothing usable.
- Special requests are rendered as plain text, never as HTML.
- No internal identifiers are exposed — not `bookings.id`, not `stay_id`, not
  `accommodation_option_id`, not `unit_index`.
- An unknown reference returns the standard 404. It does not distinguish "no such booking"
  from "not yours", because there is no "yours" yet.

### Rejected

**A separate lookup token in the URL alongside the reference.** Strictly better entropy,
but it means the traveller's shareable reference and their access key differ, which is
confusing without an account system to reconcile them. A 30-bit unguessable reference plus
masked PII is proportionate for a demo product holding no payment data.

**Server-generated idempotency keyed on form contents.** A hash of the submission would
treat two genuinely intended identical bookings as one, and would still need a stored
unique key. An explicit client token expresses intent more honestly.

## Consequences

- Reference collisions and duplicate tokens are handled by catching SQLSTATE `23505` and
  inspecting the constraint name. Renaming either index changes that behaviour, so both
  names are asserted in tests.
- When accounts arrive, the confirmation page can be upgraded to show unmasked details to
  the authenticated owner, without changing the reference scheme.
- Because the reference is a capability, it must never be logged into an analytics or
  error tool alongside traveller PII.
