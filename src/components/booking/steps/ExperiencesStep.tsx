"use client";

import Image from "next/image";
import { formatUgx } from "@/lib/format";
import type { BookingExperienceOption } from "../types";

interface Props {
  experiences: BookingExperienceOption[];
  selected: string[];
  guests: number;
  onToggle: (slug: string) => void;
  onClear: () => void;
}

/**
 * Step 3 — optional experiences.
 *
 * Checkboxes, because these are independent choices, and genuinely optional:
 * the step can be skipped outright and the flow never blocks on it.
 *
 * No times, no dates, no guides. Release 4 records *interest* — the copy says
 * the timing gets arranged afterwards, because there is no scheduling model
 * behind it and claiming a confirmed slot would be untrue.
 */
export function ExperiencesStep({
  experiences,
  selected,
  guests,
  onToggle,
  onClear,
}: Props) {
  if (experiences.length === 0) {
    return (
      <p className="rounded-sm border border-line bg-ivory-warm/40 px-4 py-5 text-[0.9rem] leading-relaxed text-muted">
        This property has no experiences listed yet. Continue to your details — you can
        always ask about activities in the notes.
      </p>
    );
  }

  return (
    <div>
      <div className="grid gap-3 sm:grid-cols-2">
        {experiences.map((experience) => {
          const isSelected = selected.includes(experience.slug);

          return (
            <label
              key={experience.slug}
              className={[
                "flex cursor-pointer flex-col rounded-sm border transition-colors",
                isSelected
                  ? "border-forest bg-ivory-warm/50"
                  : "border-line hover:border-forest/40",
              ].join(" ")}
            >
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => onToggle(experience.slug)}
                className="sr-only"
              />

              <div className="relative aspect-[16/9] w-full overflow-hidden rounded-t-sm">
                <Image
                  src={experience.image}
                  alt={experience.imageAlt}
                  fill
                  sizes="(max-width: 640px) 100vw, 320px"
                  className="object-cover"
                />
                <span
                  aria-hidden="true"
                  className={[
                    "absolute right-2.5 top-2.5 flex h-6 w-6 items-center justify-center rounded-full border text-[0.7rem] transition-colors",
                    isSelected
                      ? "border-forest bg-forest text-ivory"
                      : "border-ivory/70 bg-ivory/85 text-transparent",
                  ].join(" ")}
                >
                  ✓
                </span>
              </div>

              <div className="flex flex-1 flex-col p-3.5">
                <span className="eyebrow text-gold">{experience.category}</span>
                <span
                  className={`mt-1.5 text-[0.95rem] leading-snug ${isSelected ? "text-forest" : "text-ink"}`}
                >
                  {experience.name}
                </span>
                <p className="mt-1 line-clamp-2 text-[0.82rem] leading-relaxed text-muted">
                  {experience.shortDescription}
                </p>

                <div className="mt-auto flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 pt-2.5">
                  <span className="text-[0.8rem] text-muted">{experience.duration}</span>
                  {experience.priceFromUgx ? (
                    <span className="text-[0.88rem] tabular-nums text-forest">
                      {formatUgx(experience.priceFromUgx)}
                      <span className="text-[0.75rem] text-muted"> / person</span>
                    </span>
                  ) : (
                    <span className="text-[0.8rem] text-muted">Priced on request</span>
                  )}
                </div>
              </div>
            </label>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-[0.8rem] text-muted" aria-live="polite">
          {selected.length === 0
            ? "Nothing selected — this step is optional."
            : `${selected.length} selected, priced for ${guests} ${guests === 1 ? "guest" : "guests"}.`}
        </p>
        {selected.length > 0 ? (
          <button
            type="button"
            onClick={onClear}
            className="text-[0.82rem] text-muted underline underline-offset-4 transition-colors hover:text-forest"
          >
            Clear all
          </button>
        ) : null}
      </div>

      <p className="mt-4 rounded-sm border border-line bg-ivory-warm/40 px-4 py-3 text-[0.8rem] leading-relaxed text-muted">
        Adding an experience registers your interest. Timings, permits and guides are
        arranged with you afterwards — nothing here books a specific slot.
      </p>
    </div>
  );
}
