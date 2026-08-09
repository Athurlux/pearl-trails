"use client";

import { useEffect, useState } from "react";

/**
 * Share via the Web Share API where the browser has it, clipboard where it
 * does not. No dependency, and the result is announced rather than only shown.
 */
export function ShareButton({ name, summary }: { name: string; summary: string }) {
  const [status, setStatus] = useState<"idle" | "copied" | "failed">("idle");

  useEffect(() => {
    if (status === "idle") return;
    const t = setTimeout(() => setStatus("idle"), 2600);
    return () => clearTimeout(t);
  }, [status]);

  const share = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: `${name} · Pearl Trails`, text: summary, url });
        return;
      } catch {
        // The user dismissed the sheet, or the browser refused. Fall through to
        // the clipboard rather than leaving the button feeling broken.
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setStatus("copied");
    } catch {
      setStatus("failed");
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={share}
        className="inline-flex items-center gap-2 rounded-sm border border-line px-3.5 py-2 text-[0.85rem] text-forest transition-colors hover:border-forest"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" strokeWidth="1.6" className="h-4 w-4 stroke-current">
          <path d="M12 15V3m0 0L8.5 6.5M12 3l3.5 3.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M5 12v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6" strokeLinecap="round" />
        </svg>
        Share
      </button>
      <span role="status" aria-live="polite" className="sr-only">
        {status === "copied" ? "Link copied to clipboard" : ""}
        {status === "failed" ? "Could not copy the link" : ""}
      </span>
      {status !== "idle" ? (
        <span aria-hidden="true" className="text-[0.8rem] text-muted">
          {status === "copied" ? "Link copied" : "Copy failed"}
        </span>
      ) : null}
    </>
  );
}
