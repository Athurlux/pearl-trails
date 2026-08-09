"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useId, useTransition } from "react";
import {
  SORTS,
  SORT_LABELS,
  parseStaysParams,
  staysHref,
  type Sort,
} from "@/lib/stays-params";

export function SortSelect() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const id = useId();

  const params = parseStaysParams(Object.fromEntries(searchParams.entries()));

  return (
    <div className="flex items-center gap-2">
      <label htmlFor={id} className="text-[0.85rem] text-muted">
        Sort
      </label>
      <select
        id={id}
        value={params.sort}
        disabled={pending}
        onChange={(e) =>
          startTransition(() => {
            // Re-sorting invalidates the current page number.
            router.push(staysHref(params, { sort: e.target.value as Sort, page: 1 }), {
              scroll: false,
            });
          })
        }
        className="cursor-pointer rounded-sm border border-line bg-ivory px-3 py-2 text-[0.88rem] text-ink outline-none transition-colors hover:border-forest/40 disabled:opacity-60"
      >
        {SORTS.map((s) => (
          <option key={s} value={s}>
            {SORT_LABELS[s]}
          </option>
        ))}
      </select>
    </div>
  );
}
