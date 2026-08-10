"use client";

import { formatUgx } from "@/lib/format";
import type { BookingEstimate } from "@/lib/booking-rules";
import { formatDateRange } from "@/lib/trip-params";

export interface SummaryExperience {
  slug: string;
  name: string;
  priceFromUgx: number | null;
}

interface Props {
  optionName: string | null;
  bedDescription: string | null;
  checkIn: string | null;
  checkOut: string | null;
  guests: number;
  experiences: SummaryExperience[];
  estimate: BookingEstimate;
  /** Hides the heading where the surrounding section already provides one. */
  bare?: boolean;
}

/**
 * The running booking summary.
 *
 * Shown as a sticky sidebar on desktop and inside the review step everywhere.
 * It states only what the application actually knows: nights × rate, priced
 * experiences, and the sum. There are no tax or service-fee lines, because the
 * database models neither and inventing one would be a fabricated charge.
 *
 * The word throughout is **estimated**. No money moves in this release.
 */
export function BookingSummary({
  optionName,
  bedDescription,
  checkIn,
  checkOut,
  guests,
  experiences,
  estimate,
  bare = false,
}: Props) {
  const dates = formatDateRange(checkIn, checkOut);
  const priced = experiences.filter((e) => e.priceFromUgx !== null && e.priceFromUgx > 0);
  const onRequest = experiences.filter(
    (e) => e.priceFromUgx === null || e.priceFromUgx <= 0,
  );

  return (
    <div className={bare ? "" : "rounded-sm border border-line bg-ivory p-6"}>
      {bare ? null : (
        <h2 className="text-[1.15rem] leading-snug text-forest">Your booking</h2>
      )}

      <dl className="mt-4 space-y-3 text-[0.9rem]">
        <Line label="Accommodation" value={optionName ?? "Not chosen yet"} />
        {bedDescription ? <Line label="Sleeping" value={bedDescription} muted /> : null}
        <Line label="Dates" value={dates ?? "Not chosen yet"} />
        <Line
          label="Nights"
          value={estimate.nights > 0 ? String(estimate.nights) : "—"}
        />
        <Line label="Guests" value={String(guests)} />
      </dl>

      {estimate.nights > 0 && estimate.nightlyRateUgx > 0 ? (
        <dl className="mt-5 space-y-2 border-t border-line pt-5 text-[0.9rem]">
          <div className="flex items-baseline justify-between gap-4">
            <dt className="min-w-0 text-muted">
              {formatUgx(estimate.nightlyRateUgx)} × {estimate.nights}{" "}
              {estimate.nights === 1 ? "night" : "nights"}
            </dt>
            <dd className="shrink-0 tabular-nums text-ink">
              {formatUgx(estimate.accommodationSubtotalUgx)}
            </dd>
          </div>

          {priced.map((experience) => (
            <div
              key={experience.slug}
              className="flex items-baseline justify-between gap-4"
            >
              <dt className="min-w-0 text-muted">
                {experience.name}
                <span className="text-[0.78rem]"> × {guests}</span>
              </dt>
              <dd className="shrink-0 tabular-nums text-ink">
                {formatUgx((experience.priceFromUgx ?? 0) * guests)}
              </dd>
            </div>
          ))}

          {onRequest.map((experience) => (
            <div
              key={experience.slug}
              className="flex items-baseline justify-between gap-4"
            >
              <dt className="min-w-0 text-muted">{experience.name}</dt>
              {/* Not free — simply not priced in the catalogue. Saying "included"
                  or showing 0 would be a claim the data does not support. */}
              <dd className="shrink-0 text-[0.82rem] text-muted">Priced on request</dd>
            </div>
          ))}

          <div className="flex items-baseline justify-between gap-4 border-t border-line pt-3">
            <dt className="text-forest">Estimated total</dt>
            <dd className="font-medium tabular-nums text-forest">
              {formatUgx(estimate.estimatedTotalUgx)}
            </dd>
          </div>
        </dl>
      ) : (
        <p className="mt-5 border-t border-line pt-5 text-[0.85rem] leading-relaxed text-muted">
          Choose your dates to see an estimated total.
        </p>
      )}

      <p className="mt-4 text-[0.75rem] leading-relaxed text-muted">
        An estimate for the accommodation and any experiences you add. No payment is
        taken in this release and no charge is made when you submit.
      </p>
    </div>
  );
}

function Line({
  label,
  value,
  muted = false,
}: {
  label: string;
  value: string;
  muted?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="shrink-0 text-muted">{label}</dt>
      <dd
        className={`min-w-0 break-words text-right ${muted ? "text-[0.85rem] text-muted" : "text-ink"}`}
      >
        {value}
      </dd>
    </div>
  );
}
