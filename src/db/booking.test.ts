import { config } from "dotenv";
import { randomUUID } from "node:crypto";
import { like, sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { getDb } from "@/db";
import { accommodationOptions, bookings } from "@/db/schema";
import {
  type CreateBookingInput,
  createBookingRequest,
  getBookingByReference,
  getOptionAvailability,
} from "@/lib/booking-query";
import { BOOKING_REFERENCE_PATTERN } from "@/lib/booking-rules";
import { BLOCKING_BOOKING_STATUSES, BOOKING_STATUSES } from "@/lib/booking-status";

config({ path: ".env.local", quiet: true });

const hasDb = Boolean(process.env.DATABASE_URL);
const suite = hasDb ? describe : describe.skip;

/**
 * Booking integrity against the real Neon branch.
 *
 * These are the tests that matter in Release 4: they assert the invariants a
 * reservation system cannot get wrong. Availability arithmetic, the half-open
 * date boundary, capacity, server-side repricing, idempotency and the
 * no-overbooking guarantee are all checked against the database rather than a
 * mock, because the guarantee *is* a database constraint — a mock would prove
 * nothing.
 *
 * Isolation is by traveller email, not by date. Every row these tests create
 * carries `@booking-test.invalid` — a TLD RFC 2606 reserves precisely so it can
 * never be a real address — and cleanup deletes exactly those rows. Deleting by
 * date range would risk destroying genuine demo bookings on the shared Neon
 * branch, which is not a trade a test suite gets to make.
 *
 * Dates sit in 2027: far enough out that demo traffic is unlikely to collide,
 * and inside the 18-month booking horizon that `validateTrip` enforces.
 */

const TEST_EMAIL_DOMAIN = "@booking-test.invalid";
const d = (monthDay: string) => `2027-${monthDay}`;

/** Single unit — the sharpest case for conflict and concurrency. */
const SOLO = { staySlug: "kidepo-plains-camp", optionSlug: "outcrop-suite" };
/** Two units — proves inventory is counted, not just "any booking blocks". */
const PAIR = { staySlug: "forest-canopy-lodge", optionSlug: "family-cottage" };

const traveller = {
  fullName: "Amina Nakato",
  email: `amina${TEST_EMAIL_DOMAIN}`,
  phoneCode: "+256",
  phoneNumber: "0772 123 456",
  country: "Uganda",
  specialRequests: "",
};

function request(overrides: Partial<CreateBookingInput> = {}): CreateBookingInput {
  return {
    ...SOLO,
    checkIn: d("09-12"),
    checkOut: d("09-15"),
    guests: 2,
    experienceSlugs: [],
    traveller,
    requestToken: randomUUID(),
    ...overrides,
  };
}

async function clearTestBookings() {
  const db = getDb();
  await db.delete(bookings).where(like(bookings.guestEmail, `%${TEST_EMAIL_DOMAIN}`));
}

/**
 * Asserts Postgres rejected a write because of a specific named constraint.
 *
 * Drizzle wraps the driver error, so the constraint name may be on the cause
 * rather than the surface — the same chain-walking `booking-query.ts` has to do
 * to recognise a duplicate token. Matching on the name rather than the message
 * keeps the assertion about the invariant, not about error formatting.
 */
async function expectConstraintViolation(
  run: () => Promise<unknown>,
  constraintName: string,
) {
  try {
    await run();
  } catch (error) {
    const chain: Record<string, unknown>[] = [];
    let current: unknown = error;
    while (typeof current === "object" && current !== null && chain.length < 5) {
      const node = current as Record<string, unknown>;
      chain.push(node);
      current = node.cause;
    }
    const haystack = chain
      .flatMap((node) => [node.constraint, node.message, node.detail])
      .filter((value): value is string => typeof value === "string")
      .join(" | ");
    expect(haystack).toContain(constraintName);
    return;
  }
  throw new Error(`expected the write to violate ${constraintName}, but it succeeded`);
}

suite("booking creation", () => {
  beforeAll(clearTestBookings);
  afterAll(clearTestBookings);

  it("creates a pending request and prices it from the database", async () => {
    const db = getDb();
    const [option] = await db
      .select({ price: accommodationOptions.priceFromUgx })
      .from(accommodationOptions)
      .where(sql`${accommodationOptions.slug} = ${SOLO.optionSlug}`)
      .limit(1);

    const result = await createBookingRequest(request());
    expect(result.status).toBe("created");
    if (result.status !== "created") return;

    expect(result.reference).toMatch(BOOKING_REFERENCE_PATTERN);

    const booking = await getBookingByReference(result.reference);
    expect(booking).not.toBeNull();
    expect(booking!.status).toBe("pending");
    expect(booking!.nights).toBe(3);
    expect(booking!.guests).toBe(2);
    // The nightly rate is the catalogue rate, not anything a client supplied.
    expect(booking!.nightlyRateUgx).toBe(option.price);
    expect(booking!.accommodationSubtotalUgx).toBe(option.price * 3);
    expect(booking!.estimatedTotalUgx).toBe(
      booking!.accommodationSubtotalUgx + booking!.experiencesSubtotalUgx,
    );
    expect(booking!.stay.slug).toBe(SOLO.staySlug);
  });

  it("normalises traveller details before storing them", async () => {
    const result = await createBookingRequest(
      request({
        checkIn: d("03-04"),
        checkOut: d("03-06"),
        traveller: {
          fullName: "  Amina   Nakato  ",
          email: `  AMINA${TEST_EMAIL_DOMAIN.toUpperCase()} `,
          phoneCode: "+256",
          phoneNumber: "0772-123-456",
          country: "Uganda",
          specialRequests: "   Late arrival, around 21:00.   ",
        },
      }),
    );
    expect(result.status).toBe("created");
    if (result.status !== "created") return;

    const booking = await getBookingByReference(result.reference);
    expect(booking!.guestName).toBe("Amina Nakato");
    expect(booking!.guestEmail).toBe(`amina${TEST_EMAIL_DOMAIN}`);
    // Trunk zero dropped, separators stripped, dialling code joined.
    expect(booking!.guestPhone).toBe("+256772123456");
    expect(booking!.specialRequests).toBe("Late arrival, around 21:00.");
  });

  it("stores an empty special request as null, not an empty string", async () => {
    const result = await createBookingRequest(
      request({ checkIn: d("03-10"), checkOut: d("03-12") }),
    );
    if (result.status !== "created") throw new Error("expected creation");
    const booking = await getBookingByReference(result.reference);
    expect(booking!.specialRequests).toBeNull();
  });

  it("returns null for an unknown reference rather than throwing", async () => {
    expect(await getBookingByReference("PT-2031-ZZZZZZ")).toBeNull();
  });
});

suite("booking validation rejects tampered input", () => {
  beforeAll(clearTestBookings);
  afterAll(clearTestBookings);

  it("rejects an accommodation that belongs to another property", async () => {
    // forest-suite is real, but it belongs to forest-canopy-lodge.
    const result = await createBookingRequest(
      request({ staySlug: "kidepo-plains-camp", optionSlug: "forest-suite" }),
    );
    expect(result.status).toBe("invalid");
  });

  it("rejects an accommodation slug that does not exist", async () => {
    const result = await createBookingRequest(request({ optionSlug: "no-such-option" }));
    expect(result.status).toBe("invalid");
  });

  it("rejects a guest count above the accommodation capacity", async () => {
    const result = await createBookingRequest(request({ guests: 40 }));
    expect(result.status).toBe("invalid");
    if (result.status !== "invalid") return;
    expect(result.errors.guests).toBeDefined();
  });

  it("rejects a check-in in the past", async () => {
    const result = await createBookingRequest(
      request({ checkIn: "2020-01-01", checkOut: "2020-01-04" }),
    );
    expect(result.status).toBe("invalid");
    if (result.status !== "invalid") return;
    expect(result.errors.checkIn).toBeDefined();
  });

  it("rejects a check-out on or before check-in", async () => {
    const same = await createBookingRequest(
      request({ checkIn: d("05-10"), checkOut: d("05-10") }),
    );
    expect(same.status).toBe("invalid");

    const backwards = await createBookingRequest(
      request({ checkIn: d("05-10"), checkOut: d("05-08") }),
    );
    expect(backwards.status).toBe("invalid");
  });

  it("rejects an invalid email", async () => {
    const result = await createBookingRequest(
      request({ traveller: { ...traveller, email: "not-an-email" } }),
    );
    expect(result.status).toBe("invalid");
    if (result.status !== "invalid") return;
    expect(result.errors.email).toBeDefined();
  });

  it("rejects a country outside the offered list", async () => {
    const result = await createBookingRequest(
      request({ traveller: { ...traveller, country: "Atlantis" } }),
    );
    expect(result.status).toBe("invalid");
  });

  it("ignores experience slugs the property does not offer", async () => {
    const result = await createBookingRequest(
      request({
        checkIn: d("06-01"),
        checkOut: d("06-03"),
        // white-water-rafting is a Jinja experience, not a Kidepo one.
        experienceSlugs: ["white-water-rafting"],
      }),
    );
    expect(result.status).toBe("created");
    if (result.status !== "created") return;

    const booking = await getBookingByReference(result.reference);
    expect(booking!.experiences).toHaveLength(0);
    expect(booking!.experiencesSubtotalUgx).toBe(0);
  });

  it("prices selected experiences from the catalogue, per guest", async () => {
    const result = await createBookingRequest(
      request({
        checkIn: d("06-10"),
        checkOut: d("06-12"),
        guests: 2,
        experienceSlugs: ["game-drive"],
      }),
    );
    expect(result.status).toBe("created");
    if (result.status !== "created") return;

    const booking = await getBookingByReference(result.reference);
    expect(booking!.experiences).toHaveLength(1);

    const line = booking!.experiences[0];
    expect(line.guests).toBe(2);
    expect(line.lineTotalUgx).toBe((line.priceUgx ?? 0) * 2);
    expect(booking!.experiencesSubtotalUgx).toBe(line.lineTotalUgx);
    expect(booking!.estimatedTotalUgx).toBe(
      booking!.accommodationSubtotalUgx + booking!.experiencesSubtotalUgx,
    );
  });
});

suite("availability overlap semantics", () => {
  beforeAll(clearTestBookings);
  afterAll(clearTestBookings);

  /**
   * The four boundary cases against an existing 12 → 15 Sep booking on a
   * single-unit accommodation. Half-open `[)`: a checkout frees the day.
   */
  it("holds 12→15, then accepts 15→18 (checkout day is free)", async () => {
    const first = await createBookingRequest(
      request({ checkIn: d("09-12"), checkOut: d("09-15") }),
    );
    expect(first.status).toBe("created");

    const second = await createBookingRequest(
      request({ checkIn: d("09-15"), checkOut: d("09-18") }),
    );
    expect(second.status).toBe("created");
  });

  it("refuses 14→18 against an existing 12→15 (overlaps)", async () => {
    const result = await createBookingRequest(
      request({ checkIn: d("09-14"), checkOut: d("09-18") }),
    );
    expect(result.status).toBe("unavailable");
  });

  it("accepts 10→12 against an existing 12→15 (arrives as the other leaves)", async () => {
    const result = await createBookingRequest(
      request({ checkIn: d("09-10"), checkOut: d("09-12") }),
    );
    expect(result.status).toBe("created");
  });

  it("refuses 10→13 against an existing 12→15 (overlaps)", async () => {
    const result = await createBookingRequest(
      request({ checkIn: d("09-10"), checkOut: d("09-13") }),
    );
    expect(result.status).toBe("unavailable");
  });

  it("refuses a request fully inside an existing booking", async () => {
    const result = await createBookingRequest(
      request({ checkIn: d("09-13"), checkOut: d("09-14") }),
    );
    expect(result.status).toBe("unavailable");
  });

  it("refuses a request that fully contains an existing booking", async () => {
    const result = await createBookingRequest(
      request({ checkIn: d("09-11"), checkOut: d("09-17") }),
    );
    expect(result.status).toBe("unavailable");
  });
});

suite("inventory counting", () => {
  beforeAll(clearTestBookings);
  afterAll(clearTestBookings);

  it("allows exactly `inventoryCount` overlapping bookings, then refuses", async () => {
    const db = getDb();
    const [option] = await db
      .select({
        id: accommodationOptions.id,
        inventory: accommodationOptions.inventoryCount,
      })
      .from(accommodationOptions)
      .where(sql`${accommodationOptions.slug} = ${PAIR.optionSlug}`)
      .limit(1);

    expect(option.inventory).toBeGreaterThan(1);

    const dates = { checkIn: d("04-05"), checkOut: d("04-08") };
    for (let i = 0; i < option.inventory; i += 1) {
      const result = await createBookingRequest(request({ ...PAIR, ...dates, guests: 2 }));
      expect(result.status).toBe("created");
    }

    // One more than the property has.
    const overflow = await createBookingRequest(request({ ...PAIR, ...dates, guests: 2 }));
    expect(overflow.status).toBe("unavailable");
  });

  it("reports remaining units through the availability query", async () => {
    const db = getDb();
    const [stay] = await db.execute<{ id: number; oid: number; inv: number }>(sql`
      SELECT s.id::int AS id, o.id::int AS oid, o.inventory_count::int AS inv
      FROM stays s JOIN accommodation_options o ON o.stay_id = s.id
      WHERE s.slug = ${PAIR.staySlug} AND o.slug = ${PAIR.optionSlug}
    `).then((r) => r.rows);

    const dates = { checkIn: d("07-01"), checkOut: d("07-04") };
    const before = await getOptionAvailability(stay.id, dates.checkIn, dates.checkOut);
    expect(before.get(stay.oid)).toBe(stay.inv);

    const created = await createBookingRequest(request({ ...PAIR, ...dates, guests: 2 }));
    expect(created.status).toBe("created");

    const after = await getOptionAvailability(stay.id, dates.checkIn, dates.checkOut);
    expect(after.get(stay.oid)).toBe(stay.inv - 1);

    // A non-overlapping window is unaffected.
    const elsewhere = await getOptionAvailability(stay.id, d("07-10"), d("07-12"));
    expect(elsewhere.get(stay.oid)).toBe(stay.inv);
  });

  it("releases the unit when a booking is cancelled", async () => {
    const db = getDb();
    const dates = { checkIn: d("08-01"), checkOut: d("08-04") };

    const first = await createBookingRequest(request(dates));
    expect(first.status).toBe("created");
    if (first.status !== "created") return;

    // Single-unit accommodation: the second must fail while the first stands.
    const blocked = await createBookingRequest(request(dates));
    expect(blocked.status).toBe("unavailable");

    // No cancellation flow exists in Release 4, so move the status directly.
    await db.execute(
      sql`UPDATE ${bookings} SET status = 'cancelled' WHERE reference = ${first.reference}`,
    );

    const afterCancel = await createBookingRequest(request(dates));
    expect(afterCancel.status).toBe("created");
  });
});

suite("idempotency and concurrency", () => {
  beforeAll(clearTestBookings);
  afterAll(clearTestBookings);

  it("returns the original booking when the same request token is replayed", async () => {
    const token = randomUUID();
    const input = request({ checkIn: d("10-05"), checkOut: d("10-08"), requestToken: token });

    const first = await createBookingRequest(input);
    expect(first.status).toBe("created");
    if (first.status !== "created") return;

    const replay = await createBookingRequest(input);
    expect(replay.status).toBe("duplicate");
    if (replay.status !== "duplicate") return;
    expect(replay.reference).toBe(first.reference);

    const db = getDb();
    const rows = await db.execute<{ n: number }>(
      sql`SELECT COUNT(*)::int AS n FROM ${bookings} WHERE request_token = ${token}::uuid`,
    );
    expect(Number(rows.rows[0].n)).toBe(1);
  });

  it("survives a double submit fired simultaneously", async () => {
    const token = randomUUID();
    const input = request({ checkIn: d("10-15"), checkOut: d("10-18"), requestToken: token });

    const [a, b] = await Promise.all([
      createBookingRequest(input),
      createBookingRequest(input),
    ]);

    const references = [a, b]
      .filter((r): r is { status: "created" | "duplicate"; reference: string } =>
        r.status === "created" || r.status === "duplicate",
      )
      .map((r) => r.reference);

    // Both callers get an answer, and it is the same booking.
    expect(references).toHaveLength(2);
    expect(new Set(references).size).toBe(1);
  });

  it("never overbooks when several requests race for the final unit", async () => {
    const dates = { checkIn: d("11-02"), checkOut: d("11-05") };

    // Six independent travellers, one unit, all submitted at once.
    const results = await Promise.all(
      Array.from({ length: 6 }, () => createBookingRequest(request(dates))),
    );

    const created = results.filter((r) => r.status === "created");
    const refused = results.filter((r) => r.status === "unavailable");

    expect(created).toHaveLength(1);
    expect(refused).toHaveLength(5);

    // And the database agrees — this is the invariant, not the count above.
    const db = getDb();
    const rows = await db.execute<{ n: number }>(sql`
      SELECT COUNT(*)::int AS n FROM ${bookings}
      WHERE check_in = ${dates.checkIn}::date AND status IN ('pending', 'confirmed')
    `);
    expect(Number(rows.rows[0].n)).toBe(1);
  });

  it("issues a distinct reference to every booking", async () => {
    const results = await Promise.all([
      createBookingRequest(request({ checkIn: d("12-01"), checkOut: d("12-03") })),
      createBookingRequest(request({ ...PAIR, checkIn: d("12-01"), checkOut: d("12-03") })),
      createBookingRequest(request({ ...PAIR, checkIn: d("12-04"), checkOut: d("12-06") })),
    ]);

    const references = results
      .filter((r): r is { status: "created"; reference: string } => r.status === "created")
      .map((r) => r.reference);

    expect(references.length).toBeGreaterThanOrEqual(3);
    expect(new Set(references).size).toBe(references.length);
    for (const reference of references) {
      expect(reference).toMatch(BOOKING_REFERENCE_PATTERN);
    }
  });
});

suite("database constraints are the final authority", () => {
  beforeAll(clearTestBookings);
  afterAll(clearTestBookings);

  /**
   * These bypass the service layer entirely and write raw SQL, which is the
   * point: if application code is ever wrong, or a script or a future admin
   * tool writes directly, the database must still refuse.
   */
  async function rawInsert(overrides: Record<string, string>) {
    const db = getDb();
    const columns = {
      reference: `'PT-2031-RAW${Math.floor(Math.random() * 900 + 100)}'`,
      request_token: `'${randomUUID()}'::uuid`,
      stay_id: `(SELECT id FROM stays WHERE slug = '${SOLO.staySlug}')`,
      accommodation_option_id: `(SELECT o.id FROM accommodation_options o JOIN stays s ON s.id = o.stay_id WHERE s.slug = '${SOLO.staySlug}' AND o.slug = '${SOLO.optionSlug}')`,
      unit_index: "1",
      check_in: `'${d("02-10")}'::date`,
      check_out: `'${d("02-13")}'::date`,
      nights: "3",
      guests: "2",
      nightly_rate_ugx: "100000",
      accommodation_subtotal_ugx: "300000",
      experiences_subtotal_ugx: "0",
      estimated_total_ugx: "300000",
      currency: "'UGX'",
      status: "'pending'",
      guest_name: "'Raw Test'",
      guest_email: `'raw${TEST_EMAIL_DOMAIN}'`,
      guest_phone: "'+256772000000'",
      guest_country: "'Uganda'",
      ...overrides,
    };
    await db.execute(
      sql.raw(
        `INSERT INTO bookings (${Object.keys(columns).join(", ")}) VALUES (${Object.values(columns).join(", ")})`,
      ),
    );
  }

  it("refuses a second blocking booking on the same unit and overlapping dates", async () => {
    await rawInsert({});
    // Same unit_index, overlapping range. This is the no-double-booking
    // invariant, and nothing in application code is involved in enforcing it.
    await expectConstraintViolation(
      () =>
        rawInsert({
          check_in: `'${d("02-12")}'::date`,
          check_out: `'${d("02-15")}'::date`,
        }),
      "bookings_no_overlapping_unit",
    );
  });

  it("allows the same unit once the dates no longer overlap", async () => {
    // 02-13 → 02-16 against the 02-10 → 02-13 row above: touching, not overlapping.
    await expect(
      rawInsert({ check_in: `'${d("02-13")}'::date`, check_out: `'${d("02-16")}'::date` }),
    ).resolves.toBeUndefined();
  });

  it("refuses a total that does not equal the sum of its parts", async () => {
    await expectConstraintViolation(
      () =>
        rawInsert({
          check_in: `'${d("02-20")}'::date`,
          check_out: `'${d("02-23")}'::date`,
          estimated_total_ugx: "999",
        }),
      "bookings_total_matches_parts",
    );
  });

  it("refuses a night count that disagrees with the dates", async () => {
    await expectConstraintViolation(
      () =>
        rawInsert({
          check_in: `'${d("02-25")}'::date`,
          check_out: `'${d("02-28")}'::date`,
          nights: "9",
        }),
      "bookings_nights_match_dates",
    );
  });

  it("refuses an accommodation that belongs to a different stay", async () => {
    await expectConstraintViolation(
      () =>
        rawInsert({
          check_in: `'${d("01-05")}'::date`,
          check_out: `'${d("01-08")}'::date`,
          accommodation_option_id:
            "(SELECT o.id FROM accommodation_options o JOIN stays s ON s.id = o.stay_id WHERE s.slug = 'forest-canopy-lodge' AND o.slug = 'forest-suite')",
        }),
      "bookings_option_stay_fk",
    );
  });

  it("refuses a check-out on or before check-in", async () => {
    await expectConstraintViolation(
      () =>
        rawInsert({
          check_in: `'${d("01-20")}'::date`,
          check_out: `'${d("01-20")}'::date`,
          nights: "0",
        }),
      "bookings_dates_ordered",
    );
  });

  it("blocks exactly the statuses BLOCKING_BOOKING_STATUSES names", async () => {
    /*
      The availability query filters on a TypeScript constant; the database
      enforces a predicate compiled into the exclusion constraint. If the two
      ever disagree, the interface offers a unit the database then refuses —
      the traveller is shown availability and rejected on submit. So read the
      real constraint definition back and compare.
    */
    const db = getDb();
    const rows = await db.execute<{ definition: string }>(sql`
      SELECT pg_get_constraintdef(oid) AS definition
      FROM pg_constraint
      WHERE conname = 'bookings_no_overlapping_unit'
    `);
    expect(rows.rows).toHaveLength(1);

    const definition = rows.rows[0].definition;
    for (const status of BLOCKING_BOOKING_STATUSES) {
      expect(definition).toContain(`'${status}'`);
    }
    for (const status of BOOKING_STATUSES) {
      if ((BLOCKING_BOOKING_STATUSES as readonly string[]).includes(status)) continue;
      expect(definition).not.toContain(`'${status}'`);
    }
    // And the range really is half-open, which is what makes 15→18 legal
    // against a 12→15 booking.
    expect(definition).toContain("'[)'");
  });

  it("refuses a guest count of zero", async () => {
    await expectConstraintViolation(
      () =>
        rawInsert({
          check_in: `'${d("01-25")}'::date`,
          check_out: `'${d("01-27")}'::date`,
          nights: "2",
          guests: "0",
        }),
      "bookings_guests_positive",
    );
  });
});
