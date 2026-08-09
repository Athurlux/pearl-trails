import Link from "next/link";
import { formatUgx } from "@/lib/format";
import { STAY_TYPE_LABELS } from "@/lib/stay-types";
import { hasActiveFilters, staysHref, type StaysParams } from "@/lib/stays-params";

interface Chip {
  key: string;
  label: string;
  /** The params this chip removes when dismissed. */
  clear: Partial<StaysParams>;
}

/**
 * Chips for what is currently narrowing the results — and nothing else. Sort
 * and page are navigation, not filters, so they never appear here.
 *
 * Each chip is a Link, so removing a filter works without JavaScript and can be
 * opened in a new tab like any other URL.
 */
export function ActiveFilters({
  params,
  destinationName,
}: {
  params: StaysParams;
  destinationName: string | null;
}) {
  if (!hasActiveFilters(params)) return null;

  const chips: Chip[] = [];

  if (params.q) {
    chips.push({ key: "q", label: `“${params.q}”`, clear: { q: null } });
  }
  if (params.destination && destinationName) {
    chips.push({
      key: "destination",
      label: destinationName,
      clear: { destination: null },
    });
  }
  for (const type of params.types) {
    chips.push({
      key: `type-${type}`,
      label: STAY_TYPE_LABELS[type],
      clear: { types: params.types.filter((t) => t !== type) },
    });
  }
  if (params.maxPrice != null) {
    chips.push({
      key: "maxPrice",
      label: `Under ${formatUgx(params.maxPrice)}`,
      clear: { maxPrice: null },
    });
  }
  if (params.minPrice != null) {
    chips.push({
      key: "minPrice",
      label: `Over ${formatUgx(params.minPrice)}`,
      clear: { minPrice: null },
    });
  }
  if (params.guests != null) {
    chips.push({
      key: "guests",
      label: `${params.guests} ${params.guests === 1 ? "guest" : "guests"}`,
      clear: { guests: null },
    });
  }
  if (params.minRating != null) {
    chips.push({
      key: "minRating",
      label: `${params.minRating.toFixed(1)}+ rating`,
      clear: { minRating: null },
    });
  }
  for (const slug of params.amenities) {
    chips.push({
      key: `amenity-${slug}`,
      label: amenityLabel(slug),
      clear: { amenities: params.amenities.filter((a) => a !== slug) },
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {chips.map((chip) => (
        <Link
          key={chip.key}
          href={staysHref(params, { ...chip.clear, page: 1 })}
          scroll={false}
          className="group inline-flex items-center gap-1.5 rounded-full border border-line bg-ivory py-1.5 pl-3.5 pr-2.5 text-[0.82rem] text-ink/80 transition-colors hover:border-forest/45"
        >
          {chip.label}
          <span className="sr-only">— remove filter</span>
          <svg
            viewBox="0 0 24 24"
            aria-hidden="true"
            fill="none"
            strokeWidth="2"
            className="h-3.5 w-3.5 stroke-muted transition-colors group-hover:stroke-forest"
          >
            <path d="m6 6 12 12M18 6 6 18" strokeLinecap="round" />
          </svg>
        </Link>
      ))}

      {chips.length > 1 ? (
        <Link
          href={staysHref({ checkIn: params.checkIn, checkOut: params.checkOut })}
          scroll={false}
          className="ml-1 text-[0.82rem] text-gold underline underline-offset-4 transition-colors hover:text-forest"
        >
          Clear all
        </Link>
      ) : null}
    </div>
  );
}

/** Amenity slugs are stable and human-readable; title-casing them avoids a lookup. */
function amenityLabel(slug: string) {
  if (slug === "wifi") return "Wi-Fi";
  const words = slug.split("-");
  return words
    .map((w, i) => (i === 0 ? w.charAt(0).toUpperCase() + w.slice(1) : w))
    .join(" ");
}
