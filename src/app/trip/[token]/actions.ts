"use server";

import {
  addTravellerItem,
  deleteTravellerItem,
  rescheduleExperienceItem,
  saveTripNote,
  updateTravellerItem,
  type TripMutationResult,
} from "@/lib/trip-query";
import {
  type TripActionState,
  validateItineraryItem,
  validateReschedule,
  validateTripNote,
} from "@/lib/trip-rules";

/**
 * Trip mutation boundary.
 *
 * The token arrives in the form, and it is the *only* thing that identifies
 * which trip is being changed. Nothing here accepts a booking id, and the item
 * ids that do arrive are re-checked against the token's booking inside
 * `trip-query.ts` — posting a stranger's item id changes nothing.
 *
 * As with `book/[slug]/actions.ts`, this module may export only async
 * functions: a `"use server"` file that exports a constant fails at request
 * time, and neither `tsc` nor `next build` catches it. `TripActionState` and
 * the validators live in `trip-rules.ts`.
 *
 * Nothing here calls `revalidatePath`. `/trip/[token]` is rendered dynamically
 * on every request, so there is no cache entry to invalidate — the call looked
 * like it refreshed the page and did nothing, which is why an added item only
 * appeared after a manual reload. The client island calls `router.refresh()`
 * when an action succeeds; that is what actually re-renders the tree.
 */

function text(form: FormData, key: string): string {
  const value = form.get(key);
  return typeof value === "string" ? value : "";
}

function id(form: FormData, key: string): number | null {
  const raw = text(form, key);
  return /^\d{1,9}$/.test(raw) ? Number(raw) : null;
}

/** Turns a persistence outcome into something a traveller can read. */
function explain(result: TripMutationResult): TripActionState {
  switch (result.status) {
    case "ok":
      return { status: "ok", errors: {} };
    case "out-of-range":
      return {
        status: "error",
        errors: { day: "Choose a day between your check-in and check-out." },
      };
    case "too-many":
      return {
        status: "error",
        errors: {},
        formError: "That is as many plans as one trip can hold. Remove one to add another.",
      };
    case "not-yours":
      // Deliberately the same answer as a missing item. Someone probing ids
      // learns nothing about what exists.
      return {
        status: "error",
        errors: {},
        formError: "That part of your trip cannot be changed here.",
      };
    case "not-found":
      return {
        status: "error",
        errors: {},
        formError: "We could not open that trip. Check the link and try again.",
      };
  }
}

export async function addTripItem(
  _previous: TripActionState,
  form: FormData,
): Promise<TripActionState> {
  const token = text(form, "token");

  const { errors, values } = validateItineraryItem({
    title: text(form, "title"),
    day: text(form, "day") || null,
    timeOfDay: text(form, "timeOfDay"),
    note: text(form, "note"),
  });
  if (!values) return { status: "error", errors };

  const result = await addTravellerItem(token, values);
  return explain(result);
}

export async function updateTripItem(
  _previous: TripActionState,
  form: FormData,
): Promise<TripActionState> {
  const token = text(form, "token");
  const itemId = id(form, "itemId");
  if (itemId === null) return explain({ status: "not-yours" });

  const { errors, values } = validateItineraryItem({
    title: text(form, "title"),
    day: text(form, "day") || null,
    timeOfDay: text(form, "timeOfDay"),
    note: text(form, "note"),
  });
  if (!values) return { status: "error", errors };

  const result = await updateTravellerItem(token, itemId, values);
  return explain(result);
}

export async function deleteTripItem(
  _previous: TripActionState,
  form: FormData,
): Promise<TripActionState> {
  const token = text(form, "token");
  const itemId = id(form, "itemId");
  if (itemId === null) return explain({ status: "not-yours" });

  const result = await deleteTravellerItem(token, itemId);
  return explain(result);
}

/**
 * Moves a requested experience. It cannot rename or remove one — those are
 * booking facts, and this action has no path to them.
 */
export async function moveTripExperience(
  _previous: TripActionState,
  form: FormData,
): Promise<TripActionState> {
  const token = text(form, "token");
  const itemId = id(form, "itemId");
  if (itemId === null) return explain({ status: "not-yours" });

  const { errors, values } = validateReschedule(
    text(form, "day") || null,
    text(form, "timeOfDay"),
  );
  if (!values) return { status: "error", errors };

  const result = await rescheduleExperienceItem(token, itemId, values);
  return explain(result);
}

export async function saveNote(
  _previous: TripActionState,
  form: FormData,
): Promise<TripActionState> {
  const token = text(form, "token");
  const { errors, value } = validateTripNote(text(form, "tripNote"));
  if (Object.keys(errors).length > 0) return { status: "error", errors };

  const result = await saveTripNote(token, value);
  return explain(result);
}
