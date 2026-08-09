"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useId, useMemo } from "react";
import { formatUgx } from "@/lib/format";
import {
  MAX_TRIP_GUESTS,
  buildTripQuery,
  estimateStay,
  parseTripContext,
  type TripContext,
} from "@/lib/trip-params";

export interface PlannerOption {
  slug: string;
  name: string;
  guestCapacity: number;
  priceFromUgx: number;
  bedDescription: string;
}

interface Props {
  staySlug: string;
  fromPriceUgx: number;
  maxGuests: number;
  options: PlannerOption[];
  /** Rendered as a bottom bar on mobile instead of a sidebar card. */
  variant?: "card" | "bar";
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * The planning card.
 *
 * Trip state lives in the URL so it survives refresh, back navigation and the
 * hand-off into booking. There is no availability model in this release, so
 * this deliberately says "estimated" and never "available".
 */
export function TripPlanner({
  staySlug,
  fromPriceUgx,
  maxGuests,
  options,
  variant = "card",
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const id = useId();

  const trip = useMemo(
    () => parseTripContext(Object.fromEntries(searchParams.entries())),
    [searchParams],
  );

  const selected = options.find((o) => o.slug === trip.option) ?? null;
  const nightly = selected?.priceFromUgx ?? fromPriceUgx;
  const estimate = estimateStay(nightly, trip.checkIn, trip.checkOut);

  const capacity = selected?.guestCapacity ?? maxGuests;
  const overCapacity = trip.guests !== null && trip.guests > capacity;

  const update = (patch: Partial<TripContext>) => {
    const next = { ...trip, ...patch };
    // Replace rather than push: adjusting a date should not bury the property
    // page under a dozen history entries.
    router.replace(`${pathname}${buildTripQuery(next)}`, { scroll: false });
  };

  const bookHref = `/book/${staySlug}${buildTripQuery(trip)}`;

  if (variant === "bar") {
    return (
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-ivory/97 px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-md lg:hidden">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[0.95rem] tabular-nums text-forest">
              {estimate.complete ? (
                <>
                  <span className="font-medium">{formatUgx(estimate.subtotalUgx)}</span>
                  <span className="text-[0.8rem] text-muted">
                    {" "}
                    est · {estimate.nights}{" "}
                    {estimate.nights === 1 ? "night" : "nights"}
                  </span>
                </>
              ) : (
                <>
                  <span className="text-[0.8rem] text-muted">From </span>
                  <span className="font-medium">{formatUgx(nightly)}</span>
                  <span className="text-[0.8rem] text-muted"> / night</span>
                </>
              )}
            </p>
            <p className="truncate text-[0.78rem] text-muted">
              {selected ? selected.name : "Choose your accommodation"}
            </p>
          </div>
          <Link
            href={bookHref}
            className="shrink-0 rounded-sm bg-forest px-6 py-3 text-sm font-medium tracking-wide text-ivory transition-colors hover:bg-forest-soft"
          >
            Continue
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-sm border border-line bg-ivory p-6 shadow-[0_18px_50px_-30px_rgba(10,44,36,0.45)]">
      <p className="text-[1.05rem] text-forest">
        <span className="text-muted">From </span>
        <span className="font-medium tabular-nums">{formatUgx(nightly)}</span>
        <span className="text-[0.85rem] text-muted"> / night</span>
      </p>

      <div className="mt-5 grid grid-cols-2 gap-px overflow-hidden rounded-sm bg-line/60">
        <div className="bg-ivory px-3.5 py-3">
          <label htmlFor={`${id}-in`} className="eyebrow block text-muted">
            Check in
          </label>
          <input
            id={`${id}-in`}
            type="date"
            min={todayIso()}
            value={trip.checkIn ?? ""}
            onChange={(e) => {
              const checkIn = e.target.value || null;
              const clearOut =
                checkIn && trip.checkOut && trip.checkOut <= checkIn ? null : trip.checkOut;
              update({ checkIn, checkOut: checkIn ? clearOut : null });
            }}
            className="mt-1 w-full bg-transparent text-[0.92rem] text-ink outline-none"
          />
        </div>
        <div className="bg-ivory px-3.5 py-3">
          <label htmlFor={`${id}-out`} className="eyebrow block text-muted">
            Check out
          </label>
          <input
            id={`${id}-out`}
            type="date"
            min={trip.checkIn ?? todayIso()}
            value={trip.checkOut ?? ""}
            onChange={(e) => update({ checkOut: e.target.value || null })}
            className="mt-1 w-full bg-transparent text-[0.92rem] text-ink outline-none"
          />
        </div>
      </div>

      <div className="mt-3 rounded-sm border border-line px-3.5 py-3">
        <span id={`${id}-guests`} className="eyebrow block text-muted">
          Guests
        </span>
        <div className="mt-1.5 flex items-center justify-between">
          <button
            type="button"
            onClick={() => update({ guests: Math.max(1, (trip.guests ?? 2) - 1) })}
            disabled={(trip.guests ?? 0) <= 1}
            aria-label="Decrease guests"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-line text-forest transition-colors hover:border-forest disabled:opacity-35"
          >
            <span aria-hidden="true">&minus;</span>
          </button>
          <output
            aria-labelledby={`${id}-guests`}
            className="text-[0.95rem] tabular-nums text-ink"
          >
            {trip.guests ?? 2}
          </output>
          <button
            type="button"
            onClick={() =>
              update({ guests: Math.min(MAX_TRIP_GUESTS, (trip.guests ?? 2) + 1) })
            }
            disabled={(trip.guests ?? 2) >= MAX_TRIP_GUESTS}
            aria-label="Increase guests"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-line text-forest transition-colors hover:border-forest disabled:opacity-35"
          >
            <span aria-hidden="true">+</span>
          </button>
        </div>
      </div>

      {options.length > 0 ? (
        <div className="mt-3">
          <label htmlFor={`${id}-option`} className="eyebrow block text-muted">
            Accommodation
          </label>
          <select
            id={`${id}-option`}
            value={trip.option ?? ""}
            onChange={(e) => update({ option: e.target.value || null })}
            className="mt-1.5 w-full cursor-pointer rounded-sm border border-line bg-ivory px-3 py-2.5 text-[0.92rem] text-ink outline-none transition-colors hover:border-forest/40"
          >
            <option value="">Choose later</option>
            {options.map((o) => (
              <option key={o.slug} value={o.slug}>
                {o.name} · up to {o.guestCapacity}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      {overCapacity ? (
        <p
          role="status"
          className="mt-3 rounded-sm border border-gold/40 bg-sand/15 px-3 py-2.5 text-[0.82rem] leading-relaxed text-ink/80"
        >
          {selected ? selected.name : "This property"} sleeps up to {capacity}. Choose a
          larger option or reduce the party to continue.
        </p>
      ) : null}

      {estimate.complete ? (
        <dl className="mt-5 space-y-2 border-t border-line pt-5 text-[0.9rem]">
          <div className="flex items-baseline justify-between gap-4">
            <dt className="text-muted">
              {formatUgx(estimate.nightlyUgx)} × {estimate.nights}{" "}
              {estimate.nights === 1 ? "night" : "nights"}
            </dt>
            <dd className="tabular-nums text-ink">{formatUgx(estimate.subtotalUgx)}</dd>
          </div>
          <div className="flex items-baseline justify-between gap-4 border-t border-line pt-2">
            <dt className="text-forest">Estimated stay subtotal</dt>
            <dd className="font-medium tabular-nums text-forest">
              {formatUgx(estimate.subtotalUgx)}
            </dd>
          </div>
        </dl>
      ) : (
        <p className="mt-5 border-t border-line pt-5 text-[0.85rem] leading-relaxed text-muted">
          Add dates to see an estimated stay subtotal.
        </p>
      )}

      <Link
        href={bookHref}
        className="mt-5 block rounded-sm bg-forest px-6 py-3.5 text-center text-sm font-medium tracking-wide text-ivory transition-colors hover:bg-forest-soft"
      >
        Continue to booking
      </Link>

      {/*
        Deliberate, and worth keeping: there is no availability model behind
        this page, so the card must not imply the dates are held.
      */}
      <p className="mt-3 text-center text-[0.75rem] leading-relaxed text-muted">
        Dates are trip planning only. Availability is not checked yet and nothing is
        reserved.
      </p>
    </div>
  );
}
