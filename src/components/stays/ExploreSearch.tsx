"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useId, useState, useTransition } from "react";
import { parseStaysParams, staysHref } from "@/lib/stays-params";

/**
 * Text search plus destination, sitting on the Explore hero.
 *
 * Submitting writes to the URL rather than to component state, so the result is
 * shareable and the back button steps through previous searches.
 */
export function ExploreSearch({
  destinations,
}: {
  destinations: { slug: string; name: string }[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const id = useId();

  const params = parseStaysParams(Object.fromEntries(searchParams.entries()));
  const urlQuery = params.q ?? "";

  const [query, setQuery] = useState(urlQuery);
  const [syncedTo, setSyncedTo] = useState(urlQuery);

  // Keep the field honest when the URL changes underneath it — a chip removal,
  // a back navigation, "clear all". Adjusted during render rather than in an
  // effect: React re-renders immediately without painting the stale value.
  if (syncedTo !== urlQuery) {
    setSyncedTo(urlQuery);
    setQuery(urlQuery);
  }

  const submit = (patch: { q?: string | null; destination?: string | null }) => {
    startTransition(() => {
      router.push(staysHref(params, { ...patch, page: 1 }), { scroll: false });
    });
  };

  return (
    <form
      role="search"
      aria-label="Search stays"
      onSubmit={(e) => {
        e.preventDefault();
        submit({ q: query.trim() || null });
      }}
      className="flex w-full max-w-3xl flex-col gap-2 rounded-sm border border-white/20 bg-ivory/95 p-2 shadow-[0_20px_60px_-24px_rgba(10,44,36,0.6)] backdrop-blur-md sm:flex-row"
    >
      <div className="flex-1 px-3 py-2">
        <label htmlFor={`${id}-q`} className="eyebrow block text-muted">
          Search
        </label>
        <input
          id={`${id}-q`}
          type="search"
          value={query}
          maxLength={80}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Lodge name, type or keyword"
          className="mt-1 w-full bg-transparent text-[0.95rem] text-ink outline-none placeholder:text-muted/60"
        />
      </div>

      <div className="border-line px-3 py-2 sm:border-l">
        <label htmlFor={`${id}-dest`} className="eyebrow block text-muted">
          Where
        </label>
        <select
          id={`${id}-dest`}
          value={params.destination ?? ""}
          onChange={(e) => submit({ destination: e.target.value || null })}
          className="mt-1 w-full cursor-pointer bg-transparent text-[0.95rem] text-ink outline-none sm:w-44"
        >
          <option value="">Anywhere in Uganda</option>
          {destinations.map((d) => (
            <option key={d.slug} value={d.slug}>
              {d.name}
            </option>
          ))}
        </select>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="rounded-sm bg-forest px-8 py-3.5 text-sm font-medium tracking-wide text-ivory transition-colors hover:bg-forest-soft disabled:opacity-70"
      >
        {pending ? "Searching…" : "Search"}
      </button>
    </form>
  );
}
