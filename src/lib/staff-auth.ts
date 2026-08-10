import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { and, eq, gt, lt, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { staffLoginAttempts, staffSessions, staffUsers } from "@/db/schema";
import {
  PBKDF2_ITERATIONS,
  generateSessionToken,
  hashSessionToken,
  parseSessionToken,
  verifyPassword,
} from "./staff-crypto";
import { hasRole, type StaffRole } from "./staff-vocab";

/**
 * The operations authorisation boundary.
 *
 * `requireStaff()` is the single gate. Every `/ops` page and every operations
 * action calls it first, and it either returns the signed-in staff member or
 * redirects to sign-in.
 *
 * Deliberately **not** middleware. Middleware protects a URL pattern, so the
 * day someone adds a route and forgets to list it, the page is public. A check
 * inside the page and inside the action means the protected thing carries its
 * own protection — and a route that forgets it never fetched anything, because
 * every operations query lives behind this module.
 *
 * See `docs/decisions/006-staff-authentication.md`.
 */

const SESSION_COOKIE = "pt_ops_session";
const SESSION_HOURS = 12;
const MAX_FAILURES = 5;
const FAILURE_WINDOW_MINUTES = 15;

export interface StaffIdentity {
  id: number;
  email: string;
  name: string;
  role: StaffRole;
}

// ---------------------------------------------------------------------------
// Reading the session
// ---------------------------------------------------------------------------

/**
 * The signed-in staff member, or null.
 *
 * Expiry is part of the `WHERE` clause rather than a comparison afterwards, so
 * an expired session cannot survive a mistake in date handling. `is_active` is
 * checked here too: deactivating an account takes effect on the next request,
 * without hunting down their sessions.
 */
export async function getStaff(): Promise<StaffIdentity | null> {
  const jar = await cookies();
  const token = parseSessionToken(jar.get(SESSION_COOKIE)?.value);
  if (!token) return null;

  const db = getDb();
  const [row] = await db
    .select({
      id: staffUsers.id,
      email: staffUsers.email,
      name: staffUsers.name,
      role: staffUsers.role,
    })
    .from(staffSessions)
    .innerJoin(staffUsers, eq(staffUsers.id, staffSessions.staffUserId))
    .where(
      and(
        eq(staffSessions.tokenHash, await hashSessionToken(token)),
        gt(staffSessions.expiresAt, new Date()),
        eq(staffUsers.isActive, true),
      ),
    )
    .limit(1);

  return row ?? null;
}

/**
 * The gate. Returns the staff member or does not return at all.
 *
 * `redirect` throws, so there is no path past this function without a valid
 * session — a caller cannot forget to check the return value, because there is
 * no falsy value to forget.
 */
export async function requireStaff(minimumRole: StaffRole = "operations") {
  const staff = await getStaff();
  if (!staff) redirect("/ops/sign-in");
  if (!hasRole(staff.role, minimumRole)) redirect("/ops?denied=1");
  return staff;
}

// ---------------------------------------------------------------------------
// Signing in and out
// ---------------------------------------------------------------------------

export type SignInResult =
  | { status: "ok"; staff: StaffIdentity }
  | { status: "rejected" }
  | { status: "throttled" };

/**
 * Verifies credentials and starts a session.
 *
 * `rejected` covers an unknown email, a wrong password and a deactivated
 * account alike — one answer, so sign-in cannot be used to discover which
 * addresses are staff.
 *
 * A wrong password on a *known* account and an unknown account also take
 * roughly the same time, because the unknown case still runs a PBKDF2
 * derivation against a dummy hash. Skipping that would make "no such user"
 * measurably faster and give the enumeration away by the clock.
 */
export async function signIn(
  rawEmail: string,
  password: string,
): Promise<SignInResult> {
  const email = rawEmail.trim().toLowerCase();
  if (!email || !password) return { status: "rejected" };

  const db = getDb();

  if (await isThrottled(email)) return { status: "throttled" };

  const [user] = await db
    .select({
      id: staffUsers.id,
      email: staffUsers.email,
      name: staffUsers.name,
      role: staffUsers.role,
      passwordHash: staffUsers.passwordHash,
      isActive: staffUsers.isActive,
    })
    .from(staffUsers)
    .where(eq(staffUsers.email, email))
    .limit(1);

  const stored = user?.passwordHash ?? DUMMY_HASH;
  const correct = await verifyPassword(password, stored);

  if (!user || !user.isActive || !correct) {
    await db.insert(staffLoginAttempts).values({ email });
    return { status: "rejected" };
  }

  // A successful sign-in clears the account's failure history, so a legitimate
  // user who mistyped four times is not throttled for the next quarter hour.
  await db.delete(staffLoginAttempts).where(eq(staffLoginAttempts.email, email));

  await startSession(user.id);
  await db
    .update(staffUsers)
    .set({ lastSignedInAt: new Date() })
    .where(eq(staffUsers.id, user.id));

  return {
    status: "ok",
    staff: { id: user.id, email: user.email, name: user.name, role: user.role },
  };
}

/**
 * A well-formed hash of nothing, used only so an account that does not exist
 * still costs a full PBKDF2 derivation.
 *
 * Built with `repeat` rather than written out: the salt must decode to exactly
 * 16 bytes and the digest to 32, and a miscounted literal would throw inside
 * `verifyPassword`, return early, and silently remove the timing defence this
 * constant exists to provide. It never matches a password — the derived bytes
 * of any input differ from a run of zeroes.
 */
const DUMMY_HASH = `pbkdf2$sha256$${PBKDF2_ITERATIONS}$${"A".repeat(22)}==$${"A".repeat(43)}=`;

async function startSession(staffUserId: number): Promise<void> {
  const db = getDb();
  const token = generateSessionToken();
  const expiresAt = new Date(Date.now() + SESSION_HOURS * 60 * 60 * 1000);

  await db.insert(staffSessions).values({
    tokenHash: await hashSessionToken(token),
    staffUserId,
    expiresAt,
  });

  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    // Off in development so the cookie works over plain-HTTP localhost.
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });

  // Opportunistic cleanup of this account's expired rows. No worker exists to
  // do it, and the alternative is a table that only grows.
  await db.delete(staffSessions).where(lt(staffSessions.expiresAt, new Date()));
}

