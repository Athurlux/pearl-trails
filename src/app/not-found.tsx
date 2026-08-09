import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false, follow: false },
};

/**
 * Branded 404. Unknown stay slugs land here rather than on Next's default
 * black page, and it says nothing about why the record was missing.
 */
export default function NotFound() {
  return (
    <main
      id="main"
      className="flex min-h-screen items-center justify-center bg-ivory px-5 py-24"
    >
      <div className="max-w-md text-center">
        <p className="eyebrow text-gold">Not found</p>
        <h1 className="mt-3 text-[clamp(1.9rem,3.6vw,2.8rem)] leading-tight text-forest">
          That page has wandered off.
        </h1>
        <p className="mt-4 text-[0.98rem] leading-relaxed text-muted">
          The stay or page you were looking for is not here. It may have been renamed, or
          the link may be incomplete.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/stays"
            className="rounded-sm bg-forest px-6 py-3 text-sm font-medium tracking-wide text-ivory transition-colors hover:bg-forest-soft"
          >
            Explore stays
          </Link>
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
