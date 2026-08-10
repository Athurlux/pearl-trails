"use client";

import { useActionState, useId } from "react";
import { signInAction } from "@/app/ops/actions";
import { initialTripState } from "@/lib/trip-rules";

/**
 * Staff sign-in.
 *
 * One error message for every kind of failure — unknown address, wrong
 * password, deactivated account — because distinguishing them would turn this
 * form into a way to find out who works here.
 *
 * `autoComplete="current-password"` so a password manager fills it; nothing
 * about this form asks anyone to type a credential by hand more often than
 * necessary.
 */
export function OpsSignInForm() {
  const [state, action, pending] = useActionState(signInAction, initialTripState);
  const id = useId();

  return (
    <form action={action} className="space-y-4">
      <div>
        <label htmlFor={`${id}-email`} className="block text-[0.85rem] text-ink">
          Email
        </label>
        <input
          id={`${id}-email`}
          name="email"
          type="email"
          required
          autoComplete="username"
          autoFocus
          className="mt-1.5 min-h-11 w-full rounded-sm border border-line bg-ivory px-3.5 py-2.5 text-[0.92rem] text-ink outline-none transition-colors focus:border-forest"
        />
      </div>

      <div>
        <label htmlFor={`${id}-password`} className="block text-[0.85rem] text-ink">
          Password
        </label>
        <input
          id={`${id}-password`}
          name="password"
          type="password"
          required
          autoComplete="current-password"
          aria-describedby={state.formError ? `${id}-error` : undefined}
          aria-invalid={state.formError ? true : undefined}
          className="mt-1.5 min-h-11 w-full rounded-sm border border-line bg-ivory px-3.5 py-2.5 text-[0.92rem] text-ink outline-none transition-colors focus:border-forest"
        />
      </div>

      {state.formError ? (
        <p
          id={`${id}-error`}
          role="alert"
          className="rounded-sm border border-gold/40 bg-sand/15 px-3.5 py-2.5 text-[0.85rem] leading-relaxed text-ink"
        >
          {state.formError}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="min-h-11 w-full rounded-sm bg-forest px-6 py-3 text-[0.9rem] font-medium tracking-wide text-ivory transition-colors hover:bg-forest-soft disabled:opacity-55"
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>

      <p className="text-[0.78rem] leading-relaxed text-muted">
        Accounts are created by an administrator with{" "}
        <code className="text-ink">npm run staff:create</code>. There is no self-service
        password reset.
      </p>
    </form>
  );
}
