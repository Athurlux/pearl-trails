"use client";

import Link from "next/link";
import { useEffect } from "react";

/**
 * Branded failure state.
 *
 * The user gets a sentence they can act on. The actual error — connection
 * refused, bad credentials, a malformed query — goes to the console for
 * diagnosis and is never rendered, because database errors leak schema and
 * infrastructure detail.
 */
export default function StaysError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[stays] failed to load results", error);
  }, [error]);

  return (
    <main
      id="main"
      className="flex min-h-screen items-center justify-center bg-ivory px-5 py-32"
    >
      <div className="max-w-md text-center">
        <p className="eyebrow text-gold">Something went wrong</p>
        <h1 className="mt-3 text-[clamp(1.8rem,3.4vw,2.6rem)] leading-tight text-forest">
          We could not load stays just now.
        </h1>
        <p className="mt-4 text-[0.98rem] leading-relaxed text-muted">
          This is on us, not on you. Try again in a moment — if it keeps happening the
          catalogue is temporarily unavailable.
        </p>
        {error.digest ? (
          <p className="mt-3 text-[0.78rem] text-muted/70">
            Reference: <span className="tabular-nums">{error.digest}</span>
          </p>
        ) : null}

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={reset}
            className="rounded-sm bg-forest px-6 py-3 text-sm font-medium tracking-wide text-ivory transition-colors hover:bg-forest-soft"
          >
            Try again
          </button>
          <Link
            href="/"
            className="rounded-sm border border-line px-6 py-3 text-sm text-forest transition-colors hover:border-forest"
          >
            Back to Pearl Trails
          </Link>
        </div>
      </div>
    </main>
  );
}
