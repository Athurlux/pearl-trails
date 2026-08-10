import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { getBookingByReference } from "@/lib/booking-query";
import { maskEmail, maskPhone, parseBookingReference } from "@/lib/booking-rules";
import {
  BOOKING_STATUS_LABELS,
  BOOKING_STATUS_NOTES,
  type BookingStatus,
} from "@/lib/booking-status";
import { formatUgx } from "@/lib/format";
import { formatDateRange } from "@/lib/trip-params";

/**
 * The confirmation page.
 *
 * Reachable by anyone holding the reference — that is how a traveller returns
 * without an account — so it is written to be safe under that assumption:
 * contact details masked, no internal identifiers, no social metadata, and no
 * indexing. See docs/decisions/003.
 *
 * The language is precise throughout. Nothing here says paid, confirmed or
 * guaranteed, because none of those has happened.
 */

interface Props {
  params: Promise<{ reference: string }>;
}

/**
 * Deliberately minimal.
 *
 * No description, no Open Graph, no Twitter card. A shared link must not
 * unfurl into a preview containing someone's name, property and dates — and
 * the safest way to guarantee that is to emit no social metadata at all.
 *
 * `null` rather than omission: metadata is *inherited*, so leaving these out
 * does not remove them — the root layout's card is emitted on this page
 * instead. That card carries no booking data, so nothing leaked, but a page
 * documented as having no social metadata should actually have none, or the
 * next person to add an `openGraph.title` here will trust a comment that was
 * never true. Only `null` clears an inherited field.
 */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { reference } = await params;
  const parsed = parseBookingReference(reference);

  return {
    title: parsed ? `Booking ${parsed}` : "Booking",
    robots: { index: false, follow: false, nocache: true },
    openGraph: null,
    twitter: null,
  };
}

