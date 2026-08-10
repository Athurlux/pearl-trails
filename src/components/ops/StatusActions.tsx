"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef, useState } from "react";
import { changeStatusAction } from "@/app/ops/actions";
import { BOOKING_STATUS_LABELS, type BookingStatus } from "@/lib/booking-status";
import { TRANSITION_DESCRIPTIONS } from "@/lib/booking-transitions";
import { initialTripState } from "@/lib/trip-rules";

/**
 * Moving a booking between statuses.
 *
 * Only the legal transitions are offered, and each is a separate button rather
 * than a dropdown of every status — a free-form status picker invites the
 * question "what happens if I choose this", and the answer for most pairs is
 * "the server refuses". Offering only what is possible is a better interface
 * and a smaller surface.
 *
 * The server checks legality again regardless, with the current status in the
 * `WHERE` clause, so two people acting at once cannot both succeed.
 */
export function StatusActions({
  reference,
  current,
  transitions,
}: {
  reference: string;
  current: BookingStatus;
  transitions: BookingStatus[];
}) {
  const [state, action, pending] = useActionState(changeStatusAction, initialTripState);
  const [confirming, setConfirming] = useState<BookingStatus | null>(null);
  const router = useRouter();
  const handled = useRef(false);

  // Re-read the booking once the change lands. Guarded on the transition into
  // `ok`, not the value, or it would refresh on every later render.
  useEffect(() => {
    if (state.status !== "ok") {
      handled.current = false;
      return;
    }
    if (handled.current) return;
    handled.current = true;
    setConfirming(null);
    router.refresh();
  }, [state.status, router]);

  if (transitions.length === 0) {
    return (
      <p className="text-[0.85rem] leading-relaxed text-muted">
        {BOOKING_STATUS_LABELS[current]} is final. Changing it would rewrite what the
        traveller was already told, so it needs a new booking rather than an edit.
      </p>
    );
  }

  return (
    <div>
      <div className="space-y-2">
        {transitions.map((next) => (
          <div key={next}>
            {confirming === next ? (
              <form
                action={action}
                className="rounded-sm border border-forest/25 bg-ivory-warm/50 p-3"
              >
                <input type="hidden" name="reference" value={reference} />
                <input type="hidden" name="status" value={next} />

                <p className="text-[0.83rem] leading-relaxed text-ink">
                  {TRANSITION_DESCRIPTIONS[next]}
                </p>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <button
                    type="submit"
                    disabled={pending}
                    className="min-h-10 rounded-sm bg-forest px-4 py-2 text-[0.83rem] text-ivory transition-colors hover:bg-forest-soft disabled:opacity-55"
                  >
                    {pending ? "Saving…" : `Yes, mark ${BOOKING_STATUS_LABELS[next].toLowerCase()}`}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirming(null)}
                    className="min-h-10 px-2 text-[0.83rem] text-muted transition-colors hover:text-forest"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <button
                type="button"
                onClick={() => setConfirming(next)}
                className="min-h-10 w-full rounded-sm border border-line px-4 py-2 text-left text-[0.86rem] text-forest transition-colors hover:border-forest/45"
              >
                Mark {BOOKING_STATUS_LABELS[next].toLowerCase()}
              </button>
            )}
          </div>
        ))}
      </div>

      {state.formError ? (
        <p
          role="alert"
          className="mt-3 rounded-sm border border-gold/40 bg-sand/15 px-3 py-2.5 text-[0.83rem] leading-relaxed text-ink"
        >
          {state.formError}
        </p>
      ) : null}
    </div>
  );
}
