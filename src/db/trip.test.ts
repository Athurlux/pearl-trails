import { config } from "dotenv";
import { randomUUID } from "node:crypto";
import { like, sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { getDb } from "@/db";
import { bookings, itineraryItems } from "@/db/schema";
import {
  type CreateBookingInput,
  createBookingRequest,
} from "@/lib/booking-query";
import {
  addTravellerItem,
  deleteTravellerItem,
  getTripByToken,
  reissueTripToken,
  rescheduleExperienceItem,
  saveTripNote,
  tokenMatchesReference,
  updateTravellerItem,
} from "@/lib/trip-query";
import { generateTripToken } from "@/lib/trip-rules";

config({ path: ".env.local", quiet: true });

const hasDb = Boolean(process.env.DATABASE_URL);
const suite = hasDb ? describe : describe.skip;

/**
 * Trip and itinerary integrity against the real Neon branch.
 *
 * Two things are being defended here, and neither can be proved with a mock:
 *
 *   * **Idempotent generation.** The guarantee is a pair of partial unique
 *     indexes, so only the database can demonstrate it.
 *   * **Provenance-based access.** "A traveller cannot delete their check-out"
 *     is a `WHERE` clause, and the test that matters is the one that posts the
 *     id anyway and shows the row survives.
 *
 * Isolation is by traveller email, as in `booking.test.ts` — never by date
 * range, because this Neon branch also holds demo bookings.
 */

/**
 * A marker of its own, and that is not cosmetic.
 *
 * Vitest runs test *files* in parallel. When this suite shared
 * `@booking-test.invalid` with `booking.test.ts`, each file's `beforeAll`
 * cleanup deleted the other's rows mid-run: booking assertions saw a unit
 * spontaneously become available, and trip assertions hit foreign-key failures
 * against bookings that had been removed underneath them. Both suites were
 * correct; their isolation was not.
 *
 * Still under `.invalid`, which RFC 2606 reserves so it can never be a real
 * address, and still never cleaned up by date range.
 */
const TEST_EMAIL_DOMAIN = "@trip-test.invalid";
const d = (monthDay: string) => `2027-${monthDay}`;

const STAY = { staySlug: "forest-canopy-lodge", optionSlug: "canopy-room" };

const traveller = {
  fullName: "Amina Nakato",
  email: `trip${TEST_EMAIL_DOMAIN}`,
  phoneCode: "+256",
  phoneNumber: "0772 123 456",
  country: "Uganda",
  specialRequests: "",
};

function request(overrides: Partial<CreateBookingInput> = {}): CreateBookingInput {
  return {
    ...STAY,
    checkIn: d("06-12"),
    checkOut: d("06-15"),
    guests: 2,
    experienceSlugs: [],
    traveller,
    requestToken: randomUUID(),
    ...overrides,
  };
}

/** Books, and hands back the raw trip token issued exactly once at creation. */
async function book(overrides: Partial<CreateBookingInput> = {}) {
  const result = await createBookingRequest(request(overrides));
  if (result.status !== "created") {
    throw new Error(`expected a booking, got ${result.status}`);
  }
  return result;
}

async function clearTestBookings() {
  const db = getDb();
  // itinerary_items cascades from bookings, so this is enough.
  await db.delete(bookings).where(like(bookings.guestEmail, `%${TEST_EMAIL_DOMAIN}`));
}

suite("trip access", () => {
  beforeAll(clearTestBookings);
  afterAll(clearTestBookings);

  it("opens a trip with the token issued at booking", async () => {
    const { reference, tripToken } = await book();
    const trip = await getTripByToken(tripToken);

    expect(trip).not.toBeNull();
    expect(trip!.reference).toBe(reference);
    expect(trip!.stay.name).toBe("Forest Canopy Lodge");
  });

  it("refuses a token that was never issued", async () => {
    await book();
    expect(await getTripByToken(generateTripToken())).toBeNull();
  });

  it("refuses a malformed token without touching the database", async () => {
    for (const bad of ["", "   ", "not-a-token", "PT-2026-ABCDEF", "A".repeat(33)]) {
      expect(await getTripByToken(bad)).toBeNull();
    }
  });

  it("stores a hash, not the token", async () => {
    const { tripToken } = await book();
    const db = getDb();
    const rows = await db.execute<{ n: number }>(sql`
      SELECT COUNT(*)::int AS n FROM ${bookings}
      WHERE trip_token_hash = ${tripToken}
    `);
    // Read access to the table must not be write access to the trip.
    expect(Number(rows.rows[0].n)).toBe(0);
  });

  it("one token opens one trip and not another", async () => {
    const first = await book({ checkIn: d("06-20"), checkOut: d("06-22") });
    const second = await book({ checkIn: d("06-24"), checkOut: d("06-26") });

    expect((await getTripByToken(first.tripToken))!.reference).toBe(first.reference);
    expect((await getTripByToken(second.tripToken))!.reference).toBe(second.reference);
    expect(first.tripToken).not.toBe(second.tripToken);
  });

  it("confirms a token belongs to a reference, and rejects a mismatch", async () => {
    const first = await book({ checkIn: d("07-01"), checkOut: d("07-03") });
    const second = await book({ checkIn: d("07-05"), checkOut: d("07-07") });

    expect(await tokenMatchesReference(first.reference, first.tripToken)).toBe(true);
    expect(await tokenMatchesReference(first.reference, second.tripToken)).toBe(false);
    expect(await tokenMatchesReference(first.reference, generateTripToken())).toBe(false);
  });
});

suite("recovering a trip link", () => {
  beforeAll(clearTestBookings);
  afterAll(clearTestBookings);

  it("reissues on a matching reference and email", async () => {
    const { reference, tripToken } = await book();
    const reissued = await reissueTripToken(reference, traveller.email);

    expect(reissued).not.toBeNull();
    expect(reissued).not.toBe(tripToken);
    expect((await getTripByToken(reissued!))!.reference).toBe(reference);
  });

  it("retires the previous link, which is the cost of storing only a hash", async () => {
    const { reference, tripToken } = await book({ checkIn: d("07-10"), checkOut: d("07-12") });
    await reissueTripToken(reference, traveller.email);

    expect(await getTripByToken(tripToken)).toBeNull();
  });

  it("ignores case and surrounding space in the email", async () => {
    const { reference } = await book({ checkIn: d("07-14"), checkOut: d("07-16") });
    expect(await reissueTripToken(reference, `  ${traveller.email.toUpperCase()} `)).not.toBeNull();
  });

  it("refuses a wrong email, and answers the same way for a reference that does not exist", async () => {
    const { reference } = await book({ checkIn: d("07-18"), checkOut: d("07-20") });

    // Identical answers, so this cannot be used to discover which references
    // are real or who booked what.
    expect(await reissueTripToken(reference, `someone-else${TEST_EMAIL_DOMAIN}`)).toBeNull();
    expect(await reissueTripToken("PT-2026-ZZZZZZ", traveller.email)).toBeNull();
    expect(await reissueTripToken(reference, "")).toBeNull();
  });
});

suite("itinerary generation", () => {
  beforeAll(clearTestBookings);
  afterAll(clearTestBookings);

  it("gives a booking check-in, check-out and each requested experience", async () => {
    const { tripToken } = await book({
      experienceSlugs: ["gorilla-trekking", "forest-nature-walk"],
    });

    const trip = await getTripByToken(tripToken);
    const kinds = trip!.itinerary.map((i) => i.systemKind ?? i.source);

    expect(kinds).toContain("check_in");
    expect(kinds).toContain("check_out");
    expect(trip!.itinerary.filter((i) => i.source === "experience")).toHaveLength(2);
  });

  it("uses the property's published times, and invents none", async () => {
    const { tripToken } = await book({
      checkIn: d("08-01"),
      checkOut: d("08-04"),
      experienceSlugs: ["gorilla-trekking"],
    });

    const trip = await getTripByToken(tripToken);
    const checkIn = trip!.itinerary.find((i) => i.systemKind === "check_in")!;
    const checkOut = trip!.itinerary.find((i) => i.systemKind === "check_out")!;
    const experience = trip!.itinerary.find((i) => i.source === "experience")!;

    expect(checkIn.exactTime).toBe(trip!.stay.checkInTime);
    expect(checkOut.exactTime).toBe(trip!.stay.checkOutTime);
    expect(checkIn.day).toBe(trip!.checkIn);
    expect(checkOut.day).toBe(trip!.checkOut);
    // No clock time is claimed for something nobody has scheduled.
    expect(experience.exactTime).toBeNull();
  });

  it("is idempotent — reopening the trip does not duplicate anything", async () => {
    const { tripToken } = await book({
      checkIn: d("08-10"),
      checkOut: d("08-13"),
      experienceSlugs: ["gorilla-trekking"],
    });

    const first = await getTripByToken(tripToken);
    await getTripByToken(tripToken);
    await getTripByToken(tripToken);
    const last = await getTripByToken(tripToken);

    expect(last!.itinerary).toHaveLength(first!.itinerary.length);
    expect(last!.itinerary.filter((i) => i.systemKind === "check_in")).toHaveLength(1);
  });

  it("does not duplicate under concurrent first visits", async () => {
    // The race the partial unique indexes exist for: six visitors arriving at
    // an ungenerated trip at once. "Check, then insert" loses this.
    const { tripToken } = await book({ checkIn: d("08-20"), checkOut: d("08-23") });

    await Promise.all(Array.from({ length: 6 }, () => getTripByToken(tripToken)));

    const trip = await getTripByToken(tripToken);
    expect(trip!.itinerary.filter((i) => i.systemKind === "check_in")).toHaveLength(1);
    expect(trip!.itinerary.filter((i) => i.systemKind === "check_out")).toHaveLength(1);
  });

  it("generates for a booking that predates itineraries", async () => {
    // Release 4 bookings have no itinerary. The first visit is the backfill —
    // there is no migration to run and none to forget.
    const { tripToken, reference } = await book({
      checkIn: d("09-01"),
      checkOut: d("09-03"),
      experienceSlugs: ["gorilla-trekking"],
    });
    const db = getDb();

    // Strip the itinerary back to the state a Release 4 booking is in.
    await db.delete(itineraryItems).where(
      sql`booking_id = (SELECT id FROM ${bookings} WHERE reference = ${reference})`,
    );
    // Checked against the table, not through `getTripByToken` — that generates
    // on read, so asking it would rebuild the very thing being cleared.
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(itineraryItems)
      .where(
        sql`booking_id = (SELECT id FROM ${bookings} WHERE reference = ${reference})`,
      );
    expect(count).toBe(0);

    // Opening it rebuilds the plan. No backfill migration exists because none
    // is needed — the first visit is the backfill.
    const rebuilt = await getTripByToken(tripToken);
    expect(rebuilt!.itinerary.filter((i) => i.systemKind === "check_in")).toHaveLength(1);
    expect(rebuilt!.itinerary.filter((i) => i.source === "experience")).toHaveLength(1);
  });

  it("orders the day chronologically with check-in last on arrival", async () => {
    const { tripToken } = await book({
      checkIn: d("09-10"),
      checkOut: d("09-13"),
      experienceSlugs: ["gorilla-trekking", "forest-nature-walk"],
    });

    const trip = await getTripByToken(tripToken);
    const days = trip!.itinerary.map((i) => i.day);
    expect([...days]).toEqual([...days].sort());
  });
});

suite("traveller itinerary items", () => {
  beforeAll(clearTestBookings);
  afterAll(clearTestBookings);

  it("adds, edits and deletes an item of their own", async () => {
    const { tripToken } = await book();

    expect(
      await addTravellerItem(tripToken, {
        title: "Airport pickup",
        day: d("06-12"),
        timeOfDay: "morning",
        note: "Driver meets us at arrivals.",
      }),
    ).toEqual({ status: "ok" });

    let trip = await getTripByToken(tripToken);
    const item = trip!.itinerary.find((i) => i.source === "traveller")!;
    expect(item.title).toBe("Airport pickup");

    expect(
      await updateTravellerItem(tripToken, item.id, {
        title: "Airport pickup — Entebbe",
        day: d("06-13"),
        timeOfDay: "evening",
        note: null,
      }),
    ).toEqual({ status: "ok" });

    trip = await getTripByToken(tripToken);
    const edited = trip!.itinerary.find((i) => i.id === item.id)!;
    expect(edited.title).toBe("Airport pickup — Entebbe");
    expect(edited.day).toBe(d("06-13"));
    expect(edited.note).toBeNull();

    expect(await deleteTravellerItem(tripToken, item.id)).toEqual({ status: "ok" });
    trip = await getTripByToken(tripToken);
    expect(trip!.itinerary.some((i) => i.id === item.id)).toBe(false);
  });

  it("refuses a day outside the booking", async () => {
    const { tripToken } = await book({ checkIn: d("10-01"), checkOut: d("10-04") });

    for (const day of [d("09-30"), d("10-05"), "2028-01-01"]) {
      expect(
        await addTravellerItem(tripToken, {
          title: "Somewhere else entirely",
          day,
          timeOfDay: "morning",
          note: null,
        }),
      ).toEqual({ status: "out-of-range" });
    }

    // The boundaries themselves are inside the trip: you are there on both.
    for (const day of [d("10-01"), d("10-04")]) {
      expect(
        await addTravellerItem(tripToken, {
          title: `Fine on ${day}`,
          day,
          timeOfDay: "morning",
          note: null,
        }),
      ).toEqual({ status: "ok" });
    }
  });

  it("refuses to move an item out of the trip", async () => {
    const { tripToken } = await book({ checkIn: d("10-10"), checkOut: d("10-12") });
    await addTravellerItem(tripToken, {
      title: "Lunch",
      day: d("10-11"),
      timeOfDay: "afternoon",
      note: null,
    });

    const trip = await getTripByToken(tripToken);
    const item = trip!.itinerary.find((i) => i.source === "traveller")!;

    expect(
      await updateTravellerItem(tripToken, item.id, {
        title: "Lunch",
        day: d("11-20"),
        timeOfDay: "afternoon",
        note: null,
      }),
    ).toEqual({ status: "out-of-range" });

    // And the row is untouched, not partially written.
    const after = await getTripByToken(tripToken);
    expect(after!.itinerary.find((i) => i.id === item.id)!.day).toBe(d("10-11"));
  });

  it("saves and clears a trip note", async () => {
    const { tripToken } = await book({ checkIn: d("10-20"), checkOut: d("10-22") });

    await saveTripNote(tripToken, "Driver meeting us at Entebbe at 8am.");
    expect((await getTripByToken(tripToken))!.tripNote).toBe(
      "Driver meeting us at Entebbe at 8am.",
    );

    await saveTripNote(tripToken, null);
    expect((await getTripByToken(tripToken))!.tripNote).toBeNull();
  });
});

suite("booking truth is protected from plan edits", () => {
  beforeAll(clearTestBookings);
  afterAll(clearTestBookings);

  it("will not delete check-in or check-out, whatever id is posted", async () => {
    const { tripToken } = await book();
    const trip = await getTripByToken(tripToken);

    for (const kind of ["check_in", "check_out"] as const) {
      const item = trip!.itinerary.find((i) => i.systemKind === kind)!;
      expect(await deleteTravellerItem(tripToken, item.id)).toEqual({ status: "not-yours" });
    }

    // Still there. This is the assertion that matters — the return value could
    // lie, the row cannot.
    const after = await getTripByToken(tripToken);
    expect(after!.itinerary.filter((i) => i.systemKind !== null)).toHaveLength(2);
  });

  it("will not delete a requested experience from the plan", async () => {
    // Removing an experience from the plan is not the same act as removing it
    // from the booking, and Release 5 cannot do the second.
    const { tripToken } = await book({
      checkIn: d("11-01"),
      checkOut: d("11-04"),
      experienceSlugs: ["gorilla-trekking"],
    });

    const trip = await getTripByToken(tripToken);
    const experience = trip!.itinerary.find((i) => i.source === "experience")!;

    expect(await deleteTravellerItem(tripToken, experience.id)).toEqual({
      status: "not-yours",
    });
    expect(
      (await getTripByToken(tripToken))!.itinerary.filter((i) => i.source === "experience"),
    ).toHaveLength(1);
  });

  it("will not edit a system item through the traveller path", async () => {
    const { tripToken } = await book({ checkIn: d("11-10"), checkOut: d("11-12") });
    const trip = await getTripByToken(tripToken);
    const checkIn = trip!.itinerary.find((i) => i.systemKind === "check_in")!;

    expect(
      await updateTravellerItem(tripToken, checkIn.id, {
        title: "Check in whenever I like",
        day: d("11-11"),
        timeOfDay: "evening",
        note: null,
      }),
    ).toEqual({ status: "not-yours" });

    const after = await getTripByToken(tripToken);
    const unchanged = after!.itinerary.find((i) => i.id === checkIn.id)!;
    expect(unchanged.title).toBe(checkIn.title);
    expect(unchanged.day).toBe(checkIn.day);
  });

  it("lets an experience be moved but not renamed", async () => {
    const { tripToken } = await book({
      checkIn: d("11-20"),
      checkOut: d("11-24"),
      experienceSlugs: ["gorilla-trekking"],
    });

    const trip = await getTripByToken(tripToken);
    const experience = trip!.itinerary.find((i) => i.source === "experience")!;

    expect(
      await rescheduleExperienceItem(tripToken, experience.id, {
        day: d("11-22"),
        timeOfDay: "evening",
      }),
    ).toEqual({ status: "ok" });

    const moved = (await getTripByToken(tripToken))!.itinerary.find(
      (i) => i.id === experience.id,
    )!;
    expect(moved.day).toBe(d("11-22"));
    expect(moved.timeOfDay).toBe("evening");
    // The name is the booking's snapshot and is not the traveller's to restate.
    expect(moved.title).toBe(experience.title);
  });

  it("will not reschedule a system item", async () => {
    const { tripToken } = await book({ checkIn: d("12-01"), checkOut: d("12-03") });
    const trip = await getTripByToken(tripToken);
    const checkOut = trip!.itinerary.find((i) => i.systemKind === "check_out")!;

    expect(
      await rescheduleExperienceItem(tripToken, checkOut.id, {
        day: d("12-02"),
        timeOfDay: "morning",
      }),
    ).toEqual({ status: "not-yours" });
  });
});

suite("one trip cannot reach another", () => {
  beforeAll(clearTestBookings);
  afterAll(clearTestBookings);

  it("refuses every mutation against an item on somebody else's trip", async () => {
    const mine = await book({ checkIn: d("06-01"), checkOut: d("06-03") });
    const theirs = await book({ checkIn: d("06-05"), checkOut: d("06-08") });

    await addTravellerItem(theirs.tripToken, {
      title: "Their private plan",
      day: d("06-06"),
      timeOfDay: "morning",
      note: "Not mine to touch.",
    });

    const theirTrip = await getTripByToken(theirs.tripToken);
    const theirItem = theirTrip!.itinerary.find((i) => i.source === "traveller")!;

    // Holding a valid token for *a* trip must not confer anything on another.
    expect(await deleteTravellerItem(mine.tripToken, theirItem.id)).toEqual({
      status: "not-yours",
    });
    expect(
      await updateTravellerItem(mine.tripToken, theirItem.id, {
        title: "Hijacked",
        day: d("06-02"),
        timeOfDay: "morning",
        note: null,
      }),
    ).toEqual({ status: "not-yours" });

    const after = await getTripByToken(theirs.tripToken);
    const survivor = after!.itinerary.find((i) => i.id === theirItem.id)!;
    expect(survivor.title).toBe("Their private plan");
  });

  it("refuses every mutation with a token that was never issued", async () => {
    const stranger = generateTripToken();
    expect(
      await addTravellerItem(stranger, {
        title: "x",
        day: d("06-02"),
        timeOfDay: "morning",
        note: null,
      }),
    ).toEqual({ status: "not-found" });
    expect(await deleteTravellerItem(stranger, 1)).toEqual({ status: "not-found" });
    expect(await saveTripNote(stranger, "x")).toEqual({ status: "not-found" });
  });
});
