"use client";

import { useId, useState } from "react";
import { destinationOptions } from "@/data/destinations";
import { submitSearch } from "@/lib/searchStore";

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function SearchBar() {
  const id = useId();
  const [destination, setDestination] = useState("");
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [guests, setGuests] = useState(2);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    submitSearch({
      destinationSlug: destination || null,
      checkIn: checkIn || null,
      checkOut: checkOut || null,
      guests,
    });
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    document.getElementById("stays")?.scrollIntoView({
      behavior: reduced ? "auto" : "smooth",
      block: "start",
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      // role/aria so screen readers announce this as a search landmark
      role="search"
      aria-label="Search stays in Uganda"
      className="rounded-sm border border-white/25 bg-ivory/95 p-2 shadow-[0_20px_60px_-20px_rgba(10,44,36,0.55)] backdrop-blur-md sm:p-2.5"
    >
      <div className="grid grid-cols-1 gap-px overflow-hidden rounded-sm bg-line/60 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_0.9fr_auto]">
        {/* Destination */}
        <div className="bg-ivory px-4 py-3">
          <label htmlFor={`${id}-dest`} className="eyebrow block text-muted">
            Where
          </label>
          <select
            id={`${id}-dest`}
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            className="mt-1 w-full cursor-pointer bg-transparent text-[0.95rem] text-ink outline-none"
          >
            <option value="">Anywhere in Uganda</option>
            {destinationOptions.map((d) => (
              <option key={d.slug} value={d.slug}>
                {d.name}
              </option>
            ))}
          </select>
        </div>

        {/* Check in */}
        <div className="bg-ivory px-4 py-3">
          <label htmlFor={`${id}-in`} className="eyebrow block text-muted">
            Check in
          </label>
          <input
            id={`${id}-in`}
            type="date"
            min={todayIso()}
            value={checkIn}
            onChange={(e) => {
              setCheckIn(e.target.value);
              if (checkOut && e.target.value && checkOut <= e.target.value) setCheckOut("");
            }}
            className="mt-1 w-full bg-transparent text-[0.95rem] text-ink outline-none"
          />
        </div>

        {/* Check out */}
        <div className="bg-ivory px-4 py-3">
          <label htmlFor={`${id}-out`} className="eyebrow block text-muted">
            Check out
          </label>
          <input
            id={`${id}-out`}
            type="date"
            min={checkIn || todayIso()}
            value={checkOut}
            onChange={(e) => setCheckOut(e.target.value)}
            className="mt-1 w-full bg-transparent text-[0.95rem] text-ink outline-none"
          />
        </div>

        {/* Guests */}
        <div className="bg-ivory px-4 py-3">
          <span className="eyebrow block text-muted" id={`${id}-guests-label`}>
            Guests
          </span>
          <div className="mt-1 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setGuests((g) => Math.max(1, g - 1))}
              disabled={guests <= 1}
              aria-label="Decrease guests"
              className="flex h-7 w-7 items-center justify-center rounded-full border border-line text-forest transition-colors hover:border-forest disabled:opacity-35"
            >
              <span aria-hidden="true">&minus;</span>
            </button>
            <output
              aria-labelledby={`${id}-guests-label`}
              className="text-[0.95rem] tabular-nums text-ink"
            >
              {guests}
            </output>
            <button
              type="button"
              onClick={() => setGuests((g) => Math.min(16, g + 1))}
              disabled={guests >= 16}
              aria-label="Increase guests"
              className="flex h-7 w-7 items-center justify-center rounded-full border border-line text-forest transition-colors hover:border-forest disabled:opacity-35"
            >
              <span aria-hidden="true">+</span>
            </button>
          </div>
        </div>

        {/* Submit */}
        <div className="bg-ivory p-2 sm:col-span-2 lg:col-span-1 lg:p-1.5">
          <button
            type="submit"
            className="h-full w-full rounded-sm bg-forest px-8 py-3.5 text-sm font-medium tracking-wide text-ivory transition-colors hover:bg-forest-soft lg:py-0"
          >
            Search
          </button>
        </div>
      </div>
    </form>
  );
}
