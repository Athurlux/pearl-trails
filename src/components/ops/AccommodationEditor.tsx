"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useId, useRef } from "react";
import { updateAccommodationAction } from "@/app/ops/actions";
import { formatUgx } from "@/lib/format";
import { initialTripState } from "@/lib/trip-rules";

interface Option {
  id: number;
  slug: string;
  name: string;
  guestCapacity: number;
  inventoryCount: number;
  priceFromUgx: number;
  activeBookings: number;
}

/**
 * Rate and inventory for one accommodation.
 *
 * The active-booking count is shown beside the inventory field on purpose:
 * lowering units below it is allowed — a lodge really can lose a room — and the
 * consequence is that no further bookings are possible until the excess clears.
 * That is worth seeing before typing the number rather than discovering after.
 *
 * It cannot cause an overbooking. The exclusion constraint is per unit, and
 * bookings keep the unit index they already hold.
 */
export function AccommodationEditor({
  staySlug,
  option,
  canEdit,
}: {
  staySlug: string;
  option: Option;
  canEdit: boolean;
}) {
  const [state, action, pending] = useActionState(
    updateAccommodationAction,
    initialTripState,
  );
  const router = useRouter();
  const id = useId();
  const handled = useRef(false);

  useEffect(() => {
    if (state.status !== "ok") {
      handled.current = false;
      return;
    }
    if (handled.current) return;
    handled.current = true;
    router.refresh();
  }, [state.status, router]);

  return (
    <div className="rounded-sm border border-line p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <h3 className="text-[1rem] text-forest">{option.name}</h3>
        <p className="text-[0.82rem] text-muted">
          Sleeps {option.guestCapacity} · {option.activeBookings} active{" "}
          {option.activeBookings === 1 ? "booking" : "bookings"}
        </p>
      </div>

      {!canEdit ? (
        <p className="mt-3 text-[0.88rem] text-ink">
          {formatUgx(option.priceFromUgx)} / night · {option.inventoryCount}{" "}
          {option.inventoryCount === 1 ? "unit" : "units"}
        </p>
      ) : (
        <form action={action} className="mt-3">
          <input type="hidden" name="staySlug" value={staySlug} />
          <input type="hidden" name="optionId" value={option.id} />

          <div className="flex flex-wrap items-end gap-4">
            <div>
              <label htmlFor={`${id}-price`} className="block text-[0.8rem] text-muted">
                Nightly rate (UGX)
              </label>
              <input
                id={`${id}-price`}
                name="priceFromUgx"
                type="number"
                min={1}
                step={1000}
                required
                defaultValue={option.priceFromUgx}
                aria-describedby={
                  state.errors.priceFromUgx ? `${id}-price-error` : undefined
                }
                aria-invalid={state.errors.priceFromUgx ? true : undefined}
                className="mt-1 min-h-10 w-40 rounded-sm border border-line bg-ivory px-3 py-2 text-[0.88rem] tabular-nums text-ink outline-none transition-colors focus:border-forest"
              />
            </div>

            <div>
              <label htmlFor={`${id}-units`} className="block text-[0.8rem] text-muted">
                Units
              </label>
              <input
                id={`${id}-units`}
                name="inventoryCount"
                type="number"
                min={1}
                max={500}
                required
                defaultValue={option.inventoryCount}
                aria-describedby={
                  state.errors.inventoryCount ? `${id}-units-error` : undefined
                }
                aria-invalid={state.errors.inventoryCount ? true : undefined}
                className="mt-1 min-h-10 w-24 rounded-sm border border-line bg-ivory px-3 py-2 text-[0.88rem] tabular-nums text-ink outline-none transition-colors focus:border-forest"
              />
            </div>

            <button
              type="submit"
              disabled={pending}
              className="min-h-10 rounded-sm bg-forest px-4 py-2 text-[0.85rem] text-ivory transition-colors hover:bg-forest-soft disabled:opacity-55"
            >
              {pending ? "Saving…" : "Save"}
            </button>

            <p aria-live="polite" className="text-[0.82rem] text-muted">
              {state.status === "ok" ? "Saved." : ""}
            </p>
          </div>

          {state.errors.priceFromUgx ? (
            <p id={`${id}-price-error`} role="alert" className="mt-2 text-[0.8rem] text-gold">
              {state.errors.priceFromUgx}
            </p>
          ) : null}
          {state.errors.inventoryCount ? (
            <p id={`${id}-units-error`} role="alert" className="mt-2 text-[0.8rem] text-gold">
              {state.errors.inventoryCount}
            </p>
          ) : null}
          {state.formError ? (
            <p role="alert" className="mt-2 text-[0.8rem] text-gold">
              {state.formError}
            </p>
          ) : null}
        </form>
      )}
    </div>
  );
}
