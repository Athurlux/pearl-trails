"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useId, useRef, useState } from "react";
import {
  addTripItem,
  deleteTripItem,
  moveTripExperience,
  updateTripItem,
} from "@/app/trip/[token]/actions";
import { formatUgx } from "@/lib/format";
import {
  ITINERARY_SOURCE_LABELS,
  MAX_ITINERARY_NOTE,
  MAX_ITINERARY_TITLE,
  TIME_OF_DAY,
  TIME_OF_DAY_LABELS,
  type TimeOfDay,
} from "@/lib/itinerary-vocab";
import { initialTripState } from "@/lib/trip-rules";
import type { TripItineraryItem } from "@/lib/trip-query";
import type { TripDay } from "@/lib/trip-rules";

interface Props {
  token: string;
  days: TripDay[];
  items: TripItineraryItem[];
  checkIn: string;
  checkOut: string;
}

/**
 * The day-by-day trip timeline.
 *
 * A client island because it holds "which row am I editing" — nothing else.
 * Every write is a Server Action against `trip-query.ts`, which re-derives the
 * booking from the token, so the interactivity here is presentation and the
 * authority is elsewhere.
 *
 * Structure is a list of days, each an ordered list of items, so a screen
 * reader hears "Day 2 of 4, 3 items" rather than a wall of divs. The trail line
 * is decorative CSS on a pseudo-element and carries no meaning of its own.
 */
