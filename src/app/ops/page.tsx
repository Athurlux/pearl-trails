import Link from "next/link";
import { BOOKING_STATUS_LABELS, type BookingStatus } from "@/lib/booking-status";

import { getOverview, listRecentAudit, listUpcomingArrivals } from "@/lib/ops-query";
import { requireStaff } from "@/lib/staff-auth";
import { AUDIT_ACTION_LABELS, type AuditAction } from "@/lib/staff-vocab";
import { formatDateRange } from "@/lib/trip-params";

/**
 * Operations overview.
 *
 * Every number here is a count from the database that someone can act on —
 * requests waiting, guests arriving. There are no charts, no week-on-week
 * deltas and no percentages, because none of those would change what anyone
 * does next, and inventing them would be inventing a metric.
 */

export const metadata = { title: "Overview" };

interface Props {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function OpsOverviewPage({ searchParams }: Props) {
  const staff = await requireStaff();
  const query = await searchParams;

  const [overview, arrivals, audit] = await Promise.all([
    getOverview(),
    listUpcomingArrivals(7),
    listRecentAudit(12),
  ]);

  return (
    <main id="main" className="mx-auto max-w-[1200px] px-5 py-10 sm:px-8">
      <h1 className="text-[1.6rem] text-forest">Good day, {staff.name.split(" ")[0]}.</h1>
      <p className="mt-1.5 text-[0.9rem] text-muted">
        {overview.pending > 0
          ? `${overview.pending} ${overview.pending === 1 ? "request is" : "requests are"} waiting for a decision.`
          : "No requests are waiting for a decision."}
      </p>

      {/* A role-denied redirect lands here. Saying so beats silently showing
          the overview and leaving someone wondering what happened. */}
      {query.denied ? (
        <p
          role="alert"
          className="mt-5 rounded-sm border border-gold/40 bg-sand/15 px-4 py-3 text-[0.87rem] text-ink"
        >
          That area needs an administrator account.
        </p>
      ) : null}

      <section aria-labelledby="figures" className="mt-8">
        <h2 id="figures" className="sr-only">
          Current figures
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Figure
            label="Awaiting review"
            value={overview.pending}
            href="/ops/bookings?status=pending"
            emphasis
          />
          <Figure
            label="Confirmed"
            value={overview.confirmed}
            href="/ops/bookings?status=confirmed"
          />
          <Figure label="Arriving in 7 days" value={overview.arrivingNext7Days} />
          <Figure label="Requests this week" value={overview.requestsLast7Days} />
        </div>
      </section>

      <div className="mt-10 lg:grid lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-10">
        <section aria-labelledby="arrivals">
          <div className="flex items-baseline justify-between gap-4">
            <h2 id="arrivals" className="text-[1.15rem] text-forest">
              Arriving soon
            </h2>
            <Link
              href="/ops/bookings"
              className="text-[0.84rem] text-forest underline decoration-line underline-offset-4 hover:decoration-forest"
            >
              All bookings
            </Link>
          </div>

          {arrivals.length === 0 ? (
            <p className="mt-3 text-[0.88rem] text-muted">
              Nobody is due in the next seven days.
            </p>
          ) : (
            <ul className="mt-4 divide-y divide-line rounded-sm border border-line">
              {arrivals.map((arrival) => (
                <li key={arrival.reference}>
                  <Link
                    href={`/ops/bookings/${arrival.reference}`}
                    className="flex flex-wrap items-baseline justify-between gap-x-5 gap-y-1 px-4 py-3 transition-colors hover:bg-ivory-warm/50"
                  >
                    <span className="min-w-0 text-[0.9rem] text-ink">
                      {arrival.guestName}
                      <span className="ml-2 text-[0.82rem] text-muted">
                        {arrival.stayName}
                      </span>
                    </span>
                    <span className="text-[0.83rem] tabular-nums text-muted">
                      {formatDateRange(arrival.checkIn, null)} · {arrival.guests}{" "}
                      {arrival.guests === 1 ? "guest" : "guests"} ·{" "}
                      {BOOKING_STATUS_LABELS[arrival.status as BookingStatus]}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="activity" className="mt-10 lg:mt-0">
          <h2 id="activity" className="text-[1.15rem] text-forest">
            Recent activity
          </h2>
          {audit.length === 0 ? (
            <p className="mt-3 text-[0.88rem] text-muted">Nothing recorded yet.</p>
          ) : (
            <ol className="mt-4 space-y-3">
              {audit.map((event) => (
                <li key={event.id} className="text-[0.84rem] leading-relaxed">
                  <p className="text-ink">
                    {AUDIT_ACTION_LABELS[event.action as AuditAction]}
                    {event.targetType === "booking" ? (
                      <>
                        {" — "}
                        <Link
                          href={`/ops/bookings/${event.targetRef}`}
                          className="underline decoration-line underline-offset-2 hover:decoration-forest"
                        >
                          {event.targetRef}
                        </Link>
                      </>
                    ) : null}
                  </p>
                  <p className="text-muted">
                    {event.actorName} · {event.summary}
                  </p>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>

      <p className="mt-14 border-t border-line pt-6 text-[0.78rem] leading-relaxed text-muted">
        Pearl Trails takes no payment, so there is nothing here to reconcile. Booking
        totals are the estimates a traveller was quoted at the time they requested —
        display snapshots, not amounts owed.
      </p>
    </main>
  );
}

function Figure({
  label,
  value,
  href,
  emphasis = false,
}: {
  label: string;
  value: number;
  href?: string;
  emphasis?: boolean;
}) {
  const body = (
    <>
      <p className="text-[0.78rem] uppercase tracking-wider text-muted">{label}</p>
      <p
        className={`mt-1.5 font-display text-[2rem] leading-none tabular-nums ${
          emphasis && value > 0 ? "text-gold" : "text-forest"
        }`}
      >
        {value}
      </p>
    </>
  );

  const className =
    "block rounded-sm border border-line bg-ivory px-4 py-4 transition-colors";

  return href ? (
    <Link href={href} className={`${className} hover:border-forest/40`}>
      {body}
    </Link>
  ) : (
    <div className={className}>{body}</div>
  );
}
