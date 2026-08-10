"use client";

import { useId } from "react";
import { Field, inputClass } from "../Field";
import type { FieldErrors } from "@/lib/booking-rules";
import { addDays } from "@/lib/booking-rules";
import { MAX_TRIP_GUESTS, nightsBetween } from "@/lib/trip-params";

interface Props {
  checkIn: string | null;
  checkOut: string | null;
  guests: number;
  /** Capacity of the chosen accommodation, or the property maximum. */
  capacity: number;
  today: string;
  errors: FieldErrors;
  onChange: (patch: {
    checkIn?: string | null;
    checkOut?: string | null;
    guests?: number;
  }) => void;
}

/**
 * Step 2 — dates and party size.
 *
 * Native date inputs: they bring the platform's own picker, which on mobile is
 * a far better control than anything hand-rolled, and they are keyboard
 * accessible for free. `min` bounds them, but the real check is server-side —
 * `min` is a hint the browser is free to ignore and a determined caller
 * certainly will.
 */
export function DatesStep({
  checkIn,
  checkOut,
  guests,
  capacity,
  today,
  errors,
  onChange,
}: Props) {
  const id = useId();
  const nights = nightsBetween(checkIn, checkOut);
  const guestsId = `${id}-guests`;

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id={`${id}-in`} label="Check in" error={errors.checkIn}>
          {(aria) => (
            <input
              {...aria}
              type="date"
              min={today}
              value={checkIn ?? ""}
              onChange={(event) => {
                const next = event.target.value || null;
                // A check-out that is no longer after check-in is stale, not
                // merely wrong — clear it rather than leave an invalid pair.
                const staleOut = next && checkOut && checkOut <= next;
                onChange({ checkIn: next, checkOut: staleOut ? null : checkOut });
              }}
              className={inputClass}
            />
          )}
        </Field>

        <Field id={`${id}-out`} label="Check out" error={errors.checkOut}>
          {(aria) => (
            <input
              {...aria}
              type="date"
              min={checkIn ? addDays(checkIn, 1) : addDays(today, 1)}
              value={checkOut ?? ""}
              onChange={(event) => onChange({ checkOut: event.target.value || null })}
              className={inputClass}
            />
          )}
        </Field>
      </div>

      {nights > 0 ? (
        <p className="text-[0.85rem] text-muted" aria-live="polite">
          {nights} {nights === 1 ? "night" : "nights"}
        </p>
      ) : null}

      <div>
        <span id={guestsId} className="block text-[0.85rem] text-forest">
          Guests
        </span>
        <p className="mt-1 text-[0.78rem] leading-relaxed text-muted">
          Everyone staying in this accommodation, including children.
        </p>

        <div
          className={[
            "mt-2 flex items-center justify-between rounded-sm border px-3 py-2.5 sm:max-w-xs",
            errors.guests ? "border-gold" : "border-line",
          ].join(" ")}
        >
          <button
            type="button"
            onClick={() => onChange({ guests: Math.max(1, guests - 1) })}
            disabled={guests <= 1}
            aria-label="Decrease guests"
            className="flex h-11 w-11 items-center justify-center rounded-full border border-line text-forest transition-colors hover:border-forest disabled:opacity-35"
          >
            <span aria-hidden="true">&minus;</span>
          </button>

          <output
            aria-labelledby={guestsId}
            aria-live="polite"
            className="text-[1.05rem] tabular-nums text-ink"
          >
            {guests}
          </output>

          <button
            type="button"
            onClick={() => onChange({ guests: Math.min(MAX_TRIP_GUESTS, guests + 1) })}
            disabled={guests >= MAX_TRIP_GUESTS}
            aria-label="Increase guests"
            className="flex h-11 w-11 items-center justify-center rounded-full border border-line text-forest transition-colors hover:border-forest disabled:opacity-35"
          >
            <span aria-hidden="true">+</span>
          </button>
        </div>

        {errors.guests ? (
          <p role="alert" className="mt-1.5 text-[0.8rem] leading-relaxed text-forest">
            <span aria-hidden="true" className="text-gold">
              ▲{" "}
            </span>
            {errors.guests}
          </p>
        ) : (
          <p className="mt-1.5 text-[0.78rem] text-muted">
            This accommodation sleeps up to {capacity}.
          </p>
        )}
      </div>
    </div>
  );
}
