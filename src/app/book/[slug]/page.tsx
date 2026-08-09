import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { formatUgx } from "@/lib/format";
import { STAY_TYPE_LABELS } from "@/lib/stay-types";
import { getPropertyDetail } from "@/lib/stays-query";
import {
  estimateStay,
  formatDateRange,
  parseTripContext,
  stayHref,
} from "@/lib/trip-params";

/**
 * Release 3 ships the booking route holding real trip context, not the booking
 * flow itself. The property CTA has somewhere honest to land, and Release 4
 * consumes exactly what is already in this URL.
 */

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export const metadata: Metadata = {
  title: "Continue to booking",
  // Not a page for search engines: it only makes sense with trip context.
  robots: { index: false, follow: false },
};

export default async function BookPage({ params, searchParams }: Props) {
  const [{ slug }, raw] = await Promise.all([params, searchParams]);
  const stay = await getPropertyDetail(slug);
  if (!stay) notFound();

  const trip = parseTripContext(raw);
  // An option slug from the URL is only honoured if it belongs to this stay.
  const option = stay.options.find((o) => o.slug === trip.option) ?? null;
  const estimate = estimateStay(
    option?.priceFromUgx ?? stay.priceFromUgx,
    trip.checkIn,
    trip.checkOut,
  );
  const dates = formatDateRange(trip.checkIn, trip.checkOut);

  return (
    <>
      <Header variant="solid" />
      <main id="main" className="bg-ivory">
        <div className="mx-auto max-w-[900px] px-5 pb-20 pt-28 sm:px-8 lg:pt-32">
          <p className="eyebrow text-gold">Your trip so far</p>
          <h1 className="mt-3 text-[clamp(1.9rem,4vw,3rem)] leading-[1.05] text-forest">
            {stay.name}
          </h1>
          <p className="mt-2 text-[0.95rem] text-muted">
            {STAY_TYPE_LABELS[stay.stayType]} · {stay.destination.name},{" "}
            {stay.destination.region}
          </p>

          <div className="mt-9 overflow-hidden rounded-sm border border-line bg-ivory sm:flex">
            <div className="relative aspect-[4/3] sm:aspect-auto sm:w-64 sm:shrink-0">
              <Image
                src={stay.image}
                alt={stay.imageAlt}
                fill
                priority
                sizes="(max-width: 640px) 100vw, 256px"
                className="object-cover"
              />
            </div>
            <dl className="flex-1 divide-y divide-line">
              <Row label="Accommodation" value={option ? option.name : "Not chosen yet"} />
              <Row label="Dates" value={dates ?? "Not chosen yet"} />
              <Row
                label="Nights"
                value={estimate.nights > 0 ? String(estimate.nights) : "—"}
              />
              <Row label="Guests" value={trip.guests ? String(trip.guests) : "Not set"} />
              <Row
                label="Estimated stay subtotal"
                value={
                  estimate.complete
                    ? `${formatUgx(estimate.subtotalUgx)}`
                    : "Add dates to estimate"
                }
              />
            </dl>
          </div>

          <div className="mt-10 rounded-sm border border-line bg-ivory-warm/60 p-7">
            <p className="eyebrow text-gold">Next release</p>
            <h2 className="mt-3 text-[1.4rem] leading-snug text-forest">
              The booking flow arrives in Release 4.
            </h2>
            <p className="mt-4 max-w-xl text-[0.97rem] leading-relaxed text-muted">
              Everything above is carried in this link, so traveller details, review and
              a real reservation request will pick it up unchanged. Nothing has been
              reserved and no payment has been taken.
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                href={stayHref(stay.slug, trip)}
                className="rounded-sm bg-forest px-6 py-3.5 text-sm font-medium tracking-wide text-ivory transition-colors hover:bg-forest-soft"
              >
                Back to {stay.name}
              </Link>
              <Link
                href={`/stays?destination=${stay.destination.slug}`}
                className="rounded-sm border border-line px-6 py-3.5 text-sm text-forest transition-colors hover:border-forest"
              >
                Other stays in {stay.destination.name}
              </Link>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-6 px-5 py-4 sm:px-6">
      <dt className="text-[0.85rem] text-muted">{label}</dt>
      <dd className="text-right text-[0.95rem] tabular-nums text-ink">{value}</dd>
    </div>
  );
}
