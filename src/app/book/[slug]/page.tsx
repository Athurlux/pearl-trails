import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BookingFlow } from "@/components/booking/BookingFlow";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { getOptionAvailability } from "@/lib/booking-query";
import { todayInUganda } from "@/lib/booking-rules";
import { STAY_TYPE_LABELS } from "@/lib/stay-types";
import { getPropertyDetail } from "@/lib/stays-query";
import { parseTripContext, stayHref } from "@/lib/trip-params";

/**
 * The booking flow (Release 4).
 *
 * A Server Component that resolves the property, computes availability for the
 * requested dates, and hands a plain, serialisable snapshot to one client
 * island. The database client never crosses that boundary.
 */

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export const metadata: Metadata = {
  title: "Request a booking",
  // Only meaningful with trip context, and it collects personal details.
  // Nothing here belongs in a search index, and a form holding someone's name
  // and phone number should not unfurl as a shareable card either. `null`
  // clears the inherited root layout values; omitting them would keep them.
  robots: { index: false, follow: false },
  openGraph: null,
  twitter: null,
};

export default async function BookPage({ params, searchParams }: Props) {
  const [{ slug }, raw] = await Promise.all([params, searchParams]);
  const stay = await getPropertyDetail(slug);
  if (!stay) notFound();

  const trip = parseTripContext(raw);

  // Availability for the requested dates, one grouped query for the property.
  const availability = await getOptionAvailability(stay.id, trip.checkIn, trip.checkOut);

  // An option slug from the URL is honoured only if it belongs to this stay —
  // the same rule Release 3 applied, and the server re-checks it on submit.
  const presetOption = stay.options.find((o) => o.slug === trip.option)?.slug ?? null;

  if (stay.options.length === 0) {
    return (
      <NoOptions
        stayName={stay.name}
        staySlug={stay.slug}
        destinationSlug={stay.destination.slug}
        destinationName={stay.destination.name}
      />
    );
  }

  return (
    <>
      <Header variant="solid" />
      <main id="main" className="bg-ivory">
        <div className="mx-auto max-w-[1180px] px-5 pb-40 pt-28 sm:px-8 lg:pb-24 lg:pt-32">
          <Link
            href={stayHref(stay.slug, trip)}
            className="text-[0.85rem] text-muted transition-colors hover:text-forest"
          >
            ← {stay.name}
          </Link>

          <div className="mt-4 flex flex-wrap items-start justify-between gap-x-8 gap-y-4">
            <div className="min-w-0">
              <p className="eyebrow text-gold">Reservation request</p>
              <h1 className="mt-2.5 text-[clamp(1.9rem,4vw,3rem)] leading-[1.05] text-forest">
                {stay.name}
              </h1>
              <p className="mt-2 text-[0.95rem] text-muted">
                {STAY_TYPE_LABELS[stay.stayType]} · {stay.destination.name},{" "}
                {stay.destination.region}
              </p>
            </div>

            <div className="relative hidden h-24 w-40 shrink-0 overflow-hidden rounded-sm sm:block">
              <Image
                src={stay.image}
                alt={stay.imageAlt}
                fill
                sizes="160px"
                className="object-cover"
              />
            </div>
          </div>

          <hr className="mt-8 border-line" />

          <div className="mt-8">
            <BookingFlow
              stay={{
                slug: stay.slug,
                name: stay.name,
                checkInTime: stay.checkInTime,
                checkOutTime: stay.checkOutTime,
                maxGuests: stay.maxGuests,
              }}
              destination={{ slug: stay.destination.slug, name: stay.destination.name }}
              options={stay.options.map((option) => ({
                slug: option.slug,
                name: option.name,
                shortDescription: option.shortDescription,
                guestCapacity: option.guestCapacity,
                bedDescription: option.bedDescription,
                priceFromUgx: option.priceFromUgx,
                sizeSqm: option.sizeSqm,
                features: option.features,
                image: option.image,
                imageAlt: option.imageAlt,
                inventory: option.inventoryCount,
                available: availability.get(option.id) ?? option.inventoryCount,
              }))}
              experiences={stay.experiences.map((experience) => ({
                slug: experience.slug,
                name: experience.name,
                shortDescription: experience.shortDescription,
                category: experience.category,
                duration: experience.duration,
                priceFromUgx: experience.priceFromUgx,
                image: experience.image,
                imageAlt: experience.imageAlt,
              }))}
              initial={{
                option: presetOption,
                checkIn: trip.checkIn,
                checkOut: trip.checkOut,
                guests: trip.guests,
                experiences: trip.experiences,
              }}
              // Resolved on the server: a device clock set to last year must not
              // decide whether a check-in counts as being in the past.
              today={todayInUganda()}
            />
          </div>

          <p className="mt-12 border-t border-line pt-6 text-[0.78rem] leading-relaxed text-muted">
            Pearl Trails is a portfolio project. Properties, prices and availability shown
            here are fictional examples. Submitting a request stores it and issues you a
            reference — it takes no payment and does not contact a real lodge.
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}

/**
 * A property with nothing bookable. Not an error — Release 2 stays that never
 * received Release 3 accommodation options would land here — so it explains
 * itself and offers a route onward rather than showing a broken form.
 */
function NoOptions({
  stayName,
  staySlug,
  destinationSlug,
  destinationName,
}: {
  stayName: string;
  staySlug: string;
  destinationSlug: string;
  destinationName: string;
}) {
  return (
    <>
      <Header variant="solid" />
      <main id="main" className="bg-ivory">
        <div className="mx-auto max-w-[720px] px-5 pb-24 pt-32 sm:px-8">
          <p className="eyebrow text-gold">Not bookable yet</p>
          <h1 className="mt-3 text-[clamp(1.7rem,3.5vw,2.4rem)] leading-tight text-forest">
            {stayName} has no accommodation listed
          </h1>
          <p className="mt-4 text-[0.97rem] leading-relaxed text-muted">
            We cannot take a request for this property until its rooms or pitches are
            published. Nothing was lost — try another stay nearby.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href={`/stays?destination=${destinationSlug}`}
              className="rounded-sm bg-forest px-6 py-3.5 text-sm font-medium tracking-wide text-ivory transition-colors hover:bg-forest-soft"
            >
              Other stays in {destinationName}
            </Link>
            <Link
              href={`/stays/${staySlug}`}
              className="rounded-sm border border-line px-6 py-3.5 text-sm text-forest transition-colors hover:border-forest"
            >
              Back to {stayName}
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
