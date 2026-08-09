import Image from "next/image";
import { ExploreSearch } from "./ExploreSearch";
import type { StaysParams } from "@/lib/stays-params";

interface Props {
  params: StaysParams;
  destinations: { slug: string; name: string }[];
  destinationName: string | null;
}

function formatDate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

/**
 * Deliberately a third the height of the landing-page hero. This is a working
 * page; the photograph sets the tone and then gets out of the way.
 */
export function ExploreHero({ params, destinations, destinationName }: Props) {
  const summary: string[] = [];
  if (destinationName) summary.push(destinationName);
  if (params.checkIn && params.checkOut) {
    summary.push(`${formatDate(params.checkIn)} — ${formatDate(params.checkOut)}`);
  } else if (params.checkIn) {
    summary.push(`From ${formatDate(params.checkIn)}`);
  }
  if (params.guests) {
    summary.push(`${params.guests} ${params.guests === 1 ? "guest" : "guests"}`);
  }

  return (
    <section className="relative isolate overflow-hidden bg-forest-deep pt-24 lg:pt-28">
      <Image
        src="/img/hero-uganda.jpg"
        alt=""
        aria-hidden="true"
        fill
        priority
        sizes="100vw"
        className="object-cover object-center"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-r from-forest-deep/92 via-forest-deep/75 to-forest-deep/55"
      />

      <div className="relative mx-auto max-w-[1400px] px-5 pb-10 pt-10 sm:px-8 lg:px-12 lg:pb-12 lg:pt-14">
        <p className="eyebrow text-sand">Explore stays</p>
        <h1 className="mt-3 text-[clamp(2rem,4.4vw,3.4rem)] leading-[1.04] text-ivory">
          Find your place in Uganda.
        </h1>
        <p className="mt-4 max-w-xl text-[1rem] leading-relaxed text-ivory/80">
          Lodges, campsites, cabins and lakeside retreats across eight destinations —
          filtered down to the ones you would actually book.
        </p>

        {summary.length > 0 ? (
          <p className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.9rem] text-sand">
            {summary.map((part, i) => (
              <span key={part} className="flex items-center gap-3">
                {i > 0 ? (
                  <span aria-hidden="true" className="text-ivory/30">
                    ·
                  </span>
                ) : null}
                {part}
              </span>
            ))}
          </p>
        ) : null}

        {/*
          Dates are carried, displayed and preserved — but Release 2 has no
          availability model, so the page never claims a stay is free on them.
        */}
        {params.checkIn ? (
          <p className="mt-2 text-[0.8rem] text-ivory/50">
            Dates are saved with your search. Live availability arrives in a later
            release.
          </p>
        ) : null}

        <div className="mt-8">
          <ExploreSearch destinations={destinations} />
        </div>
      </div>
    </section>
  );
}
