"use client";

import { useId } from "react";
import { Field, inputClass } from "../Field";
import {
  COUNTRIES,
  DIALLING_CODES,
  type FieldErrors,
  MAX_GUEST_NAME,
  MAX_SPECIAL_REQUESTS,
} from "@/lib/booking-rules";
import type { TravellerForm } from "../types";

interface Props {
  value: TravellerForm;
  errors: FieldErrors;
  onChange: (patch: Partial<TravellerForm>) => void;
}

/**
 * Step 4 — who is travelling.
 *
 * Only what a property genuinely needs to hold a request and reply to it: a
 * name, a way to reach them, and where they are coming from. No passport, no
 * date of birth, no ID number — none of it is used by anything in this product,
 * and collecting personal data with no purpose is a liability rather than a
 * feature.
 *
 * `autoComplete` is set throughout so browsers and password managers can fill
 * this in one tap, which matters most on the mobile keyboards this form will
 * mostly meet.
 */
export function TravellerStep({ value, errors, onChange }: Props) {
  const id = useId();
  const remaining = MAX_SPECIAL_REQUESTS - value.specialRequests.length;

  return (
    <div className="space-y-5">
      <Field id={`${id}-name`} label="Full name" error={errors.fullName}>
        {(aria) => (
          <input
            {...aria}
            type="text"
            name="fullName"
            autoComplete="name"
            maxLength={MAX_GUEST_NAME}
            value={value.fullName}
            onChange={(event) => onChange({ fullName: event.target.value })}
            className={inputClass}
          />
        )}
      </Field>

      <Field
        id={`${id}-email`}
        label="Email"
        error={errors.email}
        hint="Where we send your booking reference."
      >
        {(aria) => (
          <input
            {...aria}
            type="email"
            name="email"
            autoComplete="email"
            inputMode="email"
            value={value.email}
            onChange={(event) => onChange({ email: event.target.value })}
            className={inputClass}
          />
        )}
      </Field>

      <div className="grid gap-4 sm:grid-cols-[minmax(0,11rem)_1fr]">
        <Field id={`${id}-code`} label="Country code" error={errors.phoneCode}>
          {(aria) => (
            <select
              {...aria}
              name="phoneCode"
              value={value.phoneCode}
              onChange={(event) => onChange({ phoneCode: event.target.value })}
              className={`${inputClass} cursor-pointer`}
            >
              {DIALLING_CODES.map((dialling) => (
                <option key={dialling.code} value={dialling.code}>
                  {dialling.label}
                </option>
              ))}
            </select>
          )}
        </Field>

        <Field
          id={`${id}-phone`}
          label="Phone number"
          error={errors.phoneNumber}
          hint="Digits only. A leading zero is fine."
        >
          {(aria) => (
            <input
              {...aria}
              type="tel"
              name="phoneNumber"
              autoComplete="tel-national"
              inputMode="tel"
              maxLength={24}
              value={value.phoneNumber}
              onChange={(event) => onChange({ phoneNumber: event.target.value })}
              className={inputClass}
            />
          )}
        </Field>
      </div>

      <Field id={`${id}-country`} label="Travelling from" error={errors.country}>
        {(aria) => (
          <select
            {...aria}
            name="country"
            autoComplete="country-name"
            value={value.country}
            onChange={(event) => onChange({ country: event.target.value })}
            className={`${inputClass} cursor-pointer`}
          >
            <option value="">Choose a country</option>
            {COUNTRIES.map((country) => (
              <option key={country} value={country}>
                {country}
              </option>
            ))}
          </select>
        )}
      </Field>

      <Field
        id={`${id}-requests`}
        label="Anything we should know"
        optional
        error={errors.specialRequests}
        hint="Arrival time, dietary needs, accessibility, a celebration — anything useful."
      >
        {(aria) => (
          <textarea
            {...aria}
            name="specialRequests"
            rows={4}
            maxLength={MAX_SPECIAL_REQUESTS}
            value={value.specialRequests}
            onChange={(event) => onChange({ specialRequests: event.target.value })}
            className={`${inputClass} resize-y`}
          />
        )}
      </Field>

      {value.specialRequests.length > MAX_SPECIAL_REQUESTS - 100 ? (
        <p className="-mt-3 text-[0.78rem] text-muted" aria-live="polite">
          {remaining} characters remaining.
        </p>
      ) : null}

      <p className="rounded-sm border border-line bg-ivory-warm/40 px-4 py-3 text-[0.8rem] leading-relaxed text-muted">
        We use these details to hold your request and reply to it. No account is created
        and nothing is charged.
      </p>
    </div>
  );
}