export function TripItinerary({ token, days, items, checkIn, checkOut }: Props) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [addingDay, setAddingDay] = useState<string | null>(null);

  if (days.length === 0) {
    return (
      <p className="text-[0.9rem] text-muted">
        This trip has no dates to lay out yet.
      </p>
    );
  }

  return (
    <section aria-labelledby="itinerary-heading">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
        <div>
          <h2
            id="itinerary-heading"
            className="text-[clamp(1.3rem,2.6vw,1.7rem)] text-forest"
          >
            Day by day
          </h2>
          <p className="mt-1.5 text-[0.86rem] text-muted">
            Your plan for {days.length} {days.length === 1 ? "day" : "days"}. Move things
            around as you like — nothing here is a confirmed booking time.
          </p>
        </div>

        <button
          type="button"
          onClick={() => window.print()}
          className="shrink-0 text-[0.84rem] text-forest underline decoration-line underline-offset-4 transition-colors hover:decoration-forest print:hidden"
        >
          Print this itinerary
        </button>
      </div>

      <ol className="mt-8 space-y-10">
        {days.map((day) => {
          const dayItems = items.filter((item) => item.day === day.date);

          return (
            <li key={day.date} className="relative">
              {/* Day heading. `sticky` on desktop only: on a phone it eats
                  vertical space that the itinerary itself needs. */}
              <div className="flex items-baseline gap-3 border-b border-line pb-2.5">
                <h3 className="text-[0.95rem] text-forest">Day {day.number}</h3>
                <p className="text-[0.82rem] uppercase tracking-wide text-muted">
                  {day.weekday} {day.dayMonth}
                </p>
                {day.isArrival ? <Tag>Arrival</Tag> : null}
                {day.isDeparture ? <Tag>Departure</Tag> : null}
              </div>

              {dayItems.length === 0 ? (
                <p className="mt-4 text-[0.86rem] text-muted">
                  Nothing planned. A free day is a legitimate plan.
                </p>
              ) : (
                <ul className="mt-4 space-y-3">
                  {dayItems.map((item) => (
                    <li key={item.id}>
                      {editingId === item.id ? (
                        <EditRow
                          token={token}
                          item={item}
                          days={days}
                          onDone={() => setEditingId(null)}
                        />
                      ) : (
                        <ItemRow
                          token={token}
                          item={item}
                          days={days}
                          onEdit={() => setEditingId(item.id)}
                        />
                      )}
                    </li>
                  ))}
                </ul>
              )}

              <div className="mt-4 print:hidden">
                {addingDay === day.date ? (
                  <AddRow
                    token={token}
                    day={day.date}
                    days={days}
                    onDone={() => setAddingDay(null)}
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => setAddingDay(day.date)}
                    className="text-[0.84rem] text-forest transition-colors hover:text-forest-soft"
                  >
                    + Add to day {day.number}
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ol>

      <p className="mt-8 text-[0.78rem] leading-relaxed text-muted">
        Anything you add here is your own note — Pearl Trails does not book it, and the
        property does not see it. Check-in, check-out and the experiences you requested
        come from your booking and are managed with your reservation.{" "}
        <span className="sr-only">
          Your dates are {checkIn} to {checkOut}.
        </span>
      </p>
    </section>
  );
}

/**
 * Re-reads the trip and closes the form once an action has actually succeeded.
 *
 * `router.refresh()` rather than `revalidatePath` on the server: this route is
 * dynamic, so there is no cache entry for the server to invalidate, and the
 * page kept showing the old itinerary until the traveller reloaded by hand.
 *
 * The ref guards against re-firing. `state` keeps its `ok` value until the next
 * submission, so reacting to the value rather than to the *transition* would
 * refresh on every subsequent render.
 */
/** Stable identity, so the effect below does not re-run on every render. */
function noop() {}

function useRefreshOnSuccess(status: string, onSuccess: () => void) {
  const router = useRouter();
  const handled = useRef(false);

  useEffect(() => {
    if (status !== "ok") {
      handled.current = false;
      return;
    }
    if (handled.current) return;
    handled.current = true;
    router.refresh();
    onSuccess();
  }, [status, router, onSuccess]);
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-gold/40 bg-sand/15 px-2 py-0.5 text-[0.7rem] uppercase tracking-wider text-gold">
      {children}
    </span>
  );
}

/**
 * One line of the plan.
 *
 * What is offered depends entirely on where the item came from — the same rule
 * the server enforces. A `system` row offers nothing, an `experience` may be
 * moved, a `traveller` item is theirs.
 */
function ItemRow({
  token,
  item,
  days,
  onEdit,
}: {
  token: string;
  item: TripItineraryItem;
  days: TripDay[];
  onEdit: () => void;
}) {
  const [moving, setMoving] = useState(false);
  const when = item.exactTime ?? TIME_OF_DAY_LABELS[item.timeOfDay];

  return (
    <div className="flex gap-4 rounded-sm border border-line bg-ivory p-3.5 sm:p-4">
      {/* The time rail. Fixed width so every row on a day lines up. */}
      <p className="w-[4.5rem] shrink-0 pt-0.5 text-[0.8rem] tabular-nums text-gold">
        {when}
      </p>

      <div className="min-w-0 flex-1">
        <p className="text-[0.95rem] leading-snug text-ink">{item.title}</p>

        {item.note ? (
          <p className="mt-1 whitespace-pre-line text-[0.83rem] leading-relaxed text-muted">
            {item.note}
          </p>
        ) : null}

        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="text-[0.75rem] uppercase tracking-wider text-muted">
            {ITINERARY_SOURCE_LABELS[item.source]}
          </span>

          {item.source === "experience" && item.experiencePriceUgx !== null ? (
            <span className="text-[0.78rem] text-muted">
              {formatUgx(item.experiencePriceUgx)}
              {item.experienceGuests ? ` · ${item.experienceGuests} guests` : ""}
            </span>
          ) : null}
        </div>

        {/* Experiences: movable, never removable. Removing one from the plan
            is not the same act as removing it from the booking. */}
        {item.source === "experience" ? (
          <div className="mt-2.5 print:hidden">
            {moving ? (
              <MoveExperience
                token={token}
                item={item}
                days={days}
                onDone={() => setMoving(false)}
              />
            ) : (
              <button
                type="button"
                onClick={() => setMoving(true)}
                className="text-[0.82rem] text-forest transition-colors hover:text-forest-soft"
              >
                Move this
              </button>
            )}
          </div>
        ) : null}

        {item.source === "traveller" ? (
          <div className="mt-2.5 flex items-center gap-4 print:hidden">
            <button
              type="button"
              onClick={onEdit}
              className="text-[0.82rem] text-forest transition-colors hover:text-forest-soft"
            >
              Edit
            </button>
            <DeleteButton token={token} itemId={item.id} title={item.title} />
          </div>
        ) : null}
      </div>
    </div>
  );
}

function DeleteButton({
  token,
  itemId,
  title,
}: {
  token: string;
  itemId: number;
  title: string;
}) {
  const [state, action, pending] = useActionState(deleteTripItem, initialTripState);
  // Nothing to close after a delete — the row itself goes away on refresh.
  useRefreshOnSuccess(state.status, noop);

  return (
    <form action={action} className="inline">
      <input type="hidden" name="token" value={token} />
      <input type="hidden" name="itemId" value={itemId} />
      <button
        type="submit"
        disabled={pending}
        className="text-[0.82rem] text-muted transition-colors hover:text-forest disabled:opacity-50"
      >
        {pending ? "Removing…" : "Remove"}
        <span className="sr-only"> {title}</span>
      </button>
      {state.formError ? (
        <span role="alert" className="ml-2 text-[0.78rem] text-gold">
          {state.formError}
        </span>
      ) : null}
    </form>
  );
}

function MoveExperience({
  token,
  item,
  days,
  onDone,
}: {
  token: string;
  item: TripItineraryItem;
  days: TripDay[];
  onDone: () => void;
}) {
  const [state, action, pending] = useActionState(moveTripExperience, initialTripState);
  const fieldId = useId();
  useRefreshOnSuccess(state.status, onDone);

  return (
    <form action={action} className="rounded-sm border border-line bg-ivory-warm/40 p-3">
      <input type="hidden" name="token" value={token} />
      <input type="hidden" name="itemId" value={item.id} />

      <p className="text-[0.8rem] text-muted">
        Move <span className="text-ink">{item.title}</span>. This is your preferred
        timing — we confirm the real one with you.
      </p>

      <div className="mt-2.5 flex flex-wrap items-end gap-3">
        <DaySelect id={`${fieldId}-day`} days={days} defaultValue={item.day} />
        <SlotSelect id={`${fieldId}-slot`} defaultValue={item.timeOfDay} />

        <button
          type="submit"
          disabled={pending}
          className="min-h-10 rounded-sm bg-forest px-4 py-2 text-[0.82rem] text-ivory transition-colors hover:bg-forest-soft disabled:opacity-55"
        >
          {pending ? "Saving…" : "Save"}
        </button>
        <button
          type="button"
          onClick={onDone}
          className="min-h-10 px-2 text-[0.82rem] text-muted transition-colors hover:text-forest"
        >
          Cancel
        </button>
      </div>

      <Errors state={state} />
    </form>
  );
}

function AddRow({
  token,
  day,
  days,
  onDone,
}: {
  token: string;
  day: string;
  days: TripDay[];
  onDone: () => void;
}) {
  const [state, action, pending] = useActionState(addTripItem, initialTripState);
  const fieldId = useId();
  useRefreshOnSuccess(state.status, onDone);

  return (
    <ItemForm
      action={action}
      pending={pending}
      state={state}
      token={token}
      fieldId={fieldId}
      days={days}
      defaults={{ title: "", day, timeOfDay: "flexible", note: "" }}
      submitLabel="Add to my plan"
      onCancel={onDone}
    />
  );
}

function EditRow({
  token,
  item,
  days,
  onDone,
}: {
  token: string;
  item: TripItineraryItem;
  days: TripDay[];
  onDone: () => void;
}) {
  const [state, action, pending] = useActionState(updateTripItem, initialTripState);
  const fieldId = useId();
  useRefreshOnSuccess(state.status, onDone);

  return (
    <ItemForm
      action={action}
      pending={pending}
      state={state}
      token={token}
      itemId={item.id}
      fieldId={fieldId}
      days={days}
      defaults={{
        title: item.title,
        day: item.day,
        timeOfDay: item.timeOfDay,
        note: item.note ?? "",
      }}
      submitLabel="Save"
      onCancel={onDone}
    />
  );
}

function ItemForm({
  action,
  pending,
  state,
  token,
  itemId,
  fieldId,
  days,
  defaults,
  submitLabel,
  onCancel,
}: {
  action: (payload: FormData) => void;
  pending: boolean;
  state: typeof initialTripState;
  token: string;
  itemId?: number;
  fieldId: string;
  days: TripDay[];
  defaults: { title: string; day: string; timeOfDay: TimeOfDay | string; note: string };
  submitLabel: string;
  onCancel: () => void;
}) {
  return (
    <form action={action} className="rounded-sm border border-forest/25 bg-ivory p-4">
      <input type="hidden" name="token" value={token} />
      {itemId ? <input type="hidden" name="itemId" value={itemId} /> : null}

      <div className="space-y-3">
        <div>
          <label htmlFor={`${fieldId}-title`} className="block text-[0.82rem] text-ink">
            What is it?
          </label>
          <input
            id={`${fieldId}-title`}
            name="title"
            defaultValue={defaults.title}
            maxLength={MAX_ITINERARY_TITLE}
            required
            autoFocus
            placeholder="Airport pickup"
            aria-describedby={state.errors.title ? `${fieldId}-title-error` : undefined}
            aria-invalid={state.errors.title ? true : undefined}
            className="mt-1 min-h-11 w-full rounded-sm border border-line bg-ivory px-3 py-2 text-[0.9rem] text-ink outline-none transition-colors focus:border-forest"
          />
          <FieldError id={`${fieldId}-title-error`} message={state.errors.title} />
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <DaySelect id={`${fieldId}-day`} days={days} defaultValue={defaults.day} />
          <SlotSelect id={`${fieldId}-slot`} defaultValue={defaults.timeOfDay} />
        </div>
        <FieldError id={`${fieldId}-day-error`} message={state.errors.day} />

        <div>
          <label htmlFor={`${fieldId}-note`} className="block text-[0.82rem] text-ink">
            Note <span className="text-muted">(optional)</span>
          </label>
          <textarea
            id={`${fieldId}-note`}
            name="note"
            defaultValue={defaults.note}
            maxLength={MAX_ITINERARY_NOTE}
            rows={2}
            className="mt-1 w-full rounded-sm border border-line bg-ivory px-3 py-2 text-[0.9rem] text-ink outline-none transition-colors focus:border-forest"
          />
          <FieldError id={`${fieldId}-note-error`} message={state.errors.note} />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="min-h-11 rounded-sm bg-forest px-5 py-2.5 text-[0.85rem] text-ivory transition-colors hover:bg-forest-soft disabled:opacity-55"
        >
          {pending ? "Saving…" : submitLabel}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="min-h-11 px-2 text-[0.85rem] text-muted transition-colors hover:text-forest"
        >
          Cancel
        </button>
      </div>

      <Errors state={state} />
    </form>
  );
}

function DaySelect({
  id,
  days,
  defaultValue,
}: {
  id: string;
  days: TripDay[];
  defaultValue: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-[0.82rem] text-ink">
        Day
      </label>
      <select
        id={id}
        name="day"
        defaultValue={defaultValue}
        className="mt-1 min-h-11 rounded-sm border border-line bg-ivory px-3 py-2 text-[0.88rem] text-ink outline-none transition-colors focus:border-forest"
      >
        {days.map((day) => (
          <option key={day.date} value={day.date}>
            Day {day.number} · {day.weekday} {day.dayMonth}
          </option>
        ))}
      </select>
    </div>
  );
}

function SlotSelect({ id, defaultValue }: { id: string; defaultValue: string }) {
  return (
    <div>
      <label htmlFor={id} className="block text-[0.82rem] text-ink">
        When
      </label>
      <select
        id={id}
        name="timeOfDay"
        defaultValue={defaultValue}
        className="mt-1 min-h-11 rounded-sm border border-line bg-ivory px-3 py-2 text-[0.88rem] text-ink outline-none transition-colors focus:border-forest"
      >
        {TIME_OF_DAY.map((slot) => (
          <option key={slot} value={slot}>
            {TIME_OF_DAY_LABELS[slot]}
          </option>
        ))}
      </select>
    </div>
  );
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className="mt-1 text-[0.8rem] text-gold">
      {message}
    </p>
  );
}

function Errors({ state }: { state: typeof initialTripState }) {
  if (!state.formError) return null;
  return (
    <p role="alert" className="mt-3 text-[0.82rem] text-gold">
      {state.formError}
    </p>
  );
}
