"use client";

import { useSyncExternalStore } from "react";
import { StayCard } from "@/components/ui/StayCard";
import { destinations } from "@/data/destinations";
import { stays } from "@/data/stays";
import {
  clearSearch,
  getServerSnapshot,
  getSnapshot,
  subscribe,
} from "@/lib/searchStore";

function destinationName(slug: string) {
  return destinations.find((d) => d.slug === slug)?.name ?? slug;
}

function formatDate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

export function StaysGrid() {
  const query = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const filtered = query.destinationSlug
    ? stays.filter((s) => s.destinationSlug === query.destinationSlug)
    : stays;

  // Release 1 has no availability data, so a destination with no demo property
  // falls back to the full set rather than showing an empty, broken-looking grid.
  const hasResults = filtered.length > 0;
  const visible = hasResults ? filtered : stays;

  const summary: string[] = [];
  if (query.destinationSlug) summary.push(destinationName(query.destinationSlug));
  if (query.checkIn && query.checkOut) {
    summary.push(`${formatDate(query.checkIn)} – ${formatDate(query.checkOut)}`);
  } else if (query.checkIn) {
    summary.push(`from ${formatDate(query.checkIn)}`);
  }
  summary.push(`${query.guests} ${query.guests === 1 ? "guest" : "guests"}`);

  const searched = query.submittedAt !== null;

  return (
    <div>
      {searched ? (
        <div
          // Announced politely so the search control does not feel inert to
          // screen-reader users when the grid changes below the fold.
          role="status"
          aria-live="polite"
          className="mb-8 flex flex-wrap items-center gap-x-4 gap-y-2 border-l-2 border-gold pl-4"
        >
          <p className="text-[0.95rem] text-ink">
            <span className="font-medium">{visible.length}</span>{" "}
            {visible.length === 1 ? "stay" : "stays"} · {summary.join(" · ")}
            {!hasResults ? (
              <span className="text-muted">
                {" "}
                — nothing listed there yet, so here is everything.
              </span>
            ) : null}
          </p>
          <button
            type="button"
            onClick={clearSearch}
            className="text-[0.85rem] text-gold underline underline-offset-4 transition-colors hover:text-forest"
          >
            Clear search
          </button>
        </div>
      ) : null}

      <div className="grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((stay, i) => (
          <StayCard key={stay.slug} stay={stay} index={i} />
        ))}
      </div>
    </div>
  );
}
