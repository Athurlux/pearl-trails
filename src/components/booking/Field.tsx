"use client";

import type { ReactNode } from "react";

interface Props {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  optional?: boolean;
  children: (aria: {
    id: string;
    "aria-invalid": boolean | undefined;
    "aria-describedby": string | undefined;
  }) => ReactNode;
}

/**
 * A labelled form field with its error and hint wired up.
 *
 * The point of the render-prop is that the control cannot be rendered without
 * receiving `aria-describedby` and `aria-invalid` — the association is
 * structural rather than something each call site has to remember.
 *
 * Errors are never signalled by colour alone: there is a visible message, a
 * `role="alert"`, and `aria-invalid` on the control itself.
 */
export function Field({ id, label, error, hint, optional, children }: Props) {
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  const describedBy =
    [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(" ") || undefined;

  return (
    <div>
      <label htmlFor={id} className="block text-[0.85rem] text-forest">
        {label}
        {optional ? <span className="text-muted"> (optional)</span> : null}
      </label>

      {hint ? (
        <p id={hintId} className="mt-1 text-[0.78rem] leading-relaxed text-muted">
          {hint}
        </p>
      ) : null}

      <div className="mt-1.5">
        {children({
          id,
          "aria-invalid": error ? true : undefined,
          "aria-describedby": describedBy,
        })}
      </div>

      {error ? (
        <p
          id={errorId}
          role="alert"
          className="mt-1.5 flex items-start gap-1.5 text-[0.8rem] leading-relaxed text-forest"
        >
          <span aria-hidden="true" className="mt-px text-gold">
            ▲
          </span>
          {error}
        </p>
      ) : null}
    </div>
  );
}

/** Shared input styling, so every control in the flow looks like one system. */
export const inputClass =
  "w-full rounded-sm border border-line bg-ivory px-3.5 py-3 text-[0.95rem] text-ink outline-none transition-colors hover:border-forest/40 focus:border-forest aria-[invalid=true]:border-gold";
