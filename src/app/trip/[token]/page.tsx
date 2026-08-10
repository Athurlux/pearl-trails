import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { TripItinerary } from "@/components/trip/TripItinerary";
import { TripNote } from "@/components/trip/TripNote";
import { WhatToBring } from "@/components/trip/WhatToBring";
import {
  BOOKING_STATUS_LABELS,
  BOOKING_STATUS_NOTES,
  type BookingStatus,
} from "@/lib/booking-status";
import { formatUgx } from "@/lib/format";
import { STAY_TYPE_LABELS, type StayType } from "@/lib/stay-types";
import { getTripByToken } from "@/lib/trip-query";
import { tripDays } from "@/lib/trip-rules";
import { formatDateRange } from "@/lib/trip-params";

/**
 * My Trip (Release 5).
 *
 * A Server Component. The itinerary, the stay summary and the totals are all
 * rendered on the server from one query; the only client islands are the
 * itinerary editor and the note field, which is where interactivity actually
 * lives.
 *
 * The address *is* the credential (decision 004), so this page is `noindex`,
 * emits no social card, and sets `referrer: no-referrer` — an outbound click
 * to a property page must not carry the trip URL in a `Referer` header.
 */

interface Props {
  params: Promise<{ token: string }>;
}

export const metadata: Metadata = {
  title: "Your trip",
  robots: { index: false, follow: false, nocache: true },
  // Inherited otherwise. A private, writable page must not unfurl anywhere.
  openGraph: null,
  twitter: null,
  // The URL is the key. Never hand it to another origin.
  referrer: "no-referrer",
};

