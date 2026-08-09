"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useId, useMemo, useRef, useState, useTransition } from "react";
import { formatUgx } from "@/lib/format";
import { STAY_TYPES, STAY_TYPE_LABELS, type StayType } from "@/lib/stay-types";
import { MAX_GUESTS, parseStaysParams, staysHref, type StaysParams } from "@/lib/stays-params";

interface Option {
  slug: string;
  name: string;
}

interface Props {
  destinations: Option[];
  amenities: Option[];
  /** Result count for the current URL, shown on the mobile apply button. */
  total: number;
}

const PRICE_STEPS = [200_000, 500_000, 800_000, 1_200_000];
const RATING_STEPS = [4, 4.5];

/**
 * The single source of filter UI for both breakpoints.
 *
 * Filter state lives in the URL, not in React state: that gives shareable
 * searches, working back/forward, and refresh persistence for free. This
 * component only reads the current URL and writes the next one.
 */
export function FilterControls({ destinations, amenities, total }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [sheetOpen, setSheetOpen] = useState(false);

  const params = useMemo(
    () => parseStaysParams(Object.fromEntries(searchParams.entries())),
    [searchParams],
  );

  /** Any filter change resets to page 1 — page 4 of the old result set is meaningless. */
  const apply = (patch: Partial<StaysParams>) => {
    startTransition(() => {
      router.push(staysHref(params, { ...patch, page: 1 }), { scroll: false });
    });
  };

  const toggleType = (type: StayType) =>
    apply({
      types: params.types.includes(type)
        ? params.types.filter((t) => t !== type)
        : [...params.types, type],
    });

  const toggleAmenity = (slug: string) =>
    apply({
      amenities: params.amenities.includes(slug)
        ? params.amenities.filter((a) => a !== slug)
        : [...params.amenities, slug],
    });

  const body = (
    <FilterBody
      params={params}
      destinations={destinations}
      amenities={amenities}
      onApply={apply}
      onToggleType={toggleType}
      onToggleAmenity={toggleAmenity}
    />
  );

  return (
    <>
      {/* Desktop: a quiet rail, not an enterprise sidebar. */}
      <div
        className={[
          "hidden lg:block",
          pending ? "opacity-60 transition-opacity" : "transition-opacity",
        ].join(" ")}
      >
        {body}
      </div>

      {/* Mobile: a button that opens a bottom sheet. */}
      <div className="lg:hidden">
        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          className="flex w-full items-center justify-center gap-2 rounded-sm border border-forest/25 px-5 py-3.5 text-[0.9rem] font-medium tracking-wide text-forest transition-colors hover:border-forest"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 stroke-current" fill="none" strokeWidth="1.6">
            <path d="M3 6h18M7 12h10M11 18h2" strokeLinecap="round" />
          </svg>
          Filters
          <ActiveCount params={params} />
        </button>

        <FilterSheet
          open={sheetOpen}
          onClose={() => setSheetOpen(false)}
          total={total}
          pending={pending}
        >
          {body}
        </FilterSheet>
      </div>
    </>
  );
}

function ActiveCount({ params }: { params: StaysParams }) {
  const n =
    params.types.length +
    params.amenities.length +
    (params.destination ? 1 : 0) +
    (params.maxPrice != null || params.minPrice != null ? 1 : 0) +
    (params.guests != null ? 1 : 0) +
    (params.minRating != null ? 1 : 0);

  if (n === 0) return null;
  return (
    <span className="ml-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-forest px-1.5 text-[0.7rem] tabular-nums text-ivory">
      {n}
    </span>
  );
}