export default async function BookingConfirmationPage({ params }: Props) {
  const { reference } = await params;

  // Reject a malformed reference before touching the database: a bad path
  // segment becomes a 404, not a query.
  const parsed = parseBookingReference(reference);
  if (!parsed) notFound();

  const booking = await getBookingByReference(parsed);
  // An unknown reference is simply not found. There is no distinction between
  // "no such booking" and "not yours", because there is no owner yet.
  if (!booking) notFound();

  const dates = formatDateRange(booking.checkIn, booking.checkOut);
  const status = booking.status as BookingStatus;

  return (
    <>
      <Header variant="solid" />
      <main id="main" className="bg-ivory">
        <div className="mx-auto max-w-[760px] px-5 pb-24 pt-28 sm:px-8 lg:pt-32">
          <p className="eyebrow text-gold">Reservation request received</p>
          <h1 className="mt-3 text-[clamp(1.8rem,4vw,2.75rem)] leading-[1.08] text-forest">
            Thank you, {booking.guestName.split(" ")[0]}.
          </h1>
          <p className="mt-4 max-w-xl text-[0.98rem] leading-relaxed text-muted">
            We have your request for {booking.stay.name}. Keep the reference below — it is
            how you and the property refer to this trip.
          </p>

          {/* The reference, given the prominence it needs to be written down. */}
          <div className="mt-8 rounded-sm border border-forest/25 bg-ivory-warm/60 px-6 py-6 sm:px-8">
            <p className="eyebrow text-muted">Your Pearl Trails booking reference</p>
            <p className="mt-2 font-display text-[clamp(1.7rem,5vw,2.4rem)] tracking-[0.12em] text-forest">
              {booking.reference}
            </p>

            <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-line pt-5">
              <StatusPill status={status} />
              <p className="min-w-0 flex-1 text-[0.85rem] leading-relaxed text-muted">
                {BOOKING_STATUS_NOTES[status]}
              </p>
            </div>
          </div>

          <section className="mt-9 overflow-hidden rounded-sm border border-line">
            <div className="relative aspect-[21/9] w-full">
              <Image
                src={booking.stay.image}
                alt={booking.stay.imageAlt}
                fill
                priority
                sizes="(max-width: 768px) 100vw, 760px"
                className="object-cover"
              />
            </div>

            <div className="border-b border-line px-5 py-4 sm:px-6">
              <h2 className="text-[1.15rem] leading-snug text-forest">
                {booking.stay.name}
              </h2>
              <p className="mt-1 text-[0.85rem] text-muted">
                {booking.destination.name}, {booking.destination.region}
              </p>
            </div>

            <dl className="divide-y divide-line">
              <Row label="Accommodation" value={booking.option.name} />
              <Row label="Sleeping" value={booking.option.bedDescription} />
              <Row label="Dates" value={dates ?? `${booking.checkIn} – ${booking.checkOut}`} />
              <Row
                label="Nights"
                value={`${booking.nights} ${booking.nights === 1 ? "night" : "nights"}`}
              />
              <Row label="Guests" value={String(booking.guests)} />
              <Row label="Name" value={booking.guestName} />
              {/* Masked: recognisable to the traveller, useless to anyone who
                  arrived at this URL by guessing it. */}
              <Row label="Email" value={maskEmail(booking.guestEmail)} />
              <Row label="Phone" value={maskPhone(booking.guestPhone)} />
              <Row label="Travelling from" value={booking.guestCountry} />
            </dl>
          </section>

          {booking.experiences.length > 0 ? (
            <section className="mt-6 overflow-hidden rounded-sm border border-line">
              <h2 className="border-b border-line bg-ivory-warm/40 px-5 py-3 text-[0.95rem] text-forest sm:px-6">
                Experiences requested
              </h2>
              <dl className="divide-y divide-line">
                {booking.experiences.map((experience) => (
                  <Row
                    key={experience.name}
                    label={experience.name}
                    value={
                      experience.priceUgx
                        ? `${formatUgx(experience.lineTotalUgx)} · ${experience.guests} ${experience.guests === 1 ? "guest" : "guests"}`
                        : "Priced on request"
                    }
                  />
                ))}
              </dl>
              <p className="border-t border-line px-5 py-3.5 text-[0.8rem] leading-relaxed text-muted sm:px-6">
                Timings and guides are arranged with you separately. No specific slot has
                been reserved.
              </p>
            </section>
          ) : null}

          {booking.specialRequests ? (
            <section className="mt-6 rounded-sm border border-line px-5 py-4 sm:px-6">
              <h2 className="text-[0.95rem] text-forest">Your notes</h2>
              {/* Plain text. Stored as text, rendered as text — never HTML. */}
              <p className="mt-2 whitespace-pre-wrap break-words text-[0.9rem] leading-relaxed text-ink">
                {booking.specialRequests}
              </p>
            </section>
          ) : null}

          <section className="mt-6 overflow-hidden rounded-sm border border-line">
            <h2 className="border-b border-line bg-ivory-warm/40 px-5 py-3 text-[0.95rem] text-forest sm:px-6">
              Estimated total
            </h2>
            <dl className="divide-y divide-line">
              <Row
                label={`${formatUgx(booking.nightlyRateUgx)} × ${booking.nights} ${booking.nights === 1 ? "night" : "nights"}`}
                value={formatUgx(booking.accommodationSubtotalUgx)}
              />
              {booking.experiencesSubtotalUgx > 0 ? (
                <Row
                  label="Experiences"
                  value={formatUgx(booking.experiencesSubtotalUgx)}
                />
              ) : null}
              <div className="flex items-baseline justify-between gap-6 bg-ivory-warm/30 px-5 py-4 sm:px-6">
                <dt className="text-[0.95rem] text-forest">Estimated total</dt>
                <dd className="text-[1.05rem] font-medium tabular-nums text-forest">
                  {formatUgx(booking.estimatedTotalUgx)}
                </dd>
              </div>
            </dl>
            {/*
              The single most important sentence on this page. Prices were
              captured when the request was made and no money has moved.
            */}
            <p className="border-t border-line px-5 py-3.5 text-[0.8rem] leading-relaxed text-muted sm:px-6">
              These are the rates at the time you requested, kept with your booking. No
              payment has been taken and no card details were collected. Payment and
              final confirmation arrive in a later release.
            </p>
          </section>

          <section className="mt-9 rounded-sm border border-line bg-ivory-warm/40 p-6 sm:p-7">
            <h2 className="text-[1.05rem] text-forest">What happens next</h2>
            <ol className="mt-3 space-y-2 text-[0.9rem] leading-relaxed text-muted">
              <li>
                1. Your dates are held against this accommodation while the request stands.
              </li>
              <li>2. The property reviews the request and responds.</li>
              <li>
                3. Save your reference. This page stays at the same address — bookmark it
                to come back.
              </li>
            </ol>
            <p className="mt-4 text-[0.8rem] leading-relaxed text-muted">
              Pearl Trails is a portfolio project: this is a stored reservation request,
              not a booking with a real lodge, and no email or SMS is sent.
            </p>
          </section>

          <div className="mt-9 flex flex-wrap gap-3">
            <Link
              href={`/stays/${booking.stay.slug}`}
              className="rounded-sm bg-forest px-6 py-3.5 text-sm font-medium tracking-wide text-ivory transition-colors hover:bg-forest-soft"
            >
              Back to {booking.stay.name}
            </Link>
            <Link
              href="/stays"
              className="rounded-sm border border-line px-6 py-3.5 text-sm text-forest transition-colors hover:border-forest"
            >
              Explore more stays
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}

/**
 * The status, in words. The raw enum is never shown — `pending` means nothing
 * to a traveller, and it is not a shape or a colour either: the label carries
 * the meaning on its own.
 */
function StatusPill({ status }: { status: BookingStatus }) {
  const tone =
    status === "confirmed"
      ? "border-forest/40 bg-forest/10 text-forest"
      : status === "pending"
        ? "border-gold/50 bg-sand/20 text-forest"
        : "border-line bg-ivory-warm text-muted";

  return (
    <span
      className={`shrink-0 rounded-full border px-3 py-1 text-[0.78rem] font-medium ${tone}`}
    >
      {BOOKING_STATUS_LABELS[status]}
    </span>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 px-5 py-3.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6 sm:px-6">
      <dt className="shrink-0 text-[0.82rem] text-muted">{label}</dt>
      <dd className="min-w-0 break-words text-[0.92rem] text-ink sm:text-right">
        {value}
      </dd>
    </div>
  );
}
