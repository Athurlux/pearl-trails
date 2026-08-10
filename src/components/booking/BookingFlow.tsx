"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useActionState, useEffect, useId, useMemo, useRef, useState } from "react";
import { submitBookingRequest } from "@/app/book/[slug]/actions";
import {
  type BookingActionState,
  type FieldErrors,
  calculateBookingEstimate,
  chooseInitialOption,
  initialBookingState,
  validateOptionChoice,
  validateTraveller,
  validateTrip,
} from "@/lib/booking-rules";
import { buildTripQuery, stayHref } from "@/lib/trip-params";
import { BOOKING_STEPS, BookingStepper } from "./BookingStepper";
import { BookingSummary } from "./BookingSummary";
import { DatesStep } from "./steps/DatesStep";
import { ExperiencesStep } from "./steps/ExperiencesStep";
import { ReviewStep } from "./steps/ReviewStep";
import { StayStep } from "./steps/StayStep";
import { TravellerStep } from "./steps/TravellerStep";
import type { BookingExperienceOption, BookingOption, TravellerForm } from "./types";

interface Props {
  stay: {
    slug: string;
    name: string;
    checkInTime: string;
    checkOutTime: string;
    maxGuests: number;
  };
  destination: { slug: string; name: string };
  options: BookingOption[];
  experiences: BookingExperienceOption[];
  initial: {
    option: string | null;
    checkIn: string | null;
    checkOut: string | null;
    guests: number | null;
    experiences: string[];
  };
  /** Calendar date in Uganda, resolved on the server so it is not a device clock. */
  today: string;
}

/**
 * The booking flow.
 *
 * One client island holds the whole journey. State is split by sensitivity:
 *
 *   * **Trip context** — accommodation, dates, guests, experiences — is mirrored
 *     into the URL, so a refresh, a shared link or a return from the property
 *     page all restore the same trip. Availability is re-read on the server when
 *     the dates change, which is exactly when it can have changed.
 *   * **Traveller details** live only here, in memory. They never touch the URL,
 *     localStorage or a query parameter.
 *   * **The step** is local state, not a route. Moving between steps is instant
 *     and costs no round trip; a wizard that re-queried the database to reveal
 *     the next question would be a poor trade.
 *
 * Client validation here is for feedback only. Every rule it applies is applied
 * again by the server against database-loaded values, and `validateTrip` /
 * `validateTraveller` are literally the same functions — one implementation,
 * so the two cannot drift.
 */
