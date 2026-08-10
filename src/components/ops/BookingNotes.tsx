"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useId, useRef } from "react";
import { addNoteAction } from "@/app/ops/actions";
import { MAX_STAFF_NOTE } from "@/lib/staff-vocab";
import { initialTripState } from "@/lib/trip-rules";

/**
 * Internal notes on a booking.
 *
 * Never shown to the traveller — not on their confirmation page, not on their
 * trip. That is stated on screen, because a note field on a booking could
 * reasonably be read as a message to the guest, and it is not one.
 *
 * Notes are append-only: there is no edit and no delete, which is what makes
 * the list a record of what was known when rather than a document someone can
 * quietly revise.
 */
export function BookingNotes({
  reference,
  notes,
}: {
  reference: string;
  notes: { id: number; authorName: string; body: string; createdAt: Date }[];
}) {
  const [state, action, pending] = useActionState(addNoteAction, initialTripState);
  const router = useRouter();
  const id = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const handled = useRef(false);

  useEffect(() => {
    if (state.status !== "ok") {
      handled.current = false;
      return;
    }
    if (handled.current) return;
    handled.current = true;
    formRef.current?.reset();
    router.refresh();
  }, [state.status, router]);

  return (
    <section className="rounded-sm border border-line p-5">
      <h2 className="text-[1.05rem] text-forest">Internal notes</h2>
      <p className="mt-1 text-[0.82rem] text-muted">
        Only visible here. The traveller never sees these.
      </p>

      <form ref={formRef} action={action} className="mt-4">
        <input type="hidden" name="reference" value={reference} />

        <label htmlFor={id} className="sr-only">
          Add a note
        </label>
        <textarea
          id={id}
          name="body"
          rows={3}
          maxLength={MAX_STAFF_NOTE}
          required
          placeholder="Called the guest — arriving late, lodge informed."
          aria-describedby={state.errors.body ? `${id}-error` : undefined}
          aria-invalid={state.errors.body ? true : undefined}
          className="w-full rounded-sm border border-line bg-ivory px-3 py-2.5 text-[0.88rem] leading-relaxed text-ink outline-none transition-colors focus:border-forest"
        />

        {state.errors.body ? (
          <p id={`${id}-error`} role="alert" className="mt-1.5 text-[0.8rem] text-gold">
            {state.errors.body}
          </p>
        ) : null}

        <div className="mt-2.5 flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={pending}
            className="min-h-10 rounded-sm bg-forest px-4 py-2 text-[0.85rem] text-ivory transition-colors hover:bg-forest-soft disabled:opacity-55"
          >
            {pending ? "Saving…" : "Add note"}
          </button>
          {state.formError ? (
            <p role="alert" className="text-[0.83rem] text-gold">
              {state.formError}
            </p>
          ) : null}
        </div>
      </form>

      {notes.length > 0 ? (
        <ol className="mt-6 space-y-4 border-t border-line pt-4">
          {notes.map((note) => (
            <li key={note.id}>
              <p className="whitespace-pre-line text-[0.88rem] leading-relaxed text-ink">
                {note.body}
              </p>
              <p className="mt-1 text-[0.78rem] text-muted">
                {note.authorName} ·{" "}
                {note.createdAt.toLocaleString("en-GB", { timeZone: "UTC" })} UTC
              </p>
            </li>
          ))}
        </ol>
      ) : null}
    </section>
  );
}
