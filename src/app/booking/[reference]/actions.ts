"use server";

import { redirect } from "next/navigation";
import { parseBookingReference } from "@/lib/booking-rules";
import { reissueTripToken } from "@/lib/trip-query";
import { type TripActionState, tripHref } from "@/lib/trip-rules";

/**
 * "I lost my trip link."
 *
 * The only route to a trip that does not already hold its token. It asks for
 * the email on the booking, which is the second factor: something a person who
 * guessed a reference does not know.
 *
 * The answer is identical for a wrong email and a reference that does not
 * exist, so this cannot be used to discover which references are real or to
 * confirm that a given address booked a given property. That is why there is
 * no "no such booking" branch below — there is deliberately only one failure.
 *
 * Success **rotates** the token: only a hash is stored, so there is nothing to
 * retrieve and a new one is minted. The form says so before it is submitted.
 */
export async function requestTripLink(
  _previous: TripActionState,
  form: FormData,
): Promise<TripActionState> {
  const rawReference = form.get("reference");
  const rawEmail = form.get("email");

  const reference =
    typeof rawReference === "string" ? parseBookingReference(rawReference) : null;
  const email = typeof rawEmail === "string" ? rawEmail : "";

  const token = reference ? await reissueTripToken(reference, email) : null;

  if (!token) {
    return {
      status: "error",
      errors: {},
      formError:
        "That email does not match this booking. Use the address you gave when you requested it.",
    };
  }

  // Outside any try/catch: `redirect` works by throwing.
  redirect(tripHref(token));
}
