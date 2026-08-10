"use server";

import { redirect } from "next/navigation";
import { requireStaff, signIn, signOut } from "@/lib/staff-auth";
import { isBookingStatus } from "@/lib/booking-transitions";
import {
  addBookingNote,
  changeBookingStatus,
  recordAudit,
  setStayVisibility,
  updateAccommodation,
} from "@/lib/ops-query";
import { MAX_STAFF_NOTE, STAY_VISIBILITIES, type StayVisibility } from "@/lib/staff-vocab";
import type { TripActionState } from "@/lib/trip-rules";

/**
 * Operations mutation boundary.
 *
 * **Every export here begins with `requireStaff()`** — except sign-in, which is
 * the thing that creates a session. That is the whole authorisation model: not
 * a middleware pattern, not a rendered condition, a call at the top of the
 * function that redirects instead of returning.
 *
 * Server Actions are origin-checked by Next.js, and the session cookie is
 * `SameSite=Lax`, so a cross-site post cannot drive any of this. See
 * `docs/decisions/006-staff-authentication.md`.
 *
 * As elsewhere, a `"use server"` module may export only async functions, so the
 * shared `TripActionState` shape is imported rather than declared here.
 */

function text(form: FormData, key: string): string {
  const value = form.get(key);
  return typeof value === "string" ? value : "";
}

function positiveInt(form: FormData, key: string): number | null {
  const raw = text(form, key);
  return /^\d{1,9}$/.test(raw) ? Number(raw) : null;
}

// ---------------------------------------------------------------------------
// Session
// ---------------------------------------------------------------------------

export async function signInAction(
  _previous: TripActionState,
  form: FormData,
): Promise<TripActionState> {
  const result = await signIn(text(form, "email"), text(form, "password"));

  if (result.status === "throttled") {
    return {
      status: "error",
      errors: {},
      formError:
        "Too many failed attempts for that address. Wait fifteen minutes and try again.",
    };
  }

  if (result.status === "rejected") {
    // One message for an unknown address, a wrong password and a deactivated
    // account alike — sign-in is not a way to discover who works here.
    return {
      status: "error",
      errors: {},
      formError: "That email and password do not match an active account.",
    };
  }

  await recordAudit(result.staff, {
    action: "staff.signed_in",
    targetType: "staff",
    targetRef: result.staff.email,
    summary: "Signed in to operations",
  });

  redirect("/ops");
}

export async function signOutAction(): Promise<void> {
  const staff = await requireStaff();
  await recordAudit(staff, {
    action: "staff.signed_out",
    targetType: "staff",
    targetRef: staff.email,
    summary: "Signed out of operations",
  });
  await signOut();
  redirect("/ops/sign-in");
}

// ---------------------------------------------------------------------------
// Bookings
// ---------------------------------------------------------------------------

export async function changeStatusAction(
  _previous: TripActionState,
  form: FormData,
): Promise<TripActionState> {
  const staff = await requireStaff();

  const reference = text(form, "reference");
  const to = text(form, "status");

  if (!isBookingStatus(to)) {
    return { status: "error", errors: {}, formError: "That is not a booking status." };
  }

  const result = await changeBookingStatus(staff, reference, to);

  switch (result.status) {
    case "ok":
      return { status: "ok", errors: {} };
    case "not-found":
      return { status: "error", errors: {}, formError: "That booking no longer exists." };
    case "illegal-transition":
      // Usually means somebody else acted on it first, which is worth saying
      // plainly rather than reporting as a validation failure.
      return {
        status: "error",
        errors: {},
        formError: `This booking is now ${result.from}, and cannot be moved to ${to}. Reload to see the current state.`,
      };
  }
}

export async function addNoteAction(
  _previous: TripActionState,
  form: FormData,
): Promise<TripActionState> {
  const staff = await requireStaff();

  const reference = text(form, "reference");
  const body = text(form, "body").trim();

  if (!body) {
    return { status: "error", errors: { body: "Write something first." } };
  }
  if (body.length > MAX_STAFF_NOTE) {
    return {
      status: "error",
      errors: { body: `Keep notes under ${MAX_STAFF_NOTE} characters.` },
    };
  }

  const result = await addBookingNote(staff, reference, body);
  return result.status === "ok"
    ? { status: "ok", errors: {} }
    : { status: "error", errors: {}, formError: "That booking no longer exists." };
}

// ---------------------------------------------------------------------------
// Catalogue — admin only
// ---------------------------------------------------------------------------

export async function setVisibilityAction(
  _previous: TripActionState,
  form: FormData,
): Promise<TripActionState> {
  // Catalogue changes affect what the public sees, so they need the higher role.
  const staff = await requireStaff("admin");

  const slug = text(form, "slug");
  const visibility = text(form, "visibility") as StayVisibility;

  if (!STAY_VISIBILITIES.includes(visibility)) {
    return { status: "error", errors: {}, formError: "That is not a visibility." };
  }

  const result = await setStayVisibility(staff, slug, visibility);
  return result.status === "ok"
    ? { status: "ok", errors: {} }
    : { status: "error", errors: {}, formError: "That property no longer exists." };
}

export async function updateAccommodationAction(
  _previous: TripActionState,
  form: FormData,
): Promise<TripActionState> {
  const staff = await requireStaff("admin");

  const staySlug = text(form, "staySlug");
  const optionId = positiveInt(form, "optionId");
  const price = positiveInt(form, "priceFromUgx");
  const inventory = positiveInt(form, "inventoryCount");

  const errors: Record<string, string> = {};
  if (optionId === null) errors.optionId = "Unknown accommodation.";
  if (price === null || price < 1) errors.priceFromUgx = "Enter a nightly rate in UGX.";
  // Zero would violate `accommodation_options_inventory_positive`. Catching it
  // here turns a database error into a sentence someone can act on.
  if (inventory === null || inventory < 1) {
    errors.inventoryCount = "There must be at least one unit. Unpublish instead.";
  }
  if (inventory !== null && inventory > 500) {
    errors.inventoryCount = "That is more units than this product models.";
  }

  if (Object.keys(errors).length > 0) return { status: "error", errors };

  const result = await updateAccommodation(staff, staySlug, optionId!, {
    priceFromUgx: price!,
    inventoryCount: inventory!,
  });

  return result.status === "ok"
    ? { status: "ok", errors: {} }
    : {
        status: "error",
        errors: {},
        formError: "That accommodation does not belong to this property.",
      };
}
