import Link from "next/link";
import { BookingFilters } from "@/components/ops/BookingFilters";
import { BOOKING_STATUSES, BOOKING_STATUS_LABELS, type BookingStatus } from "@/lib/booking-status";
import { formatUgx } from "@/lib/format";
import { listBookings, listStaysWithBookings } from "@/lib/ops-query";
import { requireStaff } from "@/lib/staff-auth";
import { OPS_PAGE_SIZE } from "@/lib/staff-vocab";
import { formatDateRange, parseIsoDate } from "@/lib/trip-params";

/**
 * The bookings table.
 *
 * All state lives in the URL, as it does on Explore — a filtered view is a link
 * someone can send a colleague, and the back button behaves.
 *
 * Every filter is applied in Postgres and one page of rows is fetched. Nothing
 * here loads the booking table to count or sort it in the browser.
 */

export const metadata = { title: "Bookings" };

interface Props {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function one(raw: Record<string, string | string[] | undefined>, key: string) {
  const value = raw[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export default async function OpsBookingsPage({ searchParams }: Props) {
  await requireStaff();
  const raw = await searchParams;

  // Whitelisted, exactly as `stays-params.ts` does for the public catalogue —
  // never read straight into a query.
  const statusRaw = one(raw, "status");
  const status =
    statusRaw && (BOOKING_STATUSES as readonly string[]).includes(statusRaw)
      ? (statusRaw as BookingStatus)
      : null;

  const pageRaw = one(raw, "page");
  const page = pageRaw && /^\d{1,4}$/.test(pageRaw) ? Number(pageRaw) : 1;

  const query = one(raw, "q");
  const filters = {
    status,
    staySlug: one(raw, "stay"),
    // Bounded: a search box is not a place to accept arbitrary length.
    query: query ? query.slice(0, 120) : null,
    checkInFrom: parseIsoDate(one(raw, "from")),
    checkInTo: parseIsoDate(one(raw, "to")),
    page,
  };

  const [result, stays] = await Promise.all([
    listBookings(filters),
    listStaysWithBookings(),
  ]);

  const from = result.total === 0 ? 0 : (result.page - 1) * OPS_PAGE_SIZE + 1;
  const to = Math.min(result.page * OPS_PAGE_SIZE, result.total);

  return (
    <main id="main" className="mx-auto max-w-[1200px] px-5 py-10 sm:px-8">
      <h1 className="text-[1.6rem] text-forest">Bookings</h1>
      <p className="mt-1.5 text-[0.9rem] text-muted">
        {result.total === 0
          ? "No bookings match these filters."
          : `${from}–${to} of ${result.total}`}
      </p>

      <div className="mt-6">
        <BookingFilters stays={stays} />
      </div>

      {result.rows.length === 0 ? (
        <p className="mt-10 text-[0.92rem] text-muted">
          Nothing to show. Clear a filter, or wait for the next request.
        </p>
      ) : (
        <>
          {/*
            One overflow container, not a page that scrolls sideways. On a phone
            the table scrolls within its own box while the rest of the page
            stays put — a wide table is legitimately wide, and pretending
            otherwise by truncating columns loses the reference someone came for.
          */}
          <div className="mt-6 overflow-x-auto rounded-sm border border-line">
            <table className="w-full min-w-[52rem] border-collapse text-left">
              <caption className="sr-only">
                Bookings, newest request first. Select a reference to open it.
              </caption>
              <thead>
                <tr className="border-b border-line bg-ivory-warm/50">
                  <Th>Reference</Th>
                  <Th>Traveller</Th>
                  <Th>Property</Th>
                  <Th>Dates</Th>
                  <Th numeric>Guests</Th>
                  <Th numeric>Estimate</Th>
                  <Th>Status</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {result.rows.map((row) => (
                  <tr key={row.reference} className="transition-colors hover:bg-ivory-warm/40">
                    <td className="px-3 py-3">
                      <Link
                        href={`/ops/bookings/${row.reference}`}
                        className="text-[0.87rem] tabular-nums tracking-wide text-forest underline decoration-line underline-offset-4 hover:decoration-forest"
                      >
                        {row.reference}
                      </Link>
                    </td>
                    <td className="px-3 py-3 text-[0.87rem] text-ink">{row.guestName}</td>
                    <td className="px-3 py-3 text-[0.85rem] text-muted">
                      {row.stayName}
                      <span className="block text-[0.78rem] text-muted/80">
                        {row.optionName}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-[0.84rem] tabular-nums text-muted">
                      {formatDateRange(row.checkIn, row.checkOut)}
                    </td>
                    <td className="px-3 py-3 text-right text-[0.85rem] tabular-nums text-muted">
                      {row.guests}
                    </td>
                    <td className="px-3 py-3 text-right text-[0.85rem] tabular-nums text-ink">
                      {formatUgx(row.estimatedTotalUgx)}
                    </td>
                    <td className="px-3 py-3">
                      <StatusChip status={row.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {result.pageCount > 1 ? (
            <nav
              aria-label="Pages"
              className="mt-6 flex items-center justify-between gap-4"
            >
              <PageLink
                raw={raw}
                page={result.page - 1}
                disabled={result.page <= 1}
                label="← Previous"
              />
              <p className="text-[0.84rem] text-muted">
                Page {result.page} of {result.pageCount}
              </p>
              <PageLink
                raw={raw}
                page={result.page + 1}
                disabled={result.page >= result.pageCount}
                label="Next →"
              />
            </nav>
          ) : null}
        </>
      )}
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

/**
 * Status as a labelled chip.
 *
 * The colour is a second signal, never the only one — the word is always there,
 * so this reads the same to someone who cannot distinguish the two greens.
 */
function StatusChip({ status }: { status: BookingStatus }) {
  const tone =
    status === "confirmed"
      ? "border-forest/35 bg-forest/10 text-forest"
      : status === "pending"
        ? "border-gold/45 bg-sand/20 text-gold"
        : "border-line bg-ivory-warm text-muted";

  return (
    <span
      className={`inline-block whitespace-nowrap rounded-full border px-2.5 py-0.5 text-[0.75rem] ${tone}`}
    >
      {BOOKING_STATUS_LABELS[status]}
    </span>
  );
}

/** Paging that preserves every active filter. */
function PageLink({
  raw,
  page,
  disabled,
  label,
}: {
  raw: Record<string, string | string[] | undefined>;
  page: number;
  disabled: boolean;
  label: string;
}) {
  if (disabled) {
    return <span className="text-[0.86rem] text-muted/50">{label}</span>;
  }

  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(raw)) {
    if (typeof value === "string" && value && key !== "page") params.set(key, value);
  }
  params.set("page", String(page));

  return (
    <Link
      href={`/ops/bookings?${params.toString()}`}
      className="text-[0.86rem] text-forest underline decoration-line underline-offset-4 hover:decoration-forest"
    >
      {label}
    </Link>
  );
}
