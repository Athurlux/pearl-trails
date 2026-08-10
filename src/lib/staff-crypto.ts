/**
 * Password hashing and session-token minting.
 *
 * Web Crypto only, because this runs on Cloudflare Workers where Node's
 * `crypto` does not exist. Pure — no database, no cookies — so every function
 * here is directly testable.
 *
 * See `docs/decisions/006-staff-authentication.md`, which records why this is
 * hand-written rather than a library, and says plainly that it is the first
 * thing to replace if staff auth grows beyond a handful of internal accounts.
 */

/**
 * 100,000 — and that is a **ceiling imposed by the runtime**, not a choice.
 *
 * Cloudflare Workers rejects `deriveBits` above 100,000 iterations outright:
 *
 *     NotSupportedError: Pbkdf2 failed: iteration counts above 100000
 *     are not supported (requested 210000).
 *
 * This was set to OWASP's 210,000 first. Node has no such cap, so every local
 * test passed and every unit test passed; it failed only in production, where
 * the throw was swallowed by a `catch` in `verifyPassword` and surfaced as
 * "that email and password do not match an active account" — a correct
 * credential rejected forever, with a message that pointed at the user. It was
 * found with `npx wrangler tail`, which is the only place the real error
 * appeared.
 *
 * 100,000 is below current OWASP guidance for PBKDF2-HMAC-SHA256. The
 * compensating controls are a 12-character minimum password, per-account
 * throttling, and a user population of a few internal staff with no
 * self-registration. `docs/decisions/006` records this and names the upgrade
 * path — a maintained library with Argon2id — as the way out rather than
 * pretending the number is sufficient.
 *
 * Stored *inside* each hash, so if the platform limit rises this can too
 * without invalidating anyone.
 */
export const PBKDF2_ITERATIONS = 100_000;

/** What the runtime will actually accept. Exceeding it throws, it does not degrade. */
export const PBKDF2_MAX_SUPPORTED_ITERATIONS = 100_000;
const SALT_BYTES = 16;
const KEY_BITS = 256;

const encoder = new TextEncoder();

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function fromBase64(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function derive(
  password: string,
  salt: Uint8Array,
  iterations: number,
): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      // `salt` is a Uint8Array; the DOM lib types the field as BufferSource and
      // TS's ArrayBufferLike generic makes the direct pass awkward, so hand it
      // the underlying buffer view explicitly.
      salt: salt as unknown as BufferSource,
      iterations,
      hash: "SHA-256",
    },
    key,
    KEY_BITS,
  );
  return new Uint8Array(bits);
}

/** `pbkdf2$sha256$<iterations>$<salt-b64>$<hash-b64>` */
export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const hash = await derive(password, salt, PBKDF2_ITERATIONS);
  return `pbkdf2$sha256$${PBKDF2_ITERATIONS}$${toBase64(salt)}$${toBase64(hash)}`;
}

/**
 * Verifies a password against a stored hash.
 *
 * Returns false rather than throwing on a malformed stored value: a corrupt row
 * must not become a 500 on the sign-in page, and it must certainly not become
 * a way in.
 */
export async function verifyPassword(
  password: string,
  stored: string,
): Promise<boolean> {
  const parts = stored.split("$");
  if (parts.length !== 5) return false;

  const [scheme, digest, iterationsRaw, saltB64, hashB64] = parts;
  if (scheme !== "pbkdf2" || digest !== "sha256") return false;

  const iterations = Number(iterationsRaw);
  if (!Number.isInteger(iterations) || iterations < 1) return false;

  /*
    A hash written with more iterations than this runtime supports cannot be
    verified here — `deriveBits` throws rather than running slower. Saying so
    is the only useful answer: returning false would tell the owner of a
    perfectly good password that it is wrong, which is precisely the failure
    this whole module already had once.
  */
  if (iterations > PBKDF2_MAX_SUPPORTED_ITERATIONS) {
    throw new Error(
      `Stored password hash needs ${iterations} PBKDF2 iterations, but this runtime supports at most ${PBKDF2_MAX_SUPPORTED_ITERATIONS}. Re-create the account with npm run staff:create.`,
    );
  }

  let salt: Uint8Array;
  let expected: Uint8Array;
  try {
    salt = fromBase64(saltB64);
    expected = fromBase64(hashB64);
  } catch {
    // A stored value that is not base64 is a corrupt row, not a password
    // attempt. Answering "wrong password" is the right answer here.
    return false;
  }

  /*
    Deliberately *not* wrapped in a try/catch.

    An earlier version caught everything around the derivation and returned
    false, which meant any failure of the crypto stack itself was
    indistinguishable from a wrong password — the sign-in page rejected a
    correct credential and reported it as incorrect, with nothing in the logs.
    A derivation that throws is a broken deployment, and it should surface as
    one rather than as a permanently unusable login.
  */
  const actual = await derive(password, salt, iterations);
  return timingSafeEqual(actual, expected);
}

/**
 * Constant-time comparison.
 *
 * `===` on secrets returns as soon as two bytes differ, which leaks how much of
 * a guess was correct through response timing. Comparing every byte costs
 * nothing here and removes the question.
 */
export function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  // The length check is not constant-time, and does not need to be: hash length
  // is a property of the scheme, not of the secret.
  if (a.length !== b.length) return false;
  let difference = 0;
  for (let i = 0; i < a.length; i += 1) difference |= a[i] ^ b[i];
  return difference === 0;
}

// ---------------------------------------------------------------------------
// Session tokens
// ---------------------------------------------------------------------------

/** Same unambiguous alphabet as booking references and trip tokens. */
const TOKEN_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
/** 52 characters × 5 bits ≈ 260 bits. */
const SESSION_TOKEN_LENGTH = 52;
export const SESSION_TOKEN_PATTERN = /^[0-9ABCDEFGHJKMNPQRSTVWXYZ]{52}$/;

export function generateSessionToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(SESSION_TOKEN_LENGTH));
  let token = "";
  // 256 % 32 === 0, so the modulo is uniform and costs no entropy.
  for (const byte of bytes) token += TOKEN_ALPHABET[byte % TOKEN_ALPHABET.length];
  return token;
}

export function parseSessionToken(raw: string | undefined | null): string | null {
  if (typeof raw !== "string") return null;
  const token = raw.trim();
  return SESSION_TOKEN_PATTERN.test(token) ? token : null;
}

/**
 * SHA-256, hex. Plain and unsalted on purpose: the input is 260 bits of uniform
 * randomness, so there is no dictionary to run and stretching would only slow
 * the legitimate lookup. The same reasoning as trip tokens (decision 004).
 */
export async function hashSessionToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(token));
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}
