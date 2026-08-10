"use client";

import { useActionState, useId } from "react";
import { requestTripLink } from "@/app/booking/[reference]/actions";
import { initialTripState } from "@/lib/trip-rules";

/**
 * Recovers a trip link from the booking reference plus the email on it.
 *
 * Small on purpose: one field, and it is the second factor. The warning about
 * retiring an older link is shown *before* submitting rather than after,
 * because that is when it can still change the traveller's mind.
 */
export function TripLinkRequest({ reference }: { reference: string }) {
  const [state, action, pending] = useActionState(requestTripLink, initialTripState);
  const fieldId = useId();

  return (
    <form action={action} className="mt-4 max-w-md">
      <input type="hidden" name="reference" value={reference} />

      <label htmlFor={fieldId} className="block text-[0.85rem] text-ink">
        The email address on this booking
      </label>
      <input
        id={fieldId}
        name="email"
        type="email"
        required
        autoComplete="email"
        placeholder="you@example.com"
        aria-describedby={`${fieldId}-help${state.formError ? ` ${fieldId}-error` : ""}`}
        aria-invalid={state.formError ? true : undefined}
        className="mt-1.5 min-h-11 w-full rounded-sm border border-line bg-ivory px-3.5 py-2.5 text-[0.9rem] text-ink outline-none transition-colors focus:border-forest"
      />

      {state.formError ? (
        <p id={`${fieldId}-error`} role="alert" className="mt-1.5 text-[0.82rem] text-gold">
          {state.formError}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="mt-3 min-h-11 rounded-sm bg-forest px-6 py-3 text-[0.88rem] font-medium tracking-wide text-ivory transition-colors hover:bg-forest-soft disabled:opacity-55"
      >
        {pending ? "Checking…" : "Open my trip"}
      </button>

      <p id={`${fieldId}-help`} className="mt-3 text-[0.79rem] leading-relaxed text-muted">
        This creates a new private link for your trip. If you saved an earlier one, it
        will stop working — we only ever store a fingerprint of the link, never the link
        itself, so there is nothing for us to send you again.
      </p>
    </form>
  );
}
