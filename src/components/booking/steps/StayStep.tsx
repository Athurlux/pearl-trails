"use client";

import Image from "next/image";
import { formatUgx } from "@/lib/format";
import type { BookingOption } from "../types";

interface Props {
  options: BookingOption[];
  selected: string | null;
  guests: number;
  /** False until the traveller has picked both dates. */
  datesChosen: boolean;
  onSelect: (slug: string) => void;
  error?: string;
}

/**
 * Step 1 — which accommodation.
 *
 * A radio group, not a list of buttons: arrow keys move between options and the
 * selection is announced, which is what a set of mutually exclusive choices
 * actually is.
 *
 * Availability is only shown once dates exist. Before that there is nothing to
 * be available *for*, and printing a number would be a claim about nothing.
 */
export function StayStep({
  options,
  selected,
  guests,
  datesChosen,
  onSelect,
  error,
}: Props) {
  return (
    <fieldset>
      <legend className="sr-only">Choose your accommodation</legend>

      {error ? (
        <p
          role="alert"
          className="mb-4 rounded-sm border border-gold/40 bg-sand/15 px-4 py-3 text-[0.85rem] text-ink"
        >
          {error}
        </p>
      ) : null}

      <div className="space-y-3">
        {options.map((option) => {
          const isSelected = option.slug === selected;
          const soldOut = datesChosen && option.available < 1;
          const tooSmall = guests > option.guestCapacity;

          return (
            <label
              key={option.slug}
              className={[
                "flex cursor-pointer gap-4 rounded-sm border p-3 transition-colors sm:p-4",
                isSelected
                  ? "border-forest bg-ivory-warm/50"
                  : "border-line hover:border-forest/40",
                soldOut ? "opacity-60" : "",
              ].join(" ")}
            >
              <input
                type="radio"
                name="accommodation"
                value={option.slug}
                checked={isSelected}
                onChange={() => onSelect(option.slug)}
                className="sr-only"
              />

              <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-sm sm:h-28 sm:w-32">
                <Image
                  src={option.image}
                  alt={option.imageAlt}
                  fill
                  sizes="(max-width: 640px) 80px, 128px"
                  className="object-cover"
                />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <span
                    className={`text-[0.98rem] leading-snug ${isSelected ? "text-forest" : "text-ink"}`}
                  >
                    {option.name}
                  </span>
                  <span
                    aria-hidden="true"
                    className={[
                      "mt-0.5 flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full border transition-colors",
                      isSelected ? "border-forest bg-forest" : "border-line",
                    ].join(" ")}
                  >
                    {isSelected ? (
                      <span className="h-1.5 w-1.5 rounded-full bg-ivory" />
                    ) : null}
                  </span>
                </div>

                <p className="mt-1 line-clamp-2 text-[0.83rem] leading-relaxed text-muted">
                  {option.shortDescription}
                </p>

                <p className="mt-2 text-[0.8rem] text-muted">
                  {option.bedDescription} · sleeps {option.guestCapacity}
                  {option.sizeSqm ? ` · ${option.sizeSqm} m²` : ""}
                </p>

                <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span className="text-[0.92rem] tabular-nums text-forest">
                    {formatUgx(option.priceFromUgx)}
                    <span className="text-[0.78rem] text-muted"> / night</span>
                  </span>

                  {tooSmall ? (
                    <span className="text-[0.78rem] text-gold">
                      Sleeps {option.guestCapacity} — too small for {guests}
                    </span>
                  ) : null}

                  {datesChosen && !soldOut && option.available <= 2 ? (
                    <span className="text-[0.78rem] text-gold">
                      {option.available} left for your dates
                    </span>
                  ) : null}

                  {soldOut ? (
                    <span className="text-[0.78rem] text-muted">
                      Not available for your dates
                    </span>
                  ) : null}
                </div>
              </div>
            </label>
          );
        })}
      </div>

      {/*
        Honest about what the number above means. It is a live count from the
        database, but it is a reading, not a hold — nothing is reserved until
        the request is submitted and the server checks again.
      */}
      <p className="mt-4 text-[0.78rem] leading-relaxed text-muted">
        Availability is checked again when you submit. Nothing is held until then.
      </p>
    </fieldset>
  );
}
