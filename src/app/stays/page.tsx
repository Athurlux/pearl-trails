import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { ActiveFilters } from "@/components/stays/ActiveFilters";
import { ExploreHero } from "@/components/stays/ExploreHero";
import { FilterControls } from "@/components/stays/FilterControls";
import { Pagination } from "@/components/stays/Pagination";
import { SortSelect } from "@/components/stays/SortSelect";
import { StayResultCard } from "@/components/stays/StayResultCard";
import { hasActiveFilters, parseStaysParams, staysHref } from "@/lib/stays-params";
import { findStays, listAmenities, listDestinations } from "@/lib/stays-query";

export const metadata: Metadata = {
  title: "Explore Stays in Uganda",
  description:
    "Browse lodges, campsites, eco lodges and lakeside retreats across Bwindi, Murchison Falls, Kidepo Valley, Lake Bunyonyi and more. Filter by destination, type, price and amenities.",
  alternates: { canonical: "/stays" },
  openGraph: {
    title: "Explore Stays in Uganda · Pearl Trails",
    description:
      "Lodges, campsites and distinctive stays across eight Ugandan destinations.",
    url: "/stays",
  },
};

/**
 * Server Component.
 *
 * All three queries run on the server and only the page of results crosses to
 * the browser. The filter rail, sort control and save buttons are the only
 * client islands.
 *
 * Deliberately no `loading.tsx` in this segment. A route-level Suspense
 * fallback here left the whole /stays subtree unhydrated on a cold load —
 * every filter, the sort control and the mobile sheet were dead until a
 * client-side navigation repaired them. The queries are two fast round trips
 * against 22 rows, so a full-page skeleton was buying nothing anyway; filter
 * and sort transitions show their own pending state instead.
 */
export default async function StaysPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  const params = parseStaysParams(raw);

  const [destinations, amenityOptions] = await Promise.all([
    listDestinations(),
    listAmenities(),
  ]);

  // A destination slug that does not exist is dropped rather than used to
  // produce a confusing empty result set for a place we do not list.
  const known = destinations.find((d) => d.slug === params.destination);
  const effective = known ? params : { ...params, destination: null };

  const { results, total, page, pageCount } = await findStays(effective);
  const filtered = hasActiveFilters(effective);

  return (
    <>
      <Header />
      <main id="main">
        <ExploreHero
          params={effective}
          destinations={destinations}
          destinationName={known?.name ?? null}
        />

        <section className="bg-ivory py-10 lg:py-14">
          <div className="mx-auto max-w-[1400px] px-5 sm:px-8 lg:px-12">
            <div className="lg:grid lg:grid-cols-[260px_1fr] lg:gap-12 xl:grid-cols-[280px_1fr]">
              <aside className="lg:sticky lg:top-24 lg:self-start">
                <h2 className="sr-only">Filter stays</h2>
                <FilterControls
                  destinations={destinations}
                  amenities={amenityOptions}
                  total={total}
                />
              </aside>

              <div className="mt-8 lg:mt-0">
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line pb-5">
                  <p
                    aria-live="polite"
                    className="text-[1.05rem] text-forest"
                  >
                    <span className="font-medium tabular-nums">{total}</span>{" "}
                    {total === 1 ? "stay" : "stays"}
                    {known ? <span className="text-muted"> in {known.name}</span> : null}
                  </p>
                  <SortSelect />
                </div>

                {filtered ? (
                  <div className="mt-5">
                    <ActiveFilters
                      params={effective}
                      destinationName={known?.name ?? null}
                    />
                  </div>
                ) : null}

                {results.length > 0 ? (
                  <>
                    <div className="mt-8 grid gap-x-6 gap-y-10 sm:grid-cols-2 xl:grid-cols-3">
                      {results.map((stay, i) => (
                        <StayResultCard key={stay.id} stay={stay} index={i} />
                      ))}
                    </div>
                    <Pagination params={effective} page={page} pageCount={pageCount} />
                  </>
                ) : (
                  <EmptyState params={effective} />
                )}

                <p className="mt-14 max-w-2xl text-[0.8rem] leading-relaxed text-muted">
                  Pearl Trails is a demonstration release. Every property shown is an
                  original example created for this preview, not a real business, and
                  prices are illustrative rather than live rates. Dates are carried with
                  your search but availability is not yet checked.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

function EmptyState({ params }: { params: ReturnType<typeof parseStaysParams> }) {
  return (
    <div className="mt-10 rounded-sm border border-line bg-ivory-warm/60 px-6 py-16 text-center">
      <h3 className="text-[1.5rem] text-forest">No stays match these filters.</h3>
      <p className="mx-auto mt-3 max-w-md text-[0.95rem] leading-relaxed text-muted">
        Try widening the price range, removing an amenity, or looking across all of
        Uganda rather than one destination.
      </p>
      <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
        <Link
          href={staysHref({ checkIn: params.checkIn, checkOut: params.checkOut })}
          scroll={false}
          className="rounded-sm bg-forest px-6 py-3 text-sm font-medium tracking-wide text-ivory transition-colors hover:bg-forest-soft"
        >
          Clear all filters
        </Link>
        {params.destination ? (
          <Link
            href={staysHref(params, { destination: null, page: 1 })}
            scroll={false}
            className="rounded-sm border border-line px-6 py-3 text-sm text-forest transition-colors hover:border-forest"
          >
            Search all of Uganda
          </Link>
        ) : null}
      </div>
    </div>
  );
}
