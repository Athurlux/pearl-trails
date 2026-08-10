"use client";

import type { ReactNode } from "react";
import { BookingSummary, type SummaryExperience } from "../BookingSummary";
import type { BookingEstimate } from "@/lib/booking-rules";
import { formatDateRange } from "@/lib/trip-params";
import type { TravellerForm } from "../types";

interface Props {
  stayName: string;
  destination: string;
  optionName: string;
  bedDescription: string;
  checkIn: string | null;
  checkOut: string | null;
  checkInTime: string;
  checkOutTime: string;
  guests: number;
  experiences: SummaryExperience[];
  traveller: TravellerForm;
  estimate: BookingEstimate;
  onEdit: (step: number) => void;
}

/**
 * Step 5 — review before submitting.
 *
 * Everything the traveller is about to send, with a way back to each part. No
 * surprises are introduced here: the total is the same estimate shown from the
 * first step, and there are no fees the earlier steps did not mention.
 *
 * The wording is careful. This submits a *request*. The property has not seen
 * it, nothing is paid, and the page says so rather than implying a confirmed
 * reservation.
 */
export function ReviewStep({
  stayName,
  destination,
  optionName,
  bedDescription,
  checkIn,
  checkOut,
  checkInTime,
  checkOutTime,
  guests,
  experiences,
  traveller,
  estimate,
  onEdit,
}: Props) {
  const dates = formatDateRange(checkIn, checkOut);

  return (
    <div className="space-y-4">
      <Section title="Your stay" onEdit={() => onEdit(0)}>
        <Row label="Property" value={`${stayName}, ${destination}`} />
        <Row label="Accommodation" value={optionName} />
        <Row label="Sleeping" value={bedDescription} />
      </Section>

      <Section title="Dates & guests" onEdit={() => onEdit(1)}>
        <Row label="Dates" value={dates ?? "Not chosen"} />
        <Row
          label="Nights"
          value={`${estimate.nights} ${estimate.nights === 1 ? "night" : "nights"}`}
        />
        <Row label="Guests" value={String(guests)} />
        <Row label="Check in / out" value={`From ${checkInTime} · until ${checkOutTime}`} />
      </Section>

      <Section title="Experiences" onEdit={() => onEdit(2)}>
        {experiences.length === 0 ? (
          <p className="px-5 py-3.5 text-[0.88rem] text-muted">
            None selected. You can arrange activities later.
          </p>
        ) : (
          experiences.map((experience) => (
            <Row
              key={experience.slug}
              label={experience.name}
              value={
                experience.priceFromUgx
                  ? `For ${guests} ${guests === 1 ? "guest" : "guests"}`
                  : "Priced on request"
              }
            />
          ))
        )}
      </Section>

      <Section title="Your details" onEdit={() => onEdit(3)}>
        <Row label="Name" value={traveller.fullName} />
        <Row label="Email" value={traveller.email} />
        <Row
          label="Phone"
          value={`${traveller.phoneCode} ${traveller.phoneNumber.replace(/^0+/, "")}`}
        />
        <Row label="Travelling from" value={traveller.country} />
        {traveller.specialRequests.trim() ? (
          <Row label="Notes" value={traveller.specialRequests.trim()} />
        ) : null}
      </Section>

      <div className="rounded-sm border border-line bg-ivory-warm/40 p-5 sm:p-6">
        <h3 className="text-[1.05rem] text-forest">Estimated total</h3>
        <div className="mt-3">
          <BookingSummary
            bare
            optionName={optionName}
            bedDescription={null}
            checkIn={checkIn}
            checkOut={checkOut}
            guests={guests}
            experiences={experiences}
            estimate={estimate}
          />
        </div>
      </div>
    </div>
  );
}

function Section({
  title,
  onEdit,
  children,
}: {
  title: string;
  onEdit: () => void;
  children: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-sm border border-line">
      <div className="flex items-center justify-between gap-4 border-b border-line bg-ivory-warm/40 px-5 py-3">
        <h3 className="text-[0.95rem] text-forest">{title}</h3>
        <button
          type="button"
          onClick={onEdit}
          className="shrink-0 text-[0.82rem] text-muted underline underline-offset-4 transition-colors hover:text-forest"
        >
          Edit<span className="sr-only"> {title}</span>
        </button>
      </div>
      <dl className="divide-y divide-line">{children}</dl>
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 px-5 py-3.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6">
      <dt className="shrink-0 text-[0.82rem] text-muted">{label}</dt>
      {/* `break-words` and `min-w-0`: a long email or a pasted note must wrap
          rather than push the card into horizontal scroll on a 390px screen. */}
      <dd className="min-w-0 break-words text-[0.9rem] text-ink sm:text-right">
        {value}
      </dd>
    </div>
  );
}
