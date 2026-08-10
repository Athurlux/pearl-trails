"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef } from "react";
import { setVisibilityAction } from "@/app/ops/actions";
import {
  STAY_VISIBILITIES,
  STAY_VISIBILITY_LABELS,
  type StayVisibility,
} from "@/lib/staff-vocab";
import { initialTripState } from "@/lib/trip-rules";

const EXPLANATIONS: Record<StayVisibility, string> = {
  draft: "Not public. Nobody can reach it, including by typing the URL.",
  published: "Live in search, on the landing page and at its own address.",
  archived: "Retired. Not public, but its bookings and history remain.",
};

export function VisibilityControl({
  slug,
  current,
  canEdit,
}: {
  slug: string;
  current: StayVisibility;
  canEdit: boolean;
}) {
  const [state, action, pending] = useActionState(setVisibilityAction, initialTripState);
  const router = useRouter();
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

  if (!canEdit) {
    return (
      <p className="text-[0.88rem] text-ink">
        {STAY_VISIBILITY_LABELS[current]}
        <span className="ml-2 text-muted">{EXPLANATIONS[current]}</span>
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {STAY_VISIBILITIES.map((visibility) => {
        const isCurrent = visibility === current;
        return (
          <form key={visibility} action={action} className="flex">
            <input type="hidden" name="slug" value={slug} />
            <input type="hidden" name="visibility" value={visibility} />
            <button
              type="submit"
              disabled={pending || isCurrent}
              aria-current={isCurrent ? "true" : undefined}
              className={`w-full rounded-sm border px-4 py-2.5 text-left transition-colors ${
                isCurrent
                  ? "cursor-default border-forest bg-forest/[0.06]"
                  : "border-line hover:border-forest/45"
              } disabled:cursor-default`}
            >
              <span className="text-[0.88rem] text-forest">
                {STAY_VISIBILITY_LABELS[visibility]}
                {isCurrent ? (
                  <span className="ml-2 text-[0.76rem] uppercase tracking-wider text-gold">
                    Current
                  </span>
                ) : null}
              </span>
              <span className="mt-0.5 block text-[0.8rem] leading-relaxed text-muted">
                {EXPLANATIONS[visibility]}
              </span>
            </button>
          </form>
        );
      })}

      {state.formError ? (
        <p role="alert" className="text-[0.83rem] text-gold">
          {state.formError}
        </p>
      ) : null}
    </div>
  );
}