function FilterBody({
  params,
  destinations,
  amenities,
  onApply,
  onToggleType,
  onToggleAmenity,
}: {
  params: StaysParams;
  destinations: Option[];
  amenities: Option[];
  onApply: (patch: Partial<StaysParams>) => void;
  onToggleType: (t: StayType) => void;
  onToggleAmenity: (slug: string) => void;
}) {
  const id = useId();

  return (
    <div className="space-y-8">
      <Group label="Destination">
        <select
          aria-label="Destination"
          value={params.destination ?? ""}
          onChange={(e) => onApply({ destination: e.target.value || null })}
          className="w-full cursor-pointer rounded-sm border border-line bg-ivory px-3 py-2.5 text-[0.92rem] text-ink outline-none transition-colors hover:border-forest/40"
        >
          <option value="">Anywhere in Uganda</option>
          {destinations.map((d) => (
            <option key={d.slug} value={d.slug}>
              {d.name}
            </option>
          ))}
        </select>
      </Group>

      <Group label="Stay type">
        <div className="flex flex-wrap gap-2">
          {STAY_TYPES.map((type) => {
            const on = params.types.includes(type);
            return (
              <button
                key={type}
                type="button"
                onClick={() => onToggleType(type)}
                aria-pressed={on}
                className={[
                  "rounded-full border px-3.5 py-2 text-[0.82rem] transition-colors",
                  on
                    ? "border-forest bg-forest text-ivory"
                    : "border-line bg-ivory text-ink/75 hover:border-forest/40",
                ].join(" ")}
              >
                {STAY_TYPE_LABELS[type]}
              </button>
            );
          })}
        </div>
      </Group>

      <Group label="Price per night">
        <div className="flex flex-wrap gap-2">
          {PRICE_STEPS.map((step) => {
            const on = params.maxPrice === step;
            return (
              <button
                key={step}
                type="button"
                onClick={() => onApply({ maxPrice: on ? null : step })}
                aria-pressed={on}
                className={[
                  "rounded-full border px-3.5 py-2 text-[0.82rem] tabular-nums transition-colors",
                  on
                    ? "border-forest bg-forest text-ivory"
                    : "border-line bg-ivory text-ink/75 hover:border-forest/40",
                ].join(" ")}
              >
                Under {formatUgx(step)}
              </button>
            );
          })}
        </div>
      </Group>

      <Group label="Guests">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => onApply({ guests: Math.max(1, (params.guests ?? 2) - 1) })}
            disabled={(params.guests ?? 0) <= 1}
            aria-label="Decrease guests"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-line text-forest transition-colors hover:border-forest disabled:opacity-35"
          >
            <span aria-hidden="true">&minus;</span>
          </button>
          <output
            aria-label="Minimum guests"
            className="min-w-16 text-center text-[0.92rem] tabular-nums text-ink"
          >
            {params.guests ?? "Any"}
          </output>
          <button
            type="button"
            onClick={() =>
              onApply({ guests: Math.min(MAX_GUESTS, (params.guests ?? 0) + 1) })
            }
            disabled={(params.guests ?? 0) >= MAX_GUESTS}
            aria-label="Increase guests"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-line text-forest transition-colors hover:border-forest disabled:opacity-35"
          >
            <span aria-hidden="true">+</span>
          </button>
          {params.guests != null ? (
            <button
              type="button"
              onClick={() => onApply({ guests: null })}
              className="ml-1 text-[0.8rem] text-gold underline underline-offset-4 hover:text-forest"
            >
              Any
            </button>
          ) : null}
        </div>
      </Group>

      <Group label="Rating">
        <div className="flex flex-wrap gap-2">
          {RATING_STEPS.map((r) => {
            const on = params.minRating === r;
            return (
              <button
                key={r}
                type="button"
                onClick={() => onApply({ minRating: on ? null : r })}
                aria-pressed={on}
                className={[
                  "rounded-full border px-3.5 py-2 text-[0.82rem] tabular-nums transition-colors",
                  on
                    ? "border-forest bg-forest text-ivory"
                    : "border-line bg-ivory text-ink/75 hover:border-forest/40",
                ].join(" ")}
              >
                {r.toFixed(1)}+
              </button>
            );
          })}
        </div>
      </Group>

      <Group label="Amenities">
        <ul className="space-y-2.5">
          {amenities.map((a) => {
            const inputId = `${id}-am-${a.slug}`;
            const on = params.amenities.includes(a.slug);
            return (
              <li key={a.slug}>
                <label
                  htmlFor={inputId}
                  className="flex cursor-pointer items-center gap-3 text-[0.9rem] text-ink/80"
                >
                  <input
                    id={inputId}
                    type="checkbox"
                    checked={on}
                    onChange={() => onToggleAmenity(a.slug)}
                    className="h-4 w-4 accent-forest"
                  />
                  {a.name}
                </label>
              </li>
            );
          })}
        </ul>
      </Group>
    </div>
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <fieldset>
      <legend className="eyebrow mb-3 text-muted">{label}</legend>
      {children}
    </fieldset>
  );
}

function FilterSheet({
  open,
  onClose,
  total,
  pending,
  children,
}: {
  open: boolean;
  onClose: () => void;
  total: number;
  pending: boolean;
  children: React.ReactNode;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    // Move focus into the sheet so keyboard users are not left behind the page.
    panelRef.current?.focus();
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] lg:hidden">
      <button
        type="button"
        aria-label="Close filters"
        onClick={onClose}
        className="absolute inset-0 h-full w-full cursor-default bg-forest-deep/50 backdrop-blur-[2px]"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Filter stays"
        tabIndex={-1}
        className="absolute inset-x-0 bottom-0 flex max-h-[88svh] flex-col rounded-t-lg bg-ivory outline-none"
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="text-[1.15rem] text-forest">Filters</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close filters"
            className="flex h-10 w-10 items-center justify-center rounded-full text-forest hover:bg-ivory-warm"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 stroke-current" fill="none" strokeWidth="1.6">
              <path d="m6 6 12 12M18 6 6 18" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-6">{children}</div>

        <div className="border-t border-line px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-sm bg-forest px-6 py-3.5 text-sm font-medium tracking-wide text-ivory transition-colors hover:bg-forest-soft"
          >
            {pending ? "Updating…" : `Show ${total} ${total === 1 ? "stay" : "stays"}`}
          </button>
        </div>
      </div>
    </div>
  );
}
