"use client";

import { useState } from "react";
import { signOutAction } from "@/app/ops/actions";

/**
 * Sign out.
 *
 * A form posting to a Server Action rather than a link, because signing out is
 * a state change: a `GET` that ends a session can be triggered by a prefetch,
 * an image tag on another site, or a link scanner in an email client.
 */
export function OpsSignOut() {
  const [pending, setPending] = useState(false);

  return (
    <form action={signOutAction} onSubmit={() => setPending(true)}>
      <button
        type="submit"
        disabled={pending}
        className="min-h-9 rounded-sm border border-ivory/25 px-3 py-1.5 text-[0.8rem] text-ivory/85 transition-colors hover:border-ivory/60 hover:text-ivory disabled:opacity-55"
      >
        {pending ? "Signing out…" : "Sign out"}
      </button>
    </form>
  );
}
