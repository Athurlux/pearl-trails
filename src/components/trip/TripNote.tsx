"use client";

import { useActionState, useId } from "react";
import { saveNote } from "@/app/trip/[token]/actions";
import { MAX_TRIP_NOTE } from "@/lib/itinerary-vocab";
import { initialTripState } from "@/lib/trip-rules";

/**
 * A private note on the trip.
 *
 * Plain text, bounded, rendered as text. There is no rich editor and no HTML —
 * a travel note needs neither, and accepting markup would be accepting an
 * injection surface for nothing.
 *
 * The property never sees this. That is stated on screen rather than assumed,
 * because "notes" on a booking page could reasonably be read as a message to
 * the lodge, and it is not one.
 */
export function TripNote({ token, note }: { token: string; note: string | null }) {
  const [state, action, pending] = useActionState(saveNote, initialTripState);
  const fieldId = useId();

  return (
    <section aria-labelledby={`${fieldId}-heading`}>
      <h2 id={`${fieldId}-heading`} className="text-[1.15rem] text-forest">
        Your notes
      </h2>
      <p className="mt-1.5 text-[0.85rem] text-muted">
        Just for you and whoever has this link. The property does not see it.
      </p>

      <form action={action} className="mt-4">
        <input type="hidden" name="token" value={token} />

        <label htmlFor={fieldId} className="sr-only">
          Trip notes
        </label>
        <textarea
          id={fieldId}
          name="tripNote"
          defaultValue={note ?? ""}
          maxLength={MAX_TRIP_NOTE}
          rows={4}
          placeholder="Driver meeting us at Entebbe at 8am. Remember the binoculars."
          aria-describedby={state.errors.tripNote ? `${fieldId}-error` : undefined}
          aria-invalid={state.errors.tripNote ? true : undefined}
          className="w-full rounded-sm border border-line bg-ivory px-3.5 py-3 text-[0.9rem] leading-relaxed text-ink outline-none transition-colors focus:border-forest"
        />

        {state.errors.tripNote ? (
          <p id={`${fieldId}-error`} role="alert" className="mt-1.5 text-[0.8rem] text-gold">
            {state.errors.tripNote}
          </p>
        ) : null}

        <div className="mt-3 flex flex-wrap items-center gap-4">
          <button
            type="submit"
            disabled={pending}
            className="min-h-11 rounded-sm bg-forest px-5 py-2.5 text-[0.85rem] text-ivory transition-colors hover:bg-forest-soft disabled:opacity-55"
          >
            {pending ? "Saving…" : "Save note"}
          </button>

          {/* `aria-live` so the confirmation is announced, not just painted. */}
          <p aria-live="polite" className="text-[0.82rem] text-muted">
            {state.status === "ok" ? "Saved." : ""}
            {state.formError ?? ""}
          </p>
        </div>
      </form>
    </section>
  );
}
