# 006 — Staff authentication, sessions, and the operations boundary

## Context

Release 7 adds an internal operations console. Staff need to sign in, and the boundary
has to hold against someone who simply types `/ops/bookings` — which means the
authorisation check has to be server-side and unconditional, not a rendering decision.

This is the first authentication in the product. Travellers still have no accounts, and
Release 7 does not give them any.

## Decision

### A small, purpose-built session implementation

No authentication library. Sessions are a random token in an `HttpOnly` cookie, matched
against a hash in `staff_sessions`.

The global engineering rule is to prefer a mature library over hand-rolled crypto, and
that rule is right. It is being set aside here for reasons that are specific rather than
general, and they should be re-checked before this grows:

1. **The runtime constrains the field.** This deploys to Cloudflare Workers over
   `drizzle-orm/neon-http`. There is no Node `crypto`, no TCP, and no interactive
   transactions. Several popular options assume at least one of those, and the ones that
   do work on Workers would each need vetting against this specific stack.
2. **Nothing novel is being invented.** PBKDF2-HMAC-SHA256 for passwords and a random
   256-bit bearer token for sessions are both standard constructions with a specified
   shape. The risk in hand-rolled auth is usually in the *protocol* — password reset
   flows, account recovery, federation, remember-me tokens. None of those exist here.
3. **The population is a handful of internal staff.** There is no self-registration, no
   public sign-up, and no traveller login to confuse with it.

**This is the weakest part of the release and should be the first thing replaced** if
staff auth grows: if self-service password reset, SSO, MFA or more than a few accounts
arrive, adopt a maintained library rather than extending what is here.

### Passwords

PBKDF2-HMAC-SHA256, **100,000 iterations**, 16-byte random salt, 32-byte derived key,
stored as `pbkdf2$sha256$<iterations>$<salt-b64>$<hash-b64>`. The iteration count is in
the stored string so it can be raised later without invalidating existing hashes.

**100,000 is the runtime's ceiling, not a chosen number.** Cloudflare Workers rejects
`deriveBits` above it:

```
NotSupportedError: Pbkdf2 failed: iteration counts above 100000
are not supported (requested 210000).
```

This was written at OWASP's 210,000 first. Node has no such cap, so every unit test and
every local run passed; it failed only in production, and it failed *silently* — a
`try/catch` around the derivation turned the throw into `false`, so a correct password
was reported as "does not match an active account", permanently, with nothing in the
logs. `npx wrangler tail` was the only place the real error appeared. The catch is now
scoped to base64 parsing, and a hash needing more iterations than the runtime supports
throws a message naming the fix.

100,000 is below current OWASP guidance, and that is a real weakness rather than a
technicality. What compensates for it here: a 12-character minimum password,
per-account throttling, a population of a few internal staff, no self-registration, and
no public login surface. What would not compensate for it: more users, customer
accounts, or anything worth a targeted offline attack. **If any of those arrive, move to
Argon2id via a maintained library** — that is the upgrade path, not a larger number,
because a larger number is not available.

Verification compares in constant time. A `===` on secrets leaks their prefix length
through timing, which costs nothing to avoid.

### Sessions

- 256 bits from `crypto.getRandomValues`, base32 in the same unambiguous alphabet used
  elsewhere in this codebase.
- Only a SHA-256 hash is stored, exactly as trip tokens are (decision 004). Read access
  to `staff_sessions` is not a way in.
- Cookie: `HttpOnly`, `SameSite=Lax`, `Secure` in production, `Path=/`, 12-hour expiry.
  `HttpOnly` because no client script needs to read it, and it is the difference between
  an XSS being bad and an XSS being total.
- Expiry is checked in the `WHERE` clause of the lookup, not in application code, so an
  expired session cannot be resurrected by a bug in a date comparison.
- Sign-out deletes the row. The cookie alone is never the authority.

Plain SHA-256 rather than a slow hash for the session token, for the same reason as trip
tokens: the input is 256 bits of uniform randomness. There is no dictionary to run.

### CSRF

Every mutation is a Next.js Server Action, and Next verifies the `Origin` header against
the host for those by default. Combined with `SameSite=Lax`, a cross-site form post
cannot drive an operation. There is no hand-rolled token because there is no
hand-rolled endpoint to protect.

### Authorisation is a function call, not middleware

Every `/ops` page and every operations action begins with `requireStaff()` — one
function, which either returns the signed-in staff member or redirects. Actions that need
a role call `requireStaff("admin")`.

Deliberately **not** done in `middleware.ts`. Middleware sees a URL, so protection
becomes "does this path match a pattern", and the day someone adds `/ops/reports` and
forgets the pattern, the page is public. Putting the check in the page and the action
means the protected thing carries its own protection, and a new route that forgets it has
no data to leak because it never fetched any — every operations query lives behind the
same module.

### Two roles, because there are exactly two things to distinguish

`operations` may read everything and act on bookings — the daily work. `admin` may
additionally change the catalogue: prices, inventory, visibility.

A third role would be invented rather than observed. The enum can grow.

### Brute force

Sign-in failures are counted per email in `staff_login_attempts` and the account is
throttled after five failures in fifteen minutes. Keyed on the account, not the IP: an IP
key is trivially defeated by rotating IPs and punishes shared connections, which in
Uganda is the common case rather than the edge case.

An unknown email and a wrong password give the identical answer, and take roughly the
same time — the unknown case still runs a full PBKDF2 derivation against a dummy hash,
because skipping it would make "no such user" measurably faster and give the enumeration
away by the clock.

Throttling is visibly different, and that is safe rather than an exception: a failure is
recorded for *any* address, existing or not, so being throttled says nothing about
whether an account is real. Telling a locked-out colleague why they cannot get in is
worth more than hiding a fact that is not disclosed.

### The first account

Created by `npm run staff:create`, an interactive script that prompts for a password and
never takes one from an argument or an environment variable. No seeded default account
exists, because a committed default credential is a public credential.

## Rejected

**Auth.js / better-auth.** Both plausible. Rejected for the size of the surface relative
to one internal login form, and because each would need verifying against the Workers
runtime and the neon-http driver before it could be trusted. Revisit if the requirements
above change.

**JWT sessions.** No database lookup, which sounds like the advantage until sign-out has
to work. A revocable session needs server state, and once there is server state the token
may as well be opaque.

**Middleware-based protection.** See above.

**A traveller login sharing this table.** Different population, different risk, different
lifecycle. Travellers stay on capability URLs.

## Consequences

- `staff_users`, `staff_sessions`, `staff_login_attempts`, `audit_events` and
  `booking_notes` are new. None is reachable from a public route.
- Cookies mean `/ops` responses must never be cached. They are dynamic and `noindex`.
- Raising the PBKDF2 iteration count later is safe: the count travels with each hash, so
  old passwords keep verifying and re-hash on next sign-in if that is ever added.
- Sessions are not currently refreshed on activity, so a 12-hour shift ends with one
  sign-in. That is a deliberate simplicity, not an oversight.
