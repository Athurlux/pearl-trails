import type { Metadata } from "next";
import Link from "next/link";
import { OpsSignOut } from "@/components/ops/OpsSignOut";
import { getStaff } from "@/lib/staff-auth";
import { STAFF_ROLE_LABELS } from "@/lib/staff-vocab";

/**
 * The operations shell.
 *
 * Note what this layout does **not** do: it does not authorise. It reads the
 * session only to decide whether to draw a navigation bar, and every page
 * beneath it calls `requireStaff()` for itself.
 *
 * That is deliberate. A layout runs *around* a page, not before it, and
 * treating one as a gate is how a route ends up served to a stranger because
 * the check lived somewhere that renders in parallel with the thing it was
 * supposed to protect. The gate is in the page and in the action.
 */

export const metadata: Metadata = {
  title: { default: "Operations", template: "%s · Pearl Trails Operations" },
  // Internal, behind a session, and holding traveller contact details. Nothing
  // here belongs in an index or a social card.
  robots: { index: false, follow: false, nocache: true },
  openGraph: null,
  twitter: null,
  referrer: "no-referrer",
};

const LINKS = [
  { href: "/ops", label: "Overview" },
  { href: "/ops/bookings", label: "Bookings" },
  { href: "/ops/properties", label: "Properties" },
];

export default async function OpsLayout({ children }: { children: React.ReactNode }) {
  const staff = await getStaff();

  return (
    <div className="min-h-screen bg-ivory">
      {staff ? (
        <header className="border-b border-line bg-forest">
          <div className="mx-auto flex max-w-[1200px] flex-wrap items-center gap-x-8 gap-y-3 px-5 py-3.5 sm:px-8">
            <Link
              href="/ops"
              className="font-display text-[1.05rem] tracking-wide text-ivory"
            >
              Pearl Trails
              <span className="ml-2 text-[0.7rem] uppercase tracking-[0.18em] text-sand">
                Operations
              </span>
            </Link>

            <nav aria-label="Operations" className="flex flex-wrap items-center gap-x-6">
              {LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-[0.88rem] text-ivory/80 transition-colors hover:text-ivory"
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            <div className="ml-auto flex items-center gap-4">
              <p className="text-[0.8rem] text-ivory/70">
                {staff.name}
                <span className="ml-2 text-ivory/45">
                  {STAFF_ROLE_LABELS[staff.role]}
                </span>
              </p>
              <OpsSignOut />
            </div>
          </div>
        </header>
      ) : null}

      {children}
    </div>
  );
}
