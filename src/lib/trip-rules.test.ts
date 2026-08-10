import { describe, expect, it } from "vitest";
import {
  TRIP_TOKEN_PATTERN,
  compareItineraryItems,
  generateTripToken,
  hashTripToken,
  parseTripToken,
  planInitialItinerary,
  tripDays,
  validateItineraryItem,
  validateReschedule,
  validateTripNote,
} from "./trip-rules";
import { MAX_ITINERARY_NOTE, MAX_TRIP_NOTE } from "./itinerary-vocab";

/**
 * Pure trip rules — no database, no clock.
 *
 * The itinerary planner is deterministic by design, so these assert the actual
 * plan rather than that "some items came back".
 */

const stay = {
  stayName: "Forest Canopy Lodge",
  checkInTime: "14:00",
  checkOutTime: "10:00",
};

describe("trip token", () => {
  it("mints a 32-character token from the unambiguous alphabet", () => {
    const token = generateTripToken();
    expect(token).toMatch(TRIP_TOKEN_PATTERN);
    // I, L, O and U are excluded so a token cannot be misread or spell a word.
    expect(token).not.toMatch(/[ILOU]/);
  });

  it("does not repeat", () => {
    const tokens = new Set(Array.from({ length: 200 }, generateTripToken));
    expect(tokens.size).toBe(200);
  });

  it("accepts its own tokens case-insensitively and rejects anything else", () => {
    const token = generateTripToken();
    expect(parseTripToken(token.toLowerCase())).toBe(token);
    expect(parseTripToken(` ${token} `)).toBe(token);

    expect(parseTripToken("")).toBeNull();
    expect(parseTripToken(null)).toBeNull();
    expect(parseTripToken("short")).toBeNull();
    // Excluded letters are not silently coerced to look-alikes.
    expect(parseTripToken("I".repeat(32))).toBeNull();
    expect(parseTripToken(`${"A".repeat(31)}-`)).toBeNull();
    expect(parseTripToken("A".repeat(33))).toBeNull();
  });

  it("hashes to stable hex that does not contain the token", async () => {
    const token = generateTripToken();
    const hash = await hashTripToken(token);

    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(hash).toBe(await hashTripToken(token));
    expect(hash).not.toContain(token);
    expect(await hashTripToken(generateTripToken())).not.toBe(hash);
  });
});

describe("trip days", () => {
  it("counts the departure day: three nights is four days", () => {
    const days = tripDays("2026-09-12", "2026-09-15");
    expect(days.map((d) => d.date)).toEqual([
      "2026-09-12",
      "2026-09-13",
      "2026-09-14",
      "2026-09-15",
    ]);
    expect(days[0].isArrival).toBe(true);
    expect(days[3].isDeparture).toBe(true);
  });

  it("labels weekdays in UTC so the day does not shift by timezone", () => {
    // 12 September 2026 is a Saturday.
    const [first] = tripDays("2026-09-12", "2026-09-13");
    expect(first.weekday).toBe("Sat");
    // `en-GB` abbreviates September as "Sept", which is what the confirmation
    // page already prints. Matching the rest of the product beats matching a
    // three-letter habit.
    expect(first.dayMonth).toBe("12 Sept");

    const [august] = tripDays("2026-08-30", "2026-08-31");
    expect(august.dayMonth).toBe("30 Aug");
  });

  it("crosses a month boundary", () => {
    expect(tripDays("2026-08-30", "2026-09-02").map((d) => d.date)).toEqual([
      "2026-08-30",
      "2026-08-31",
      "2026-09-01",
      "2026-09-02",
    ]);
  });

  it("returns nothing for a range that is not a stay", () => {
    expect(tripDays("2026-09-15", "2026-09-12")).toEqual([]);
    expect(tripDays("2026-09-12", "2026-09-12")).toEqual([]);
  });
});

