import Link from "next/link";
import { notFound } from "next/navigation";
import { BookingNotes } from "@/components/ops/BookingNotes";
import { StatusActions } from "@/components/ops/StatusActions";
import {
  BOOKING_STATUS_LABELS,
  BOOKING_STATUS_NOTES,
  type BookingStatus,
} from "@/lib/booking-status";
import { parseBookingReference } from "@/lib/booking-rules";
import { allowedTransitions } from "@/lib/booking-transitions";
import { formatUgx } from "@/lib/format";
import { getBookingForOps } from "@/lib/ops-query";
import { requireStaff } from "@/lib/staff-auth";
import { AUDIT_ACTION_LABELS, type AuditAction } from "@/lib/staff-vocab";
import { formatDateRange } from "@/lib/trip-params";

/**
 * One booking, for the person dealing with it.
 *
 * Contact details are shown in full here, unlike every traveller-facing page.
 * This is the screen someone uses to phone a guest about their arrival, and
 * masking the number would make the tool useless. The protection is the session
 * in front of it, not redaction behind it.
 *
 * The traveller's private trip link is **not** shown and cannot be: only a hash
 * of it is stored. Staff can see what the traveller planned, not act as them.
 */

interface Props {
  params: Promise<{ reference: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { reference } = await params;
  return { title: parseBookingReference(reference) ?? "Booking" };
}

export default async function OpsBookingPage({ params }: Props) {
  await requireStaff();
  const { reference } = await params;

  const parsed = parseBookingReference(reference);
  if (!parsed) notFound();

  const booking = await getBookingForOps(parsed);
  if (!booking) notFound();

  const status = booking.status as BookingStatus;
  const transitions = allowedTransitions(status);

  return (
    <main id="main" className="mx-auto max-w-[1200px] px-5 py-10 sm:px-8">
      <Link
        href="/ops/bookings"
        className="text-[0.84rem] text-muted transition-colors hover:text-forest"
      >
        ← All bookings
      </Link>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-x-8 gap-y-4">
        <div>
          <h1 className="font-display text-[1.9rem] tracking-[0.06em] text-forest">
            {booking.reference}
          </h1>
          <p className="mt-1.5 text-[0.9rem] text-muted">
            Requested {booking.createdAt.toLocaleDateString("en-GB", { timeZone: "UTC" })}{" "}
            · {booking.stay.name}, {booking.destination.name}
          </p>
        </div>

        <div className="rounded-sm border border-line bg-ivory-warm/40 px-4 py-3">
          <p className="text-[0.75rem] uppercase tracking-wider text-muted">Status</p>
          <p className="mt-0.5 text-[1rem] text-forest">{BOOKING_STATUS_LABELS[status]}</p>
          <p className="mt-1 max-w-[22rem] text-[0.8rem] leading-relaxed text-muted">
            {booking.blocksInventory
              ? "Holding a unit for these dates."
              : "Not holding a unit — the dates are free."}
          </p>
        </div>
      </div>

      <div className="mt-8 lg:grid lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-10">
        <div className="min-w-0 space-y-8">
          <Panel title="Traveller">
            <dl className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
              <Field label="Name" value={booking.guestName} />
              <Field label="Travelling from" value={booking.guestCountry} />
              <Field
                label="Email"
                value={booking.guestEmail}
                href={`mailto:${booking.guestEmail}`}
              />
              <Field
                label="Phone"
                value={booking.guestPhone}
                href={`tel:${booking.guestPhone.replace(/[^\d+]/g, "")}`}
              />
            </dl>

            {booking.specialRequests ? (
              <div className="mt-5 border-t border-line pt-4">
                <p className="text-[0.78rem] uppercase tracking-wider text-muted">
                  Their request to the property
                </p>
                {/* Rendered as text, never as HTML. */}
                <p className="mt-1.5 whitespace-pre-line text-[0.88rem] leading-relaxed text-ink">
                  {booking.specialRequests}
                </p>
              </div>
            ) : null}
          </Panel>

          <Panel title="Stay">
            <dl className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
              <Field label="Property" value={booking.stay.name} />
              <Field
                label="Accommodation"
                value={`${booking.option.name} · unit ${booking.unitIndex} of ${booking.option.inventoryCount}`}
              />
              <Field
                label="Dates"
                value={
                  formatDateRange(booking.checkIn, booking.checkOut) ??
                  `${booking.checkIn} – ${booking.checkOut}`
                }
              />
              <Field
                label="Nights and guests"
                value={`${booking.nights} ${booking.nights === 1 ? "night" : "nights"} · ${booking.guests} ${booking.guests === 1 ? "guest" : "guests"}`}
              />
            </dl>

            {booking.experiences.length > 0 ? (
              <div className="mt-5 border-t border-line pt-4">
                <p className="text-[0.78rem] uppercase tracking-wider text-muted">
                  Experiences requested
                </p>
                <ul className="mt-2 space-y-1.5">
                  {booking.experiences.map((experience) => (
                    <li
                      key={experience.name}
                      className="flex items-baseline justify-between gap-4 text-[0.88rem]"
                    >
                      <span className="text-ink">{experience.name}</span>
                      <span className="tabular-nums text-muted">
                        {experience.guests} × {formatUgx(experience.lineTotalUgx)}
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="mt-2.5 text-[0.78rem] leading-relaxed text-muted">
                  Interest recorded at booking. No time slot, guide or permit has been
                  arranged by Pearl Trails.
                </p>
              </div>
            ) : null}

            {booking.tripNote ? (
              <div className="mt-5 border-t border-line pt-4">
                <p className="text-[0.78rem] uppercase tracking-wider text-muted">
                  Their own trip note
                </p>
                <p className="mt-1.5 whitespace-pre-line text-[0.88rem] leading-relaxed text-ink">
                  {booking.tripNote}
                </p>
              </div>
            ) : null}
          </Panel>

          <BookingNotes reference={booking.reference} notes={booking.notes} />

          <Panel title="History">
            {booking.history.length === 0 ? (
              <p className="text-[0.87rem] text-muted">
                Nothing has been changed since this request arrived.
              </p>
            ) : (
              <ol className="space-y-3">
                {booking.history.map((event, index) => (
                  <li key={index} className="text-[0.85rem] leading-relaxed">
                    <p className="text-ink">
                      {AUDIT_ACTION_LABELS[event.action as AuditAction]} — {event.summary}
                    </p>
                    <p className="text-muted">
                      {event.actorName} ·{" "}
                      {event.createdAt.toLocaleString("en-GB", { timeZone: "UTC" })} UTC
                    </p>
                  </li>
                ))}
              </ol>
            )}
          </Panel>
        </div>

        <aside className="mt-8 space-y-6 lg:mt-0">
          <div className="rounded-sm border border-line p-5">
            <h2 className="text-[1rem] text-forest">Move this booking</h2>
            <p className="mt-1.5 text-[0.82rem] leading-relaxed text-muted">
              {BOOKING_STATUS_NOTES[status]}
            </p>

            <div className="mt-4">
              <StatusActions
                reference={booking.reference}
                current={status}
                transitions={[...transitions]}
              />
            </div>
          </div>

          <div className="rounded-sm border border-line bg-ivory-warm/40 p-5">
            <h2 className="text-[1rem] text-forest">Estimate</h2>
            <dl className="mt-3 space-y-2 text-[0.85rem]">
              <Line
                label={`${booking.nights} × ${formatUgx(booking.nightlyRateUgx)}`}
                value={formatUgx(booking.accommodationSubtotalUgx)}
              />
              {booking.experiencesSubtotalUgx > 0 ? (
                <Line
                  label="Experiences"
                  value={formatUgx(booking.experiencesSubtotalUgx)}
                />
              ) : null}
              <div className="flex items-baseline justify-between gap-4 border-t border-line pt-2">
                <dt className="text-forest">Total</dt>
                <dd className="tabular-nums text-forest">
                  {formatUgx(booking.estimatedTotalUgx)}
                </dd>
              </div>
            </dl>
            <p className="mt-3 text-[0.76rem] leading-relaxed text-muted">
              The rate quoted when this was requested. Pearl Trails takes no payment, so
              this is not an amount owed and there is nothing to reconcile.
            </p>
          </div>

          <div className="rounded-sm border border-line p-5">
            <h2 className="text-[1rem] text-forest">Traveller&apos;s pages</h2>
            <p className="mt-1.5 text-[0.82rem] leading-relaxed text-muted">
              Their confirmation page is reachable with the reference. Their trip planner
              is not — only a fingerprint of that link is stored, so it cannot be opened
              from here.
            </p>
            <Link
              href={`/booking/${booking.reference}`}
              className="mt-3 inline-block text-[0.85rem] text-forest underline decoration-line underline-offset-4 hover:decoration-forest"
            >
              Open their confirmation page
            </Link>
          </div>
        </aside>
      </div>
    </main>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-sm border border-line p-5">
      <h2 className="text-[1.05rem] text-forest">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Field({
  label,
  value,
  href,
}: {
  label: string;
  value: string;
  href?: string;
}) {
  return (
    <div className="min-w-0">
      <dt className="text-[0.78rem] uppercase tracking-wider text-muted">{label}</dt>
      <dd className="mt-0.5 break-words text-[0.92rem] text-ink">
        {href ? (
          <a
            href={href}
            className="underline decoration-line underline-offset-4 hover:decoration-forest"
          >
            {value}
          </a>
        ) : (
          value
        )}
      </dd>
    </div>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-muted">{label}</dt>
      <dd className="tabular-nums text-ink">{value}</dd>
    </div>
  );
}
