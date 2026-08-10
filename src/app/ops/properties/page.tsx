import Link from "next/link";
import { formatUgx } from "@/lib/format";
import { listStaysForOps } from "@/lib/ops-query";
import { requireStaff } from "@/lib/staff-auth";
import { STAY_VISIBILITY_LABELS, type StayVisibility } from "@/lib/staff-vocab";

/**
 * The catalogue, as operations sees it.
 *
 * Readable by anyone signed in — knowing what is published is part of the daily
 * work. Changing it needs an administrator, and that is enforced in the action,
 * not by hiding the link.
 */

export const metadata = { title: "Properties" };

export default async function OpsPropertiesPage() {
  const staff = await requireStaff();
  const stays = await listStaysForOps();

  const hidden = stays.filter((stay) => stay.visibility !== "published").length;

  return (
    <main id="main" className="mx-auto max-w-[1200px] px-5 py-10 sm:px-8">
      <h1 className="text-[1.6rem] text-forest">Properties</h1>
      <p className="mt-1.5 text-[0.9rem] text-muted">
        {stays.length} in the catalogue
        {hidden > 0 ? `, ${hidden} not currently public` : ", all public"}.
        {staff.role !== "admin"
          ? " Changing prices or visibility needs an administrator account."
          : ""}
      </p>

      <div className="mt-6 overflow-x-auto rounded-sm border border-line">
        <table className="w-full min-w-[46rem] border-collapse text-left">
          <caption className="sr-only">
            Properties with their visibility, inventory and active bookings.
          </caption>
          <thead>
            <tr className="border-b border-line bg-ivory-warm/50">
              <Th>Property</Th>
              <Th>Destination</Th>
              <Th>Visibility</Th>
              <Th numeric>From</Th>
              <Th numeric>Units</Th>
              <Th numeric>Active bookings</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {stays.map((stay) => (
              <tr key={stay.slug} className="transition-colors hover:bg-ivory-warm/40">
                <td className="px-3 py-3">
                  <Link
                    href={`/ops/properties/${stay.slug}`}
                    className="text-[0.89rem] text-forest underline decoration-line underline-offset-4 hover:decoration-forest"
                  >
                    {stay.name}
                  </Link>
                  {stay.featured ? (
                    <span className="ml-2 text-[0.72rem] uppercase tracking-wider text-gold">
                      Featured
                    </span>
                  ) : null}
                </td>
                <td className="px-3 py-3 text-[0.85rem] text-muted">
                  {stay.destinationName}
                </td>
                <td className="px-3 py-3">
                  <VisibilityChip visibility={stay.visibility} />
                </td>
                <td className="px-3 py-3 text-right text-[0.85rem] tabular-nums text-ink">
                  {formatUgx(stay.priceFromUgx)}
                </td>
                <td className="px-3 py-3 text-right text-[0.85rem] tabular-nums text-muted">
                  {stay.totalInventory}
                  <span className="ml-1 text-[0.76rem] text-muted/70">
                    in {stay.optionCount}
                  </span>
                </td>
                <td className="px-3 py-3 text-right text-[0.85rem] tabular-nums text-muted">
                  {stay.activeBookings}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-6 text-[0.79rem] leading-relaxed text-muted">
        Unpublishing a property removes it from search, the landing page, the sitemap and
        its own URL. It does <strong className="text-ink">not</strong> touch existing
        bookings: those keep the property, the accommodation and the price they were made
        at.
      </p>
    </main>
  );
}

function Th({ children, numeric = false }: { children: React.ReactNode; numeric?: boolean }) {
  return (
    <th
      scope="col"
      className={`px-3 py-2.5 text-[0.75rem] uppercase tracking-wider text-muted ${
        numeric ? "text-right" : ""
      }`}
    >
      {children}
    </th>
  );
}

function VisibilityChip({ visibility }: { visibility: StayVisibility }) {
  const tone =
    visibility === "published"
      ? "border-forest/35 bg-forest/10 text-forest"
      : visibility === "draft"
        ? "border-gold/45 bg-sand/20 text-gold"
        : "border-line bg-ivory-warm text-muted";

  return (
    <span className={`inline-block rounded-full border px-2.5 py-0.5 text-[0.75rem] ${tone}`}>
      {STAY_VISIBILITY_LABELS[visibility]}
    </span>
  );
}