describe("initial itinerary", () => {
  it("opens with check-in and closes with check-out, at the property's times", () => {
    const items = planInitialItinerary({
      ...stay,
      checkIn: "2026-09-12",
      checkOut: "2026-09-15",
      experiences: [],
    });

    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({
      systemKind: "check_in",
      day: "2026-09-12",
      exactTime: "14:00",
    });
    expect(items[1]).toMatchObject({
      systemKind: "check_out",
      day: "2026-09-15",
      exactTime: "10:00",
    });
  });

  it("puts experiences on the full days, not on arrival or departure", () => {
    const items = planInitialItinerary({
      ...stay,
      checkIn: "2026-09-12",
      checkOut: "2026-09-15",
      experiences: [{ name: "Gorilla Trekking" }, { name: "Bird Watching" }],
    });

    const experiences = items.filter((i) => i.source === "experience");
    expect(experiences.map((e) => e.day)).toEqual(["2026-09-13", "2026-09-14"]);
    // An activity on the day you arrive at 14:00 or leave at 10:00 is a plan
    // nobody can keep.
    expect(experiences.every((e) => e.day !== "2026-09-12")).toBe(true);
    expect(experiences.every((e) => e.day !== "2026-09-15")).toBe(true);
  });

  it("spreads before it stacks, then stacks by time of day", () => {
    const items = planInitialItinerary({
      ...stay,
      checkIn: "2026-09-12",
      checkOut: "2026-09-15", // two full days
      experiences: [{ name: "A" }, { name: "B" }, { name: "C" }],
    });

    const experiences = items.filter((i) => i.source === "experience");
    expect(experiences.map((e) => [e.day, e.timeOfDay])).toEqual([
      ["2026-09-13", "morning"],
      ["2026-09-14", "morning"],
      ["2026-09-13", "afternoon"],
    ]);
  });

  it("falls back to the arrival evening on a one-night stay", () => {
    // There is no full day, so the evening is the only time that exists.
    const items = planInitialItinerary({
      ...stay,
      checkIn: "2026-09-12",
      checkOut: "2026-09-13",
      experiences: [{ name: "Campfire Dinner" }],
    });

    expect(items.filter((i) => i.source === "experience")).toEqual([
      expect.objectContaining({ day: "2026-09-12", timeOfDay: "evening" }),
    ]);
  });

  it("never invents a clock time for an experience", () => {
    const items = planInitialItinerary({
      ...stay,
      checkIn: "2026-09-12",
      checkOut: "2026-09-15",
      experiences: [{ name: "Gorilla Trekking" }],
    });

    // Only check-in and check-out have a real published time. Printing "08:00"
    // against a trek would be inventing an appointment nobody made.
    for (const item of items.filter((i) => i.source === "experience")) {
      expect(item.exactTime).toBeNull();
    }
  });

  it("is deterministic — the same booking plans the same trip", () => {
    const input = {
      ...stay,
      checkIn: "2026-09-12",
      checkOut: "2026-09-16",
      experiences: [{ name: "A" }, { name: "B" }, { name: "C" }],
    };
    expect(planInitialItinerary(input)).toEqual(planInitialItinerary(input));
  });

  it("plans nothing for a range that is not a stay", () => {
    expect(
      planInitialItinerary({ ...stay, checkIn: "2026-09-15", checkOut: "2026-09-12", experiences: [] }),
    ).toEqual([]);
  });
});