export function BookingFlow({
  stay,
  destination,
  options,
  experiences,
  initial,
  today,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const headingId = useId();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const hasRenderedOnce = useRef(false);

  const [step, setStep] = useState(0);
  const [furthest, setFurthest] = useState(0);
  const [showErrors, setShowErrors] = useState(false);

  const [optionSlug, setOptionSlug] = useState(() =>
    chooseInitialOption(
      options,
      initial.option,
      Boolean(initial.checkIn && initial.checkOut),
    ),
  );
  const [checkIn, setCheckIn] = useState(initial.checkIn);
  const [checkOut, setCheckOut] = useState(initial.checkOut);
  const [guests, setGuests] = useState(initial.guests ?? 2);
  const [selectedExperiences, setSelectedExperiences] = useState<string[]>(() =>
    initial.experiences.filter((slug) => experiences.some((e) => e.slug === slug)),
  );

  const [traveller, setTraveller] = useState<TravellerForm>({
    fullName: "",
    email: "",
    phoneCode: "+256",
    phoneNumber: "",
    country: "",
    specialRequests: "",
  });

  /*
    The idempotency key for this attempt.

    Minted once when the flow mounts and kept for every submit of *this*
    booking, so a double click, a flaky connection or a resubmitted POST all
    carry the same token and collapse into one row. `useState` with an
    initialiser, not `useMemo`, because this must survive re-renders and must
    not be regenerated if React re-invokes a render.
  */
  const [requestToken, setRequestToken] = useState(() => crypto.randomUUID());

  const [state, formAction, isSubmitting] = useActionState<BookingActionState, FormData>(
    submitBookingRequest,
    initialBookingState,
  );

  const option = options.find((o) => o.slug === optionSlug) ?? null;
  const capacity = option?.guestCapacity ?? stay.maxGuests;
  const datesChosen = Boolean(checkIn && checkOut);

  const chosenExperiences = useMemo(
    () =>
      experiences
        .filter((e) => selectedExperiences.includes(e.slug))
        .map((e) => ({ slug: e.slug, name: e.name, priceFromUgx: e.priceFromUgx })),
    [experiences, selectedExperiences],
  );

  const estimate = useMemo(
    () =>
      calculateBookingEstimate({
        nightlyRateUgx: option?.priceFromUgx ?? 0,
        checkIn,
        checkOut,
        experiences: chosenExperiences.map((e) => ({
          priceFromUgx: e.priceFromUgx,
          guests,
        })),
      }),
    [option, checkIn, checkOut, chosenExperiences, guests],
  );

  /*
    Mirror trip context into the URL, debounced.

    Debounced because this route is dynamic: every URL change re-runs the
    availability query on the server. Tapping the guest stepper four times
    should cost one round trip, not four. `replace` rather than `push` so
    adjusting a date does not bury the property page under history entries —
    the same choice `TripPlanner` makes.
  */
  useEffect(() => {
    const query = buildTripQuery({
      checkIn,
      checkOut,
      guests,
      option: optionSlug || null,
      experiences: selectedExperiences,
    });

    // Nothing to write. Without this the flow replaces the URL once on every
    // mount, costing a server round trip to arrive at the address it is
    // already on.
    const current = searchParams.toString();
    if (query === (current ? `?${current}` : "")) return;

    const timer = setTimeout(() => {
      router.replace(`${pathname}${query}`, { scroll: false });
    }, 400);
    return () => clearTimeout(timer);
  }, [
    router,
    pathname,
    searchParams,
    checkIn,
    checkOut,
    guests,
    optionSlug,
    selectedExperiences,
  ]);

  /*
    Move focus to the new step's heading.

    Without this a keyboard or screen-reader user presses Continue and focus
    stays on a button that no longer relates to what is on screen. Guarded so
    it does not steal focus on first paint.
  */
  useEffect(() => {
    // Skip the first run so the flow does not grab focus on page load; every
    // later step change moves it. The ref is only ever touched inside the
    // effect, never during render.
    if (!hasRenderedOnce.current) {
      hasRenderedOnce.current = true;
      return;
    }
    headingRef.current?.focus();
  }, [step]);

  /*
    A conflict reported by the server is about the accommodation, so send the
    traveller back to the step where they can actually change it.

    Adjusted during render rather than in an effect. Reacting to the action
    result with `useEffect(() => setStep(0))` would paint the review step first
    and then jump, and it is the cascading-render pattern React specifically
    warns about. Comparing against the previous status is the documented way to
    derive state from a changed input.
  */
  const [seenStatus, setSeenStatus] = useState(state.status);
  if (state.status !== seenStatus) {
    setSeenStatus(state.status);
    if (state.status === "unavailable") setStep(0);
  }

  const tripErrors = validateTrip({ checkIn, checkOut, guests }, { capacity, today });
  const travellerErrors = validateTraveller(traveller).errors;

  /** Which fields each step owns, so a step only blocks on its own problems. */
  function errorsForStep(index: number): FieldErrors {
    if (index === 0) return validateOptionChoice(option, datesChosen);
    if (index === 1) return tripErrors;
    if (index === 3) return travellerErrors;
    return {};
  }

  const currentErrors = errorsForStep(step);
  const serverErrors = state.status === "invalid" ? state.errors : {};
  const visibleErrors = showErrors ? { ...currentErrors, ...serverErrors } : serverErrors;

  function goTo(next: number) {
    setShowErrors(false);
    setStep(next);
    setFurthest((previous) => Math.max(previous, next));
  }

  function handleContinue() {
    if (Object.keys(currentErrors).length > 0) {
      // Reveal the problems rather than silently refusing to advance.
      setShowErrors(true);
      return;
    }
    goTo(Math.min(step + 1, BOOKING_STEPS.length - 1));
  }

  const readyToSubmit =
    Object.keys(validateOptionChoice(option, datesChosen)).length === 0 &&
    Object.keys(tripErrors).length === 0 &&
    Object.keys(travellerErrors).length === 0;

  const isReview = step === BOOKING_STEPS.length - 1;

  return (
    <form
      action={formAction}
      onSubmit={() => {
        // A fresh token for the next booking, so a traveller who deliberately
        // books again gets a new reservation rather than a replay of this one.
        setRequestToken(crypto.randomUUID());
      }}
    >
      {/* Authoritative values are re-derived server-side from these slugs. There
          is deliberately no price, subtotal or total field: the client has
          nothing to assert about money, so there is nothing to tamper with. */}
      <input type="hidden" name="staySlug" value={stay.slug} />
      <input type="hidden" name="optionSlug" value={optionSlug} />
      <input type="hidden" name="checkIn" value={checkIn ?? ""} />
      <input type="hidden" name="checkOut" value={checkOut ?? ""} />
      <input type="hidden" name="guests" value={String(guests)} />
      <input type="hidden" name="requestToken" value={requestToken} />
      {selectedExperiences.map((slug) => (
        <input key={slug} type="hidden" name="experiences" value={slug} />
      ))}
      <input type="hidden" name="fullName" value={traveller.fullName} />
      <input type="hidden" name="email" value={traveller.email} />
      <input type="hidden" name="phoneCode" value={traveller.phoneCode} />
      <input type="hidden" name="phoneNumber" value={traveller.phoneNumber} />
      <input type="hidden" name="country" value={traveller.country} />
      <input type="hidden" name="specialRequests" value={traveller.specialRequests} />

      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-10 xl:gap-14">
        <div className="min-w-0">
          <BookingStepper current={step} furthest={furthest} onSelect={goTo} />

          <h2
            id={headingId}
            ref={headingRef}
            tabIndex={-1}
            className="mt-7 text-[clamp(1.35rem,3vw,1.8rem)] leading-tight text-forest outline-none"
          >
            {BOOKING_STEPS[step]}
          </h2>
          <p className="mt-1.5 text-[0.85rem] text-muted">
            Step {step + 1} of {BOOKING_STEPS.length}
          </p>

          {state.formError ? (
            <div
              role="alert"
              className="mt-5 rounded-sm border border-gold bg-sand/15 px-4 py-3.5"
            >
              <p className="text-[0.9rem] leading-relaxed text-ink">{state.formError}</p>
              {state.status === "unavailable" ? (
                <p className="mt-2 text-[0.83rem] leading-relaxed text-muted">
                  Try different dates, or choose another accommodation below. Nothing has
                  been booked and no details were lost.
                </p>
              ) : null}
            </div>
          ) : null}

          <div className="mt-7">
            {step === 0 ? (
              <StayStep
                options={options}
                selected={optionSlug}
                guests={guests}
                datesChosen={datesChosen}
                onSelect={(slug) => setOptionSlug(slug)}
                error={visibleErrors.option}
              />
            ) : null}

            {step === 1 ? (
              <DatesStep
                checkIn={checkIn}
                checkOut={checkOut}
                guests={guests}
                capacity={capacity}
                today={today}
                errors={visibleErrors}
                onChange={(patch) => {
                  if (patch.checkIn !== undefined) setCheckIn(patch.checkIn);
                  if (patch.checkOut !== undefined) setCheckOut(patch.checkOut);
                  if (patch.guests !== undefined) setGuests(patch.guests);
                }}
              />
            ) : null}

            {step === 2 ? (
              <ExperiencesStep
                experiences={experiences}
                selected={selectedExperiences}
                guests={guests}
                onToggle={(slug) =>
                  setSelectedExperiences((current) =>
                    current.includes(slug)
                      ? current.filter((s) => s !== slug)
                      : [...current, slug],
                  )
                }
                onClear={() => setSelectedExperiences([])}
              />
            ) : null}

            {step === 3 ? (
              <TravellerStep
                value={traveller}
                errors={visibleErrors}
                onChange={(patch) =>
                  setTraveller((current) => ({ ...current, ...patch }))
                }
              />
            ) : null}

            {step === 4 && option ? (
              <ReviewStep
                stayName={stay.name}
                destination={destination.name}
                optionName={option.name}
                bedDescription={option.bedDescription}
                checkIn={checkIn}
                checkOut={checkOut}
                checkInTime={stay.checkInTime}
                checkOutTime={stay.checkOutTime}
                guests={guests}
                experiences={chosenExperiences}
                traveller={traveller}
                estimate={estimate}
                onEdit={goTo}
              />
            ) : null}
          </div>

          {/* Desktop actions. The mobile bar below carries the same controls. */}
          <div className="mt-9 hidden items-center justify-between gap-4 border-t border-line pt-6 lg:flex">
            <BackControl step={step} staySlug={stay.slug} trip={{ checkIn, checkOut, guests, option: optionSlug, experiences: selectedExperiences }} onBack={() => goTo(step - 1)} />
            {isReview ? (
              <SubmitButton disabled={!readyToSubmit} isSubmitting={isSubmitting} />
            ) : (
              <button
                type="button"
                onClick={handleContinue}
                className="rounded-sm bg-forest px-7 py-3.5 text-sm font-medium tracking-wide text-ivory transition-colors hover:bg-forest-soft"
              >
                {step === 2 && selectedExperiences.length === 0 ? "Skip for now" : "Continue"}
              </button>
            )}
          </div>
        </div>

        <aside className="mt-10 lg:mt-0">
          <div className="lg:sticky lg:top-28">
            <BookingSummary
              optionName={option?.name ?? null}
              bedDescription={option?.bedDescription ?? null}
              checkIn={checkIn}
              checkOut={checkOut}
              guests={guests}
              experiences={chosenExperiences}
              estimate={estimate}
            />
          </div>
        </aside>
      </div>

      {/*
        Mobile action bar.

        Fixed to the bottom where a thumb reaches, padded for the home
        indicator, and the page reserves space for it so it never covers the
        last field.
      */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-ivory/97 px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-md lg:hidden">
        <div className="flex items-center justify-between gap-4">
          <BackControl
            step={step}
            staySlug={stay.slug}
            trip={{ checkIn, checkOut, guests, option: optionSlug, experiences: selectedExperiences }}
            onBack={() => goTo(step - 1)}
            compact
          />
          {isReview ? (
            <SubmitButton disabled={!readyToSubmit} isSubmitting={isSubmitting} compact />
          ) : (
            <button
              type="button"
              onClick={handleContinue}
              className="min-h-12 shrink-0 rounded-sm bg-forest px-6 py-3 text-sm font-medium tracking-wide text-ivory transition-colors hover:bg-forest-soft"
            >
              {step === 2 && selectedExperiences.length === 0 ? "Skip" : "Continue"}
            </button>
          )}
        </div>
      </div>
    </form>
  );
}

function BackControl({
  step,
  staySlug,
  trip,
  onBack,
  compact = false,
}: {
  step: number;
  staySlug: string;
  trip: Parameters<typeof stayHref>[1];
  onBack: () => void;
  compact?: boolean;
}) {
  const className = compact
    ? "min-h-12 shrink-0 px-1 text-[0.88rem] text-muted transition-colors hover:text-forest"
    : "text-[0.9rem] text-muted transition-colors hover:text-forest";

  // From the first step, "back" means the property page — and it carries the
  // trip context with it, so nothing chosen here is lost by going to look.
  if (step === 0) {
    return (
      <Link href={stayHref(staySlug, trip)} className={className}>
        ← Back to the property
      </Link>
    );
  }

  return (
    <button type="button" onClick={onBack} className={className}>
      ← Back
    </button>
  );
}

function SubmitButton({
  disabled,
  isSubmitting,
  compact = false,
}: {
  disabled: boolean;
  isSubmitting: boolean;
  compact?: boolean;
}) {
  return (
    <button
      type="submit"
      /*
        Disabled while in flight, which is a courtesy rather than a guarantee —
        the actual protection against a duplicate booking is the unique index on
        `request_token`, which holds even if this button is bypassed entirely.
      */
      disabled={disabled || isSubmitting}
      aria-disabled={disabled || isSubmitting}
      className={[
        compact ? "min-h-12 shrink-0 px-6 py-3" : "px-7 py-3.5",
        "rounded-sm bg-forest text-sm font-medium tracking-wide text-ivory transition-colors hover:bg-forest-soft disabled:cursor-not-allowed disabled:opacity-55",
      ].join(" ")}
    >
      {isSubmitting ? "Sending request…" : "Request booking"}
    </button>
  );
}