export default async function TripPage({ params }: Props) {
  const { token } = await params;
  const trip = await getTripByToken(token);

  // A bad or unknown token is simply not found. There is no distinction
  // between "no such trip" and "not yours", because there is no owner yet.
  if (!trip) notFound();

  const status = trip.status as BookingStatus;
  const days = tripDays(trip.checkIn, trip.checkOut);
  const dates = formatDateRange(trip.checkIn, trip.checkOut);
  const experienceCount = trip.itinerary.filter((i) => i.source === "experience").length;

  return (
    <>
      <Header variant="solid" />
      <main id="main" className="bg-ivory">
        {/* ------------------------------------------------------------- */}
        {/* Trip header                                                    */}
        {/* ------------------------------------------------------------- */}
        <section className="border-b border-line bg-ivory-warm/40">
          <div className="mx-auto max-w-[1080px] px-5 pb-10 pt-28 sm:px-8 lg:pb-12 lg:pt-32">
            <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-end lg:gap-12">
              <div className="min-w-0">
                <p className="eyebrow text-gold">Your trip</p>
                <h1 className="mt-2.5 text-[clamp(1.9rem,4.4vw,3.1rem)] leading-[1.05] text-forest">
                  {trip.stay.name}
                </h1>
                <p className="mt-3 text-[0.97rem] text-muted">
                  {STAY_TYPE_LABELS[trip.stay.stayType as StayType]} ·{" "}
                  {trip.destination.name}, {trip.destination.region}
                </p>

                <dl className="mt-6 flex flex-wrap items-baseline gap-x-7 gap-y-2 text-[0.92rem]">
                  <div className="flex items-baseline gap-2">
                    <dt className="sr-only">Dates</dt>
                    <dd className="text-forest">{dates}</dd>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <dt className="sr-only">Nights</dt>
                    <dd className="text-muted">
                      {trip.nights} {trip.nights === 1 ? "night" : "nights"}
                    </dd>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <dt className="sr-only">Guests</dt>
                    <dd className="text-muted">
                      {trip.guests} {trip.guests === 1 ? "guest" : "guests"}
                    </dd>
                  </div>
                  {experienceCount > 0 ? (
                    <div className="flex items-baseline gap-2">
                      <dt className="sr-only">Experiences</dt>
                      <dd className="text-muted">
                        {experienceCount}{" "}
                        {experienceCount === 1 ? "experience" : "experiences"}
                      </dd>
                    </div>
                  ) : null}
                </dl>

                {/* Status, in words, with what it actually means. Never the
                    raw enum, and never a claim the product cannot support. */}
                <div className="mt-6 inline-flex max-w-xl flex-col gap-1 rounded-sm border border-line bg-ivory px-4 py-3">
                  <p className="text-[0.85rem] font-medium text-forest">
                    {BOOKING_STATUS_LABELS[status]}
                  </p>
                  <p className="text-[0.82rem] leading-relaxed text-muted">
                    {BOOKING_STATUS_NOTES[status]}
                  </p>
                </div>
              </div>

              <div className="mt-8 lg:mt-0">
                <div className="relative aspect-[4/3] overflow-hidden rounded-sm">
                  <Image
                    src={trip.stay.image}
                    alt={trip.stay.imageAlt}
                    fill
                    sizes="(max-width: 1024px) 100vw, 288px"
                    className="object-cover"
                    priority
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="mx-auto max-w-[1080px] px-5 pb-24 pt-12 sm:px-8">
          <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_18rem] lg:gap-12">
            <div className="min-w-0">
              {/* --------------------------------------------------------- */}
              {/* Day-by-day itinerary — the heart of Release 5             */}
              {/* --------------------------------------------------------- */}
              <TripItinerary
                token={token}
                days={days}
                items={trip.itinerary}
                checkIn={trip.checkIn}
                checkOut={trip.checkOut}
              />

              <div className="mt-14 print:hidden">
                <TripNote token={token} note={trip.tripNote} />
              </div>

              <div className="mt-14">
                <WhatToBring
                  stayType={trip.stay.stayType as StayType}
                  destination={trip.destination.name}
                  itineraryTitles={trip.itinerary.map((i) => i.title)}
                />
              </div>
            </div>

            {/* ----------------------------------------------------------- */}
            {/* Trip summary                                                 */}
            {/* ----------------------------------------------------------- */}
            <aside className="mt-14 lg:mt-0">
              <div className="lg:sticky lg:top-28">
                <div className="rounded-sm border border-line bg-ivory-warm/40 p-5">
                  <h2 className="text-[1.05rem] text-forest">Your booking</h2>

                  <dl className="mt-4 space-y-2.5 text-[0.85rem]">
                    <Row label="Reference" value={trip.reference} mono />
                    <Row label="Accommodation" value={trip.option.name} />
                    <Row label="Sleeping" value={trip.option.bedDescription} />
                    <Row
                      label="Check in"
                      value={`${days[0]?.dayMonth ?? ""} · from ${trip.stay.checkInTime}`}
                    />
                    <Row
                      label="Check out"
                      value={`${days[days.length - 1]?.dayMonth ?? ""} · by ${trip.stay.checkOutTime}`}
                    />
                    <Row label="Guests" value={String(trip.guests)} />
                  </dl>

                  {/* The historical snapshot from the booking, never a fresh
                      price. A later repricing must not restate what this
                      traveller was quoted. */}
                  <div className="mt-5 space-y-2 border-t border-line pt-4 text-[0.85rem]">
                    <div className="flex items-baseline justify-between gap-4">
                      <span className="text-muted">Accommodation</span>
                      <span className="tabular-nums text-ink">
                        {formatUgx(trip.accommodationSubtotalUgx)}
                      </span>
                    </div>
                    {trip.experiencesSubtotalUgx > 0 ? (
                      <div className="flex items-baseline justify-between gap-4">
                        <span className="text-muted">Experiences</span>
                        <span className="tabular-nums text-ink">
                          {formatUgx(trip.experiencesSubtotalUgx)}
                        </span>
                      </div>
                    ) : null}
                    <div className="flex items-baseline justify-between gap-4 border-t border-line pt-2.5">
                      <span className="text-forest">Estimated total</span>
                      <span className="tabular-nums text-forest">
                        {formatUgx(trip.estimatedTotalUgx)}
                      </span>
                    </div>
                  </div>

                  <p className="mt-4 text-[0.76rem] leading-relaxed text-muted">
                    The rates you were quoted when you requested, kept with your booking.
                    No payment has been taken and none is due through Pearl Trails.
                  </p>

                  <div className="mt-5 flex flex-col gap-2 border-t border-line pt-4 print:hidden">
                    <Link
                      href={`/booking/${trip.reference}`}
                      className="text-[0.85rem] text-forest underline decoration-line underline-offset-4 transition-colors hover:decoration-forest"
                    >
                      Booking details
                    </Link>
                    <Link
                      href={`/stays/${trip.stay.slug}`}
                      className="text-[0.85rem] text-forest underline decoration-line underline-offset-4 transition-colors hover:decoration-forest"
                    >
                      View the property
                    </Link>
                  </div>
                </div>

                {trip.specialRequests ? (
                  <div className="mt-5 rounded-sm border border-line p-5">
                    <h2 className="text-[0.95rem] text-forest">
                      What you told the property
                    </h2>
                    {/* Rendered as text. Never as HTML. */}
                    <p className="mt-2 whitespace-pre-line text-[0.85rem] leading-relaxed text-muted">
                      {trip.specialRequests}
                    </p>
                  </div>
                ) : null}

                <p className="mt-5 text-[0.76rem] leading-relaxed text-muted print:hidden">
                  This page is private to whoever has its address. Keep the link, and
                  share it only with the people travelling with you.
                </p>
              </div>
            </aside>
          </div>

          <p className="mt-16 border-t border-line pt-6 text-[0.78rem] leading-relaxed text-muted">
            Pearl Trails is a portfolio project. This trip is built from a stored
            reservation request — the property has not been contacted, no payment has been
            taken, and no experience time has been arranged with a guide or a permit
            office.
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}

function Row({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="shrink-0 text-muted">{label}</dt>
      <dd className={`text-right text-ink ${mono ? "tabular-nums tracking-wide" : ""}`}>
        {value}
      </dd>
    </div>
  );
}