describe("itinerary ordering", () => {
  const item = (over: Partial<Parameters<typeof compareItineraryItems>[0]>) => ({
    id: 1,
    day: "2026-09-13",
    timeOfDay: "flexible" as const,
    exactTime: null,
    systemKind: null,
    ...over,
  });

  it("orders by day first", () => {
    const sorted = [
      item({ id: 2, day: "2026-09-14" }),
      item({ id: 1, day: "2026-09-12" }),
    ].sort(compareItineraryItems);
    expect(sorted.map((i) => i.day)).toEqual(["2026-09-12", "2026-09-14"]);
  });

  it("orders morning, afternoon, evening, then anytime", () => {
    const sorted = [
      item({ id: 1, timeOfDay: "flexible" }),
      item({ id: 2, timeOfDay: "evening" }),
      item({ id: 3, timeOfDay: "morning" }),
      item({ id: 4, timeOfDay: "afternoon" }),
    ].sort(compareItineraryItems);
    expect(sorted.map((i) => i.timeOfDay)).toEqual([
      "morning",
      "afternoon",
      "evening",
      "flexible",
    ]);
  });

  it("keeps check-in below anything else that afternoon", () => {
    const sorted = [
      item({ id: 9, timeOfDay: "afternoon", exactTime: "14:00", systemKind: "check_in" }),
      item({ id: 2, timeOfDay: "afternoon" }),
    ].sort(compareItineraryItems);
    expect(sorted.map((i) => i.id)).toEqual([2, 9]);
  });

  it("is stable for two items in the same slot", () => {
    // Without the id tie-break the page would reshuffle between renders.
    const sorted = [item({ id: 7 }), item({ id: 3 })].sort(compareItineraryItems);
    expect(sorted.map((i) => i.id)).toEqual([3, 7]);
  });
});

describe("itinerary item validation", () => {
  const base = { title: "Airport pickup", day: "2026-09-12", timeOfDay: "morning", note: "" };

  it("accepts and normalises a well-formed item", () => {
    const { errors, values } = validateItineraryItem({
      ...base,
      title: "  Airport   pickup  ",
      note: "  Driver meets us at arrivals.  ",
    });
    expect(errors).toEqual({});
    expect(values).toEqual({
      title: "Airport pickup",
      day: "2026-09-12",
      timeOfDay: "morning",
      note: "Driver meets us at arrivals.",
    });
  });

  it("treats a blank note as absent rather than an empty string", () => {
    expect(validateItineraryItem({ ...base, note: "   " }).values!.note).toBeNull();
  });

  it("requires a title that is not just whitespace", () => {
    expect(validateItineraryItem({ ...base, title: "   " }).errors.title).toBeDefined();
  });

  it("bounds the title and the note", () => {
    expect(validateItineraryItem({ ...base, title: "x".repeat(121) }).errors.title).toBeDefined();
    expect(
      validateItineraryItem({ ...base, note: "x".repeat(MAX_ITINERARY_NOTE + 1) }).errors.note,
    ).toBeDefined();
    expect(
      validateItineraryItem({ ...base, note: "x".repeat(MAX_ITINERARY_NOTE) }).errors.note,
    ).toBeUndefined();
  });

  it("rejects a missing or malformed day", () => {
    expect(validateItineraryItem({ ...base, day: null }).errors.day).toBeDefined();
    expect(validateItineraryItem({ ...base, day: "12/09/2026" }).errors.day).toBeDefined();
    expect(validateItineraryItem({ ...base, day: "2026-02-31" }).errors.day).toBeDefined();
  });

  it("rejects a time of day outside the vocabulary", () => {
    expect(validateItineraryItem({ ...base, timeOfDay: "08:00" }).errors.timeOfDay).toBeDefined();
    expect(validateItineraryItem({ ...base, timeOfDay: "" }).errors.timeOfDay).toBeDefined();
  });
});

describe("rescheduling and trip notes", () => {
  it("accepts a legitimate reschedule", () => {
    expect(validateReschedule("2026-09-14", "evening").values).toEqual({
      day: "2026-09-14",
      timeOfDay: "evening",
    });
  });

  it("rejects a reschedule with a bad day or slot", () => {
    expect(validateReschedule("nope", "evening").errors.day).toBeDefined();
    expect(validateReschedule("2026-09-14", "midnight").errors.timeOfDay).toBeDefined();
  });

  it("bounds the trip note and treats blank as absent", () => {
    expect(validateTripNote("   ").value).toBeNull();
    expect(validateTripNote("Driver at 8am").value).toBe("Driver at 8am");
    expect(validateTripNote("x".repeat(MAX_TRIP_NOTE + 1)).errors.tripNote).toBeDefined();
  });
});