/**
 * Ends the session.
 *
 * Deletes the row *and* clears the cookie. Clearing only the cookie would leave
 * a token that still works if it were ever recovered — the database is the
 * authority, so that is what has to change.
 */
export async function signOut(): Promise<void> {
  const jar = await cookies();
  const token = parseSessionToken(jar.get(SESSION_COOKIE)?.value);

  if (token) {
    const db = getDb();
    await db
      .delete(staffSessions)
      .where(eq(staffSessions.tokenHash, await hashSessionToken(token)));
  }

  jar.delete(SESSION_COOKIE);
}

// ---------------------------------------------------------------------------
// Throttling
// ---------------------------------------------------------------------------

/**
 * Keyed on the account, not the IP.
 *
 * An IP key is defeated by rotating addresses and punishes shared connections,
 * which in Uganda is the common case rather than the edge case. This bounds
 * guesses against a *specific* account, which is the thing worth bounding.
 */
async function isThrottled(email: string): Promise<boolean> {
  const db = getDb();
  const since = new Date(Date.now() - FAILURE_WINDOW_MINUTES * 60 * 1000);

  const [{ failures }] = await db
    .select({ failures: sql<number>`count(*)::int` })
    .from(staffLoginAttempts)
    .where(
      and(
        eq(staffLoginAttempts.email, email),
        gt(staffLoginAttempts.attemptedAt, since),
      ),
    );

  return failures >= MAX_FAILURES;
}
