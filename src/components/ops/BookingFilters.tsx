"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useId } from "react";
import { BOOKING_STATUSES, BOOKING_STATUS_LABELS } from "@/lib/booking-status";

/**
 * Filters for the bookings table.
 *
 * A plain `<form method="get">` — no `useState`, no controlled inputs, no
 * debounce. Submitting navigates, the server reads the query string, and the
 * URL is the state. That makes a filtered view shareable and the back button
 * correct, and it means this component holds nothing that could disagree with
 * what is on screen.
 *
 * `page` is dropped on submit: changing a filter and landing on page 4 of a
 * result set that now has one page is a dead end.
 */
export function BookingFilters({ stays }: { stays: { slug: string; name: string }[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const id = useId();

  const current = (key: string) => params.get(key) ?? "";
  const hasFilters = ["status", "stay", "q", "from", "to"].some((key) => params.get(key));

  return (
    <form
      method="get"
      className="rounded-sm border border-line bg-ivory-warm/30 p-4"
      onSubmit={(event) => {
        // Intercepted so the reset below and this share one behaviour, and so
        // empty fields do not litter the URL with `?stay=&from=`.
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        const next = new URLSearchParams();
        for (const [key, value] of data.entries()) {
          if (typeof value === "string" && value.trim()) next.set(key, value.trim());
        }
        router.push(next.size ? `${pathname}?${next}` : pathname);
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <label htmlFor={`${id}-q`} className="block text-[0.8rem] text-muted">
            Search
          </label>
          <input
            id={`${id}-q`}
            name="q"
            type="search"
            defaultValue={current("q")}
            maxLength={120}
            placeholder="Reference, name or email"
            className="mt-1 min-h-10 w-full rounded-sm border border-line bg-ivory px-3 py-2 text-[0.87rem] text-ink outline-none transition-colors focus:border-forest"
          />
        </div>

        <div>
          <label htmlFor={`${id}-status`} className="block text-[0.8rem] text-muted">
            Status
          </label>
          <select
            id={`${id}-status`}
            name="status"
            defaultValue={current("status")}
            className="mt-1 min-h-10 w-full rounded-sm border border-line bg-ivory px-2.5 py-2 text-[0.87rem] text-ink outline-none transition-colors focus:border-forest"
          >
            <option value="">Any</option>
            {BOOKING_STATUSES.map((status) => (
              <option key={status} value={status}>
                {BOOKING_STATUS_LABELS[status]}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor={`${id}-stay`} className="block text-[0.8rem] text-muted">
            Property
          </label>
          <select
            id={`${id}-stay`}
            name="stay"
            defaultValue={current("stay")}
            className="mt-1 min-h-10 w-full rounded-sm border border-line bg-ivory px-2.5 py-2 text-[0.87rem] text-ink outline-none transition-colors focus:border-forest"
          >
            <option value="">Any</option>
            {stays.map((stay) => (
              <option key={stay.slug} value={stay.slug}>
                {stay.name}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label htmlFor={`${id}-from`} className="block text-[0.8rem] text-muted">
              Arriving from
            </label>
            <input
              id={`${id}-from`}
              name="from"
              type="date"
              defaultValue={current("from")}
              className="mt-1 min-h-10 w-full rounded-sm border border-line bg-ivory px-2 py-2 text-[0.84rem] text-ink outline-none transition-colors focus:border-forest"
            />
          </div>
          <div>
            <label htmlFor={`${id}-to`} className="block text-[0.8rem] text-muted">
              to
            </label>
            <input
              id={`${id}-to`}
              name="to"
              type="date"
              defaultValue={current("to")}
              className="mt-1 min-h-10 w-full rounded-sm border border-line bg-ivory px-2 py-2 text-[0.84rem] text-ink outline-none transition-colors focus:border-forest"
            />
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="submit"
          className="min-h-10 rounded-sm bg-forest px-5 py-2 text-[0.85rem] text-ivory transition-colors hover:bg-forest-soft"
        >
          Apply
        </button>
        {hasFilters ? (
          <button
            type="button"
            onClick={() => router.push(pathname)}
            className="min-h-10 px-2 text-[0.85rem] text-muted transition-colors hover:text-forest"
          >
            Clear filters
          </button>
        ) : null}
      </div>
    </form>
  );
}
