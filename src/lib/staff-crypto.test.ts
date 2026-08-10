import { describe, expect, it } from "vitest";
import {
  PBKDF2_MAX_SUPPORTED_ITERATIONS,
  SESSION_TOKEN_PATTERN,
  generateSessionToken,
  hashPassword,
  hashSessionToken,
  parseSessionToken,
  timingSafeEqual,
  verifyPassword,
} from "./staff-crypto";
import { hasRole } from "./staff-vocab";
import { allowedTransitions, canTransition } from "./booking-transitions";
import { BOOKING_STATUSES } from "./booking-status";
import { BLOCKING_BOOKING_STATUSES } from "./booking-status";

/**
 * The pure half of the operations boundary.
 *
 * Passwords, session tokens, role ranking and the booking state machine are all
 * functions of their arguments, so they are tested directly rather than through
 * a request.
 */

describe("password hashing", () => {
  it("verifies a correct password and rejects a wrong one", async () => {
    const stored = await hashPassword("correct horse battery staple");
    expect(await verifyPassword("correct horse battery staple", stored)).toBe(true);
    expect(await verifyPassword("Correct horse battery staple", stored)).toBe(false);
    expect(await verifyPassword("", stored)).toBe(false);
  });

  it("salts, so the same password hashes differently every time", async () => {
    const a = await hashPassword("same password");
    const b = await hashPassword("same password");
    expect(a).not.toBe(b);
    // And both still verify — the salt travels with the hash.
    expect(await verifyPassword("same password", a)).toBe(true);
    expect(await verifyPassword("same password", b)).toBe(true);
  });

  it("records the iteration count so it can be raised later", async () => {
    const stored = await hashPassword("x".repeat(20));
    const [scheme, digest, iterations] = stored.split("$");
    expect(scheme).toBe("pbkdf2");
    expect(digest).toBe("sha256");
    // Capped by the Workers runtime, which rejects anything higher.
    expect(Number(iterations)).toBe(100_000);
  });

  it("never stores the password", async () => {
    const stored = await hashPassword("unmistakable-secret-value");
    expect(stored).not.toContain("unmistakable-secret-value");
  });

  it("returns false rather than throwing on a malformed stored hash", async () => {
    // A corrupt row must not become a 500 on the sign-in page, and must
    // certainly not become a way in.
    for (const bad of [
      "",
      "not-a-hash",
      "pbkdf2$sha256$210000$only-four-parts",
      "pbkdf2$sha256$notanumber$AAAA$AAAA",
      "bcrypt$sha256$210000$AAAA$AAAA",
      "pbkdf2$sha512$210000$AAAA$AAAA",
      "pbkdf2$sha256$-1$AAAA$AAAA",
    ]) {
      expect(await verifyPassword("anything", bad)).toBe(false);
    }
  });

  it("stays inside the iteration limit the Workers runtime enforces", async () => {
    // The bug this guards: 210,000 iterations passed every local test, because
    // Node has no cap. Cloudflare Workers rejects anything above 100,000
    // outright, so production refused a correct password and blamed the user.
    const stored = await hashPassword("a-long-enough-test-password");
    const iterations = Number(stored.split("$")[2]);
    expect(iterations).toBeLessThanOrEqual(PBKDF2_MAX_SUPPORTED_ITERATIONS);
  });

  it("shouts rather than lying when a hash needs more iterations than the runtime allows", async () => {
    // Returning false here is what made the original failure invisible: a valid
    // credential reported as wrong, indefinitely, with nothing in the logs.
    const unusable = `pbkdf2$sha256$${PBKDF2_MAX_SUPPORTED_ITERATIONS + 1}$${"A".repeat(22)}==$${"A".repeat(43)}=`;
    await expect(verifyPassword("anything", unusable)).rejects.toThrow(/iterations/i);
  });
});

describe("constant-time comparison", () => {
  it("compares content, not identity", () => {
    expect(timingSafeEqual(new Uint8Array([1, 2, 3]), new Uint8Array([1, 2, 3]))).toBe(true);
    expect(timingSafeEqual(new Uint8Array([1, 2, 3]), new Uint8Array([1, 2, 4]))).toBe(false);
    // A difference in the first byte must be caught as surely as the last.
    expect(timingSafeEqual(new Uint8Array([9, 2, 3]), new Uint8Array([1, 2, 3]))).toBe(false);
    expect(timingSafeEqual(new Uint8Array([1, 2]), new Uint8Array([1, 2, 3]))).toBe(false);
    expect(timingSafeEqual(new Uint8Array(), new Uint8Array())).toBe(true);
  });
});

describe("session tokens", () => {
  it("mints unguessable tokens from the unambiguous alphabet", () => {
    const token = generateSessionToken();
    expect(token).toMatch(SESSION_TOKEN_PATTERN);
    expect(token).not.toMatch(/[ILOU]/);
  });

  it("does not repeat", () => {
    const tokens = new Set(Array.from({ length: 200 }, generateSessionToken));
    expect(tokens.size).toBe(200);
  });

  it("rejects anything that is not one of its own tokens", () => {
    expect(parseSessionToken(generateSessionToken())).not.toBeNull();
    for (const bad of [null, undefined, "", "short", "a".repeat(52), "A".repeat(53)]) {
      expect(parseSessionToken(bad)).toBeNull();
    }
  });

  it("hashes to hex that does not contain the token", async () => {
    const token = generateSessionToken();
    const hash = await hashSessionToken(token);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(hash).toBe(await hashSessionToken(token));
    expect(hash).not.toContain(token);
  });
});

describe("roles", () => {
  it("treats admin as a superset of operations", () => {
    expect(hasRole("admin", "operations")).toBe(true);
    expect(hasRole("admin", "admin")).toBe(true);
    expect(hasRole("operations", "operations")).toBe(true);
  });

  it("does not let operations reach admin", () => {
    expect(hasRole("operations", "admin")).toBe(false);
  });
});

describe("booking state machine", () => {
  it("allows a pending request to be accepted, cancelled or expired", () => {
    expect([...allowedTransitions("pending")].sort()).toEqual([
      "cancelled",
      "confirmed",
      "expired",
    ]);
  });

  it("allows a confirmed booking to be cancelled and nothing else", () => {
    expect([...allowedTransitions("confirmed")]).toEqual(["cancelled"]);
    // Un-confirming would quietly contradict something the traveller was told.
    expect(canTransition("confirmed", "pending")).toBe(false);
    expect(canTransition("confirmed", "expired")).toBe(false);
  });

  it("treats cancelled and expired as terminal", () => {
    for (const terminal of ["cancelled", "expired"] as const) {
      expect(allowedTransitions(terminal)).toEqual([]);
      for (const to of BOOKING_STATUSES) {
        expect(canTransition(terminal, to)).toBe(false);
      }
    }
  });

  it("never allows a status to transition to itself", () => {
    for (const status of BOOKING_STATUSES) {
      expect(canTransition(status, status)).toBe(false);
    }
  });

  it("means every terminal state releases the unit", () => {
    // The operational promise of "cancel" is that the dates become bookable.
    // That holds only while the terminal states sit outside the blocking set.
    const blocking = BLOCKING_BOOKING_STATUSES as readonly string[];
    for (const terminal of ["cancelled", "expired"] as const) {
      expect(blocking).not.toContain(terminal);
    }
    expect(blocking).toContain("pending");
    expect(blocking).toContain("confirmed");
  });
});
