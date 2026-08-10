import { config } from "dotenv";
import { randomUUID } from "node:crypto";
import { eq, like, sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { getDb } from "@/db";
import { auditEvents, bookings, staffLoginAttempts, staffUsers } from "@/db/schema";
import { createBookingRequest, getOptionAvailability } from "@/lib/booking-query";
import {
  addBookingNote,
  changeBookingStatus,
  getBookingForOps,
  listBookings,
  updateAccommodation,
} from "@/lib/ops-query";
import { hashPassword } from "@/lib/staff-crypto";

config({ path: ".env.local", quiet: true });

const hasDb = Boolean(process.env.DATABASE_URL);
const suite = hasDb ? describe : describe.skip;

/**
 * Operations against the real Neon branch.
 *
 * The invariants worth defending here are the ones a console can quietly break:
 * an illegal status change slipping through, a cancellation that does not
 * actually release the dates, an audit trail that loses who did it, and an
 * accommodation update that reaches into another property.
 *
 * `signIn` itself is not exercised here — it sets a cookie, which needs a
 * request context. Its pure parts are covered in `staff-crypto.test.ts`, and
 * the live sign-in is verified against the deployed site.
 *
 * Own cleanup marker, as `trip.test.ts` learned to have: Vitest runs files in
 * parallel, and sharing one would let these suites delete each other's rows.
 */

const TEST_EMAIL_DOMAIN = "@ops-test.invalid";
const STAFF_EMAIL = `opsbot${TEST_EMAIL_DOMAIN}`;
const d = (monthDay: string) => `2027-${monthDay}`;

const STAY = { staySlug: "kyambura-gorge-retreat", optionSlug: "gorge-room" };

const actor = { id: 0, email: STAFF_EMAIL, name: "Ops Bot", role: "admin" as const };

function request(overrides: Record<string, unknown> = {}) {
  return {
    ...STAY,
    checkIn: d("04-10"),
    checkOut: d("04-13"),
    guests: 2,
    experienceSlugs: [] as string[],
    traveller: {
      fullName: "Amina Nakato",
      email: `guest${TEST_EMAIL_DOMAIN}`,
      phoneCode: "+256",
      phoneNumber: "0772 123 456",
      country: "Uganda",
      specialRequests: "",
    },
    requestToken: randomUUID(),
    ...overrides,
  };
}

async function book(overrides: Record<string, unknown> = {}) {
  const result = await createBookingRequest(request(overrides));
  if (result.status !== "created") throw new Error(`expected a booking, got ${result.status}`);
  return result;
}

async function clear() {
  const db = getDb();
  await db.delete(bookings).where(like(bookings.guestEmail, `%${TEST_EMAIL_DOMAIN}`));
  await db.delete(auditEvents).where(like(auditEvents.actorEmail, `%${TEST_EMAIL_DOMAIN}`));
  await db.delete(staffLoginAttempts).where(like(staffLoginAttempts.email, `%${TEST_EMAIL_DOMAIN}`));
  await db.delete(staffUsers).where(like(staffUsers.email, `%${TEST_EMAIL_DOMAIN}`));
}

suite("operations on bookings", () => {
  beforeAll(async () => {
    await clear();
    const db = getDb();
    const [created] = await db
      .insert(staffUsers)
      .values({
        email: STAFF_EMAIL,
        name: "Ops Bot",
        role: "admin",
        passwordHash: await hashPassword("a-long-enough-test-password"),
      })
      .returning({ id: staffUsers.id });
    actor.id = created.id;
  });

  afterAll(clear);

  it("stores staff passwords hashed, never in the clear", async () => {
    const db = getDb();
    const [row] = await db
      .select({ hash: staffUsers.passwordHash })
      .from(staffUsers)
      .where(eq(staffUsers.email, STAFF_EMAIL));

    expect(row.hash).not.toContain("a-long-enough-test-password");
    expect(row.hash.startsWith("pbkdf2$sha256$")).toBe(true);
  });

  it("moves a pending request to confirmed and records who did it", async () => {
    const { reference } = await book();

    expect(await changeBookingStatus(actor, reference, "confirmed")).toEqual({
      status: "ok",
    });

    const detail = await getBookingForOps(reference);
    expect(detail!.status).toBe("confirmed");

    const entry = detail!.history.find((h) => h.action === "booking.status_changed");
    expect(entry).toBeDefined();
    expect(entry!.actorName).toBe("Ops Bot");
    expect(entry!.summary).toBe("pending → confirmed");
  });

  it("refuses an illegal transition and leaves the booking alone", async () => {
    const { reference } = await book({ checkIn: d("04-20"), checkOut: d("04-22") });
    await changeBookingStatus(actor, reference, "cancelled");

    // Cancelled is terminal. Reviving it would rewrite what the traveller was
    // already told rather than recording a new decision.
    const result = await changeBookingStatus(actor, reference, "confirmed");
    expect(result).toEqual({ status: "illegal-transition", from: "cancelled" });
    expect((await getBookingForOps(reference))!.status).toBe("cancelled");
  });

  it("releases the dates when a booking is cancelled", async () => {
    // The operational promise of "cancel". If this fails, staff cancel a
    // booking and the room stays unbookable, which is the worst of both.
    const dates = { checkIn: d("05-01"), checkOut: d("05-04") };
    const { reference } = await book(dates);

    const db = getDb();
    const [option] = await db.execute<{ stay_id: number; id: number }>(
      sql`
        SELECT o.id, o.stay_id FROM accommodation_options o
        JOIN stays s ON s.id = o.stay_id
        WHERE s.slug = ${STAY.staySlug} AND o.slug = ${STAY.optionSlug}
      `,
    ).then((r) => r.rows);

    const held = await getOptionAvailability(option.stay_id, dates.checkIn, dates.checkOut);
    await changeBookingStatus(actor, reference, "cancelled");
    const released = await getOptionAvailability(
      option.stay_id,
      dates.checkIn,
      dates.checkOut,
    );

    expect(released.get(option.id)!).toBe(held.get(option.id)! + 1);
  });

  it("does not let two people make the same change twice", async () => {
    const { reference } = await book({ checkIn: d("05-10"), checkOut: d("05-12") });

    // Both aiming at the *same* status. Picking two different ones would not
    // test anything: pending→confirmed followed by confirmed→cancelled is two
    // legal transitions, and both succeeding is correct.
    const [a, b] = await Promise.all([
      changeBookingStatus(actor, reference, "confirmed"),
      changeBookingStatus(actor, reference, "confirmed"),
    ]);

    // One wins; the other is told the booking has already moved. Both reporting
    // success would mean one of them described a change it did not make — and
    // would write a second audit row for a transition that happened once.
    const outcomes = [a.status, b.status].sort();
    expect(outcomes).toEqual(["illegal-transition", "ok"]);

    const detail = await getBookingForOps(reference);
    expect(detail!.status).toBe("confirmed");
    expect(
      detail!.history.filter((h) => h.action === "booking.status_changed"),
    ).toHaveLength(1);
  });

  it("records a note against the booking, attributed to its author", async () => {
    const { reference } = await book({ checkIn: d("05-20"), checkOut: d("05-22") });

    expect(await addBookingNote(actor, reference, "Called the guest.")).toEqual({
      status: "ok",
    });

    const detail = await getBookingForOps(reference);
    expect(detail!.notes[0].body).toBe("Called the guest.");
    expect(detail!.notes[0].authorName).toBe("Ops Bot");
  });

  it("answers not-found for a reference that does not exist", async () => {
    expect(await changeBookingStatus(actor, "PT-2026-NOSUCH", "confirmed")).toEqual({
      status: "not-found",
    });
    expect(await addBookingNote(actor, "PT-2026-NOSUCH", "hello")).toEqual({
      status: "not-found",
    });
    expect(await getBookingForOps("PT-2026-NOSUCH")).toBeNull();
  });

  it("finds a booking by reference, name and email", async () => {
    const { reference } = await book({ checkIn: d("06-01"), checkOut: d("06-03") });

    for (const query of [reference, "Amina", `guest${TEST_EMAIL_DOMAIN}`]) {
      const found = await listBookings({
        status: null,
        staySlug: null,
        query,
        checkInFrom: null,
        checkInTo: null,
        page: 1,
      });
      expect(found.rows.some((r) => r.reference === reference)).toBe(true);
    }
  });
});

suite("operations on the catalogue", () => {
  beforeAll(async () => {
    await clear();
    const db = getDb();
    const [created] = await db
      .insert(staffUsers)
      .values({
        email: STAFF_EMAIL,
        name: "Ops Bot",
        role: "admin",
        passwordHash: await hashPassword("a-long-enough-test-password"),
      })
      .returning({ id: staffUsers.id });
    actor.id = created.id;
  });

  afterAll(clear);

  it("refuses an accommodation that belongs to a different property", async () => {
    const db = getDb();
    const rows = await db.execute<{ id: number }>(
      sql`
        SELECT o.id FROM accommodation_options o
        JOIN stays s ON s.id = o.stay_id
        WHERE s.slug = 'forest-canopy-lodge'
        LIMIT 1
      `,
    );
    const foreignOptionId = rows.rows[0].id;

    // The property comes from the URL and the option id from the form. Posting
    // one property's option under another's slug must do nothing.
    expect(
      await updateAccommodation(actor, "kyambura-gorge-retreat", foreignOptionId, {
        priceFromUgx: 1,
        inventoryCount: 999,
      }),
    ).toEqual({ status: "not-found" });
  });

  it("does not rewrite the price a previous booking was quoted", async () => {
    const { reference } = await book({ checkIn: d("07-01"), checkOut: d("07-03") });
    const before = await getBookingForOps(reference);

    const db = getDb();
    const rows = await db.execute<{ id: number; price: number; units: number }>(
      sql`
        SELECT o.id, o.price_from_ugx AS price, o.inventory_count AS units
          FROM accommodation_options o
          JOIN stays s ON s.id = o.stay_id
         WHERE s.slug = ${STAY.staySlug} AND o.slug = ${STAY.optionSlug}
      `,
    );
    const option = rows.rows[0];

    try {
      await updateAccommodation(actor, STAY.staySlug, option.id, {
        priceFromUgx: option.price + 500_000,
        inventoryCount: option.units,
      });

      const after = await getBookingForOps(reference);
      // This is what the Release 4 snapshot columns are for.
      expect(after!.nightlyRateUgx).toBe(before!.nightlyRateUgx);
      expect(after!.estimatedTotalUgx).toBe(before!.estimatedTotalUgx);
    } finally {
      // Restore, so the shared branch is left as it was found.
      await updateAccommodation(actor, STAY.staySlug, option.id, {
        priceFromUgx: option.price,
        inventoryCount: option.units,
      });
    }
  });
});
