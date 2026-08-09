import Image from "next/image";
import Link from "next/link";
import { formatUgx } from "@/lib/format";
import { STAY_TYPE_LABELS } from "@/lib/stays-params";
import type { StayResult } from "@/lib/stays-query";
import { SaveButton } from "./SaveButton";

/**
 * Server Component. Only the save toggle is interactive, so only the save
 * toggle ships JavaScript — the card itself, including the whole grid of them,
 * is rendered on the server.
 */
export function StayResultCard({ stay, index }: { stay: StayResult; index: number }) {
  // Three amenities is a hint, not a specification sheet.
  const preview = stay.amenities.slice(0, 3);

  return (
    <article className="group relative flex flex-col">
      <div className="relative aspect-[4/3] overflow-hidden rounded-sm bg-ivory-warm">
        <Image
          src={stay.image}
          alt={stay.imageAlt}
          fill
          loading={index < 3 ? "eager" : "lazy"}
          sizes="(max-width: 640px) 92vw, (max-width: 1024px) 46vw, 30vw"
          className="object-cover transition-transform duration-[1200ms] ease-out group-hover:scale-[1.04]"
        />
        <span className="absolute bottom-3 left-3 rounded-sm bg-forest-deep/75 px-2.5 py-1 text-[0.7rem] tracking-wide text-ivory backdrop-blur-sm">
          {STAY_TYPE_LABELS[stay.stayType]}
        </span>
      </div>

      {/*
        Deliberately a sibling of the image, not a child of it: the card-wide
        link overlay below is painted above the image, so the save button has to
        sit in the card stacking context with a higher z-index to stay clickable.
      */}
      <SaveButton slug={stay.slug} name={stay.name} />

      <div className="mt-4 flex flex-1 flex-col">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="text-[1.15rem] leading-snug text-forest">
            {/*
              The whole card is a link target via the overlay below, but the
              anchor lives on the heading so the accessible name is the stay.
            */}
            <Link href={`/stays/${stay.slug}`} className="after:absolute after:inset-0">
              {stay.name}
            </Link>
          </h3>
          <span className="flex shrink-0 items-center gap-1 text-[0.85rem] text-ink/70">
            <svg viewBox="0 0 24 24" aria-hidden="true" className="h-3.5 w-3.5 fill-gold">
              <path d="m12 2.6 2.9 5.9 6.5.9-4.7 4.6 1.1 6.4-5.8-3-5.8 3 1.1-6.4L2.6 9.4l6.5-.9z" />
            </svg>
            <span className="tabular-nums">{stay.rating.toFixed(1)}</span>
            <span className="sr-only">out of 5,</span>
            <span className="text-ink/45">({stay.reviewCount})</span>
          </span>
        </div>

        <p className="mt-1 text-[0.9rem] text-muted">{stay.destinationName}</p>

        <p className="mt-3 text-[0.9rem] leading-snug text-ink/75">
          {stay.shortDescription}
        </p>

        {preview.length > 0 ? (
          <p className="mt-3 text-[0.82rem] text-muted">{preview.join(" · ")}</p>
        ) : null}

        <p className="mt-4 border-t border-line pt-4 text-[0.9rem] text-ink">
          <span className="text-muted">From </span>
          <span className="font-medium tabular-nums">{formatUgx(stay.priceFromUgx)}</span>
          <span className="text-muted"> / night</span>
        </p>
      </div>
    </article>
  );
}
