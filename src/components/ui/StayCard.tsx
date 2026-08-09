"use client";

import Image from "next/image";
import { useState } from "react";
import { formatUgx } from "@/lib/format";
import type { Stay } from "@/data/types";

export function StayCard({ stay, index = 0 }: { stay: Stay; index?: number }) {
  const [saved, setSaved] = useState(false);

  return (
    <article className="group">
      <div className="relative isolate aspect-[4/5] overflow-hidden rounded-sm bg-ivory-warm">
        <Image
          src={stay.image}
          alt={stay.imageAlt}
          fill
          loading={index < 2 ? "eager" : "lazy"}
          sizes="(max-width: 640px) 86vw, (max-width: 1024px) 45vw, 31vw"
          className="object-cover transition-transform duration-[1200ms] ease-out group-hover:scale-[1.05]"
        />

        <button
          type="button"
          onClick={() => setSaved((s) => !s)}
          aria-pressed={saved}
          aria-label={saved ? `Remove ${stay.name} from saved` : `Save ${stay.name}`}
          className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full bg-ivory/90 backdrop-blur-sm transition-all duration-300 hover:bg-ivory"
        >
          <svg
            viewBox="0 0 24 24"
            aria-hidden="true"
            className={[
              "h-[18px] w-[18px] transition-all duration-300",
              saved ? "scale-110 fill-forest stroke-forest" : "fill-none stroke-forest/70",
            ].join(" ")}
            strokeWidth="1.6"
          >
            <path d="M12 20.5S3.8 15.1 3.8 9.6A4.6 4.6 0 0 1 12 6.9a4.6 4.6 0 0 1 8.2 2.7c0 5.5-8.2 10.9-8.2 10.9Z" />
          </svg>
        </button>

        <span className="absolute bottom-3 left-3 rounded-sm bg-forest-deep/75 px-2.5 py-1 text-[0.7rem] tracking-wide text-ivory backdrop-blur-sm">
          {stay.type}
        </span>
      </div>

      <div className="mt-4">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="text-[1.15rem] leading-snug text-forest">{stay.name}</h3>
          <span className="flex shrink-0 items-center gap-1 text-[0.85rem] text-ink/70">
            <svg viewBox="0 0 24 24" aria-hidden="true" className="h-3.5 w-3.5 fill-gold">
              <path d="m12 2.6 2.9 5.9 6.5.9-4.7 4.6 1.1 6.4-5.8-3-5.8 3 1.1-6.4L2.6 9.4l6.5-.9z" />
            </svg>
            <span className="tabular-nums">{stay.rating.toFixed(1)}</span>
            <span className="sr-only">out of 5, {stay.reviews} reviews</span>
          </span>
        </div>
        <p className="mt-1 text-[0.9rem] text-muted">{stay.destinationName}</p>
        <p className="mt-3 text-[0.9rem] text-ink">
          <span className="text-muted">From </span>
          <span className="font-medium tabular-nums">{formatUgx(stay.fromPriceUgx)}</span>
          <span className="text-muted"> / night</span>
        </p>
      </div>
    </article>
  );
}
