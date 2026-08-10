"use server";

import { redirect } from "next/navigation";
import { createBookingRequest } from "@/lib/booking-query";
import {
  type BookingActionState,
  MAX_BOOKING_EXPERIENCES,
} from "@/lib/booking-rules";

/**
 * The booking submission boundary.
 *
 * The only thing crossing from the browser is this FormData. Everything in it
 * is treated as a *claim*: slugs, dates and a guest count are re-resolved and
 * re-validated against Postgres by `createBookingRequest`, and every money
 * value is recomputed there from catalogue prices.
 *
 * Note what this handler does **not** read: there is no total, no subtotal and
 * no nightly rate in the form. The client displays an estimate, but it has no
 * field in which to assert one, so there is nothing to tamper with.
 */

/*
  This module exports exactly one thing: an async function.

  A `"use server"` file may export nothing else — a constant, an object, even a
  plain value makes Next.js reject the module at request time with "A 'use
  server' file can only export async functions". Neither `tsc` nor `next build`
  catches it, so `BookingActionState` and its initial value live in
  `booking-rules.ts` instead.
*/

function text(form: FormData, key: string): string {
  const value = form.get(key);
  return typeof value === "string" ? value : "";
}

export async function submitBookingRequest(
  _previous: BookingActionState,
  form: FormData,
): Promise<BookingActionState> {
  const guestsRaw = text(form, "guests");
  const guests = /^\d{1,3}$/.test(guestsRaw) ? Number(guestsRaw) : null;

  const experienceSlugs = form
    .getAll("experiences")
    .filter((value): value is string => typeof value === "string")
    .slice(0, MAX_BOOKING_EXPERIENCES);

  const result = await createBookingRequest({
    staySlug: text(form, "staySlug"),
    optionSlug: text(form, "optionSlug"),
    checkIn: text(form, "checkIn") || null,
    checkOut: text(form, "checkOut") || null,
    guests,
    experienceSlugs,
    requestToken: text(form, "requestToken"),
    traveller: {
      fullName: text(form, "fullName"),
      email: text(form, "email"),
      phoneCode: text(form, "phoneCode"),
      phoneNumber: text(form, "phoneNumber"),
      country: text(form, "country"),
      specialRequests: text(form, "specialRequests"),
    },
  });

  switch (result.status) {
    case "created":
    case "duplicate":
      // A replay lands on the same confirmation page as the original. From the
      // traveller's side a double submit is indistinguishable from one submit,
      // which is the whole point of the request token.
      break;
    case "invalid":
      return { status: "invalid", errors: result.errors, formError: result.formError };
    case "unavailable":
      return { status: "unavailable", errors: {}, formError: result.formError };
    case "error":
      return { status: "error", errors: {}, formError: result.formError };
  }

  // Outside the switch and outside any try/catch: `redirect` works by throwing,
  // so catching it here would swallow the navigation.
  redirect(`/booking/${result.reference}`);
}
