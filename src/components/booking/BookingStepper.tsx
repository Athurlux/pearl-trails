"use client";

export const BOOKING_STEPS = [
  "Your stay",
  "Dates & guests",
  "Experiences",
  "Your details",
  "Review",
] as const;

interface Props {
  current: number;
  /** How far the traveller has legitimately reached; later steps stay locked. */
  furthest: number;
  onSelect: (step: number) => void;
}

/**
 * Progress through the booking.
 *
 * An ordered list, because that is what it is — screen readers announce
 * "step 2 of 5" from the real structure rather than from a decorative row of
 * divs. Completed steps are buttons; steps ahead are not reachable by click or
 * by keyboard, so the control cannot be used to skip validation.
 */
export function BookingStepper({ current, furthest, onSelect }: Props) {
  return (
    <nav aria-label="Booking progress">
      <ol className="flex flex-wrap items-center gap-x-1 gap-y-2">
        {BOOKING_STEPS.map((label, index) => {
          const isCurrent = index === current;
          const reachable = index <= furthest;
          const isDone = index < current;

          return (
            <li key={label} className="flex items-center">
              <button
                type="button"
                onClick={() => reachable && onSelect(index)}
                disabled={!reachable}
                aria-current={isCurrent ? "step" : undefined}
                className={[
                  // min-h-11 is 44px: these are real navigation controls back to
                  // completed steps, and on a phone they have to be tappable
                  // without hitting a neighbour. The padding grows, not the type.
                  "flex min-h-11 items-center gap-2 rounded-sm px-2 py-1.5 text-[0.8rem] transition-colors",
                  isCurrent ? "text-forest" : "",
                  !isCurrent && reachable
                    ? "text-muted hover:text-forest cursor-pointer"
                    : "",
                  !reachable ? "cursor-default text-muted/50" : "",
                ].join(" ")}
              >
                <span
                  aria-hidden="true"
                  className={[
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[0.7rem] tabular-nums transition-colors",
                    isCurrent
                      ? "border-forest bg-forest text-ivory"
                      : isDone
                        ? "border-gold bg-gold/15 text-forest"
                        : "border-line text-muted/70",
                  ].join(" ")}
                >
                  {isDone ? "✓" : index + 1}
                </span>
                <span className={isCurrent ? "font-medium" : ""}>{label}</span>
                {/* Announced only to assistive tech, which has no colour cue. */}
                {isDone ? <span className="sr-only">(completed)</span> : null}
              </button>

              {index < BOOKING_STEPS.length - 1 ? (
                <span
                  aria-hidden="true"
                  className="mx-0.5 hidden h-px w-4 bg-line sm:block"
                />
              ) : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
