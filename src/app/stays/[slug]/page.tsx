import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { PropertyGallery } from "@/components/property/PropertyGallery";
import { ShareButton } from "@/components/property/ShareButton";
import { TripPlanner } from "@/components/property/TripPlanner";
import { SaveButton } from "@/components/stays/SaveButton";
import { StayResultCard } from "@/components/stays/StayResultCard";
import { formatUgx } from "@/lib/format";
import { STAY_TYPE_LABELS } from "@/lib/stay-types";
import { findRelatedStays, getPropertyDetail } from "@/lib/stays-query";
import {
  buildTripQuery,
  estimateStay,
  parseTripContext,
  stayHref,
} from "@/lib/trip-params";

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const stay = await getPropertyDetail(slug);
  if (!stay) return { title: "Stay not found", robots: { index: false, follow: false } };

  const title = `${stay.name} in ${stay.destination.name}`;
  return {
    title,
    description: stay.shortDescription,
    alternates: { canonical: `/stays/${stay.slug}` },
    openGraph: {
      title: `${title} · Pearl Trails`,
      description: stay.shortDescription,
      url: `/stays/${stay.slug}`,
      images: [{ url: stay.image, alt: stay.imageAlt }],
    },
  };
}

/**
 * The property page.
 *
 * A Server Component that renders everything except four islands: the gallery
 * lightbox, the trip planner, the save toggle and share. No structured data is
 * emitted — these are invented properties, and `LodgingBusiness` markup for
 * them would be publishing false facts.
 */
export default async function PropertyPage({ params, searchParams }: Props) {
  const [{ slug }, raw] = await Promise.all([params, searchParams]);
  const stay = await getPropertyDetail(slug);
  if (!stay) notFound();

  const trip = parseTripContext(raw);
  const related = await findRelatedStays(
    stay.id,
    stay.destination.slug,
    stay.stayType,
    3,
  );

  const gallery = [{ url: stay.image, alt: stay.imageAlt }, ...stay.gallery];
  const selectedOption = stay.options.find((o) => o.slug === trip.option) ?? null;
  const estimate = estimateStay(
    selectedOption?.priceFromUgx ?? stay.priceFromUgx,
    trip.checkIn,
    trip.checkOut,
  );

  const plannerOptions = stay.options.map((o) => ({
    slug: o.slug,
    name: o.name,
    guestCapacity: o.guestCapacity,
    priceFromUgx: o.priceFromUgx,
    bedDescription: o.bedDescription,
  }));

  const policies = [
    { label: "Check in", value: `From ${stay.checkInTime}` },
    { label: "Check out", value: `By ${stay.checkOutTime}` },
    { label: "Children", value: stay.childrenNote },
    { label: "Meals", value: stay.mealsNote },
    { label: "Pets", value: stay.petsNote },
    { label: "Smoking", value: stay.smokingNote },
    { label: "Accessibility", value: stay.accessibilityNote },
  ].filter((p): p is { label: string; value: string } => Boolean(p.value));

  return (
    <>
      {/* Solid: this page starts on ivory, where the reversed logo is invisible. */}
      <Header variant="solid" />
      {/* Padding for the mobile action bar so the footer is never trapped under it. */}
      <main id="main" className="pb-24 lg:pb-0">
        <div className="mx-auto max-w-[1400px] px-5 pt-24 sm:px-8 lg:px-12 lg:pt-28">
          <nav aria-label="Breadcrumb" className="pb-5">
            <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.8rem] text-muted">
              <li>
                <Link href="/" className="transition-colors hover:text-forest">
                  Home
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li>
                <Link href="/stays" className="transition-colors hover:text-forest">
                  Stays
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li>
                <Link
                  href={`/stays?destination=${stay.destination.slug}`}
                  className="transition-colors hover:text-forest"
                >
                  {stay.destination.name}
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li aria-current="page" className="text-ink/70">
                {stay.name}
              </li>
            </ol>
          </nav>

          <header className="pb-7">
            <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
              <div className="max-w-2xl">
                <p className="eyebrow text-gold">
                  {STAY_TYPE_LABELS[stay.stayType]} · {stay.destination.region}
                </p>
                <h1 className="mt-3 text-[clamp(2rem,4.4vw,3.4rem)] leading-[1.04] text-forest">
                  {stay.name}
                </h1>
                <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[0.95rem] text-muted">
                  <span className="flex items-center gap-1.5">
                    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 fill-gold">
                      <path d="m12 2.6 2.9 5.9 6.5.9-4.7 4.6 1.1 6.4-5.8-3-5.8 3 1.1-6.4L2.6 9.4l6.5-.9z" />
                    </svg>
                    <span className="tabular-nums text-ink">{stay.rating.toFixed(1)}</span>
                    <span className="sr-only">out of 5 from</span>
                    <span>{stay.reviewCount} guest ratings</span>
                  </span>
                  <Link
                    href={`/stays?destination=${stay.destination.slug}`}
                    className="underline underline-offset-4 transition-colors hover:text-forest"
                  >
                    {stay.destination.name}
                  </Link>
                  <span>Sleeps up to {stay.maxGuests}</span>
                </p>
              </div>

              <div className="relative flex items-center gap-3">
                <ShareButton name={stay.name} summary={stay.shortDescription} />
                <span className="relative inline-flex h-10 w-10">
                  <SaveButton slug={stay.slug} name={stay.name} />
                </span>
              </div>
            </div>
          </header>

          <PropertyGallery images={gallery} name={stay.name} />
        </div>

        <div className="mx-auto max-w-[1400px] px-5 py-12 sm:px-8 lg:px-12 lg:py-16">
          <div className="lg:grid lg:grid-cols-[1fr_380px] lg:gap-14 xl:gap-20">
            <div className="min-w-0">
              <section aria-labelledby="overview">
                <h2 id="overview" className="sr-only">
                  About this stay
                </h2>
                <p className="text-[1.15rem] leading-relaxed text-forest">
                  {stay.shortDescription}
                </p>
                <p className="mt-5 text-[1.02rem] leading-relaxed text-ink/80">
                  {stay.description}
                </p>
              </section>

              {stay.highlights.length > 0 ? (
                <section aria-labelledby="highlights" className="mt-12 border-t border-line pt-10">
                  <h2 id="highlights" className="eyebrow text-gold">
                    Highlights
                  </h2>
                  <ul className="mt-5 grid gap-x-8 gap-y-3 sm:grid-cols-2">
                    {stay.highlights.map((h) => (
                      <li key={h} className="flex items-start gap-3 text-[0.98rem] text-ink/85">
                        <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" strokeWidth="1.8" className="mt-0.5 h-4 w-4 shrink-0 stroke-gold">
                          <path d="m4 12.5 5 5L20 6.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        {h}
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}

              {stay.amenities.length > 0 ? (
                <section aria-labelledby="amenities" className="mt-12 border-t border-line pt-10">
                  <h2 id="amenities" className="text-[1.5rem] text-forest">
                    Amenities
                  </h2>
                  <ul className="mt-5 grid gap-x-8 gap-y-3 sm:grid-cols-2">
                    {stay.amenities.slice(0, 6).map((a) => (
                      <li key={a.slug} className="flex items-center gap-3 text-[0.98rem] text-ink/85">
                        <AmenityIcon slug={a.slug} />
                        {a.name}
                      </li>
                    ))}
                  </ul>
                  {stay.amenities.length > 6 ? (
                    // <details> keeps this working with no JavaScript at all.
                    <details className="mt-4 group">
                      <summary className="cursor-pointer list-none text-[0.9rem] text-gold underline underline-offset-4 transition-colors hover:text-forest">
                        Show all {stay.amenities.length} amenities
                      </summary>
                      <ul className="mt-4 grid gap-x-8 gap-y-3 sm:grid-cols-2">
                        {stay.amenities.slice(6).map((a) => (
                          <li key={a.slug} className="flex items-center gap-3 text-[0.98rem] text-ink/85">
                            <AmenityIcon slug={a.slug} />
                            {a.name}
                          </li>
                        ))}
                      </ul>
                    </details>
                  ) : null}
                </section>
              ) : null}

              {stay.options.length > 0 ? (
                <section aria-labelledby="options" className="mt-12 border-t border-line pt-10">
                  <h2 id="options" className="text-[1.5rem] text-forest">
                    Ways to stay
                  </h2>
                  <p className="mt-2 max-w-xl text-[0.95rem] text-muted">
                    {stay.options.length === 1
                      ? "One way to stay at this property."
                      : `${stay.options.length} ways to stay. Choose one now or decide later.`}
                  </p>

                  <ul className="mt-7 space-y-5">
                    {stay.options.map((option) => {
                      const active = option.slug === trip.option;
                      const tooSmall =
                        trip.guests !== null && trip.guests > option.guestCapacity;
                      return (
                        <li
                          key={option.id}
                          className={[
                            "overflow-hidden rounded-sm border transition-colors sm:flex",
                            active ? "border-forest bg-ivory-warm/40" : "border-line bg-ivory",
                          ].join(" ")}
                        >
                          <div className="relative aspect-[4/3] sm:aspect-auto sm:w-56 sm:shrink-0">
                            <Image
                              src={option.image}
                              alt={option.imageAlt}
                              fill
                              loading="lazy"
                              sizes="(max-width: 640px) 100vw, 224px"
                              className="object-cover"
                            />
                          </div>

                          <div className="flex flex-1 flex-col p-5 sm:p-6">
                            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                              <h3 className="text-[1.15rem] text-forest">{option.name}</h3>
                              <p className="text-[0.92rem] text-ink">
                                <span className="text-muted">From </span>
                                <span className="font-medium tabular-nums">
                                  {formatUgx(option.priceFromUgx)}
                                </span>
                                <span className="text-muted"> / night</span>
                              </p>
                            </div>

                            <p className="mt-2 text-[0.93rem] leading-snug text-ink/75">
                              {option.shortDescription}
                            </p>

                            <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[0.85rem] text-muted">
                              <span>Up to {option.guestCapacity} guests</span>
                              <span>{option.bedDescription}</span>
                              {option.sizeSqm ? <span>{option.sizeSqm} m²</span> : null}
                            </p>

                            {option.features.length > 0 ? (
                              <p className="mt-2 text-[0.85rem] text-muted">
                                {option.features.join(" · ")}
                              </p>
                            ) : null}

                            <div className="mt-5 flex flex-wrap items-center gap-3">
                              <Link
                                href={stayHref(stay.slug, {
                                  ...trip,
                                  option: active ? null : option.slug,
                                })}
                                scroll={false}
                                aria-pressed={active}
                                className={[
                                  "rounded-sm px-5 py-2.5 text-[0.85rem] font-medium tracking-wide transition-colors",
                                  active
                                    ? "border border-forest text-forest hover:bg-ivory-warm"
                                    : "bg-forest text-ivory hover:bg-forest-soft",
                                ].join(" ")}
                              >
                                {active ? "Selected" : "Choose this stay"}
                              </Link>
                              {tooSmall ? (
                                <span className="text-[0.82rem] text-ink/70">
                                  Sleeps {option.guestCapacity} — fewer than your{" "}
                                  {trip.guests} guests.
                                </span>
                              ) : null}
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              ) : null}

              {stay.experiences.length > 0 ? (
                <section aria-labelledby="experiences" className="mt-12 border-t border-line pt-10">
                  <h2 id="experiences" className="text-[1.5rem] text-forest">
                    Experiences from here
                  </h2>
                  <p className="mt-2 max-w-xl text-[0.95rem] text-muted">
                    Arranged with your stay. Nothing is reserved until you ask us to.
                  </p>

                  <ul className="-mx-5 mt-7 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-px-5 px-5 pb-3 sm:-mx-8 sm:scroll-px-8 sm:px-8 lg:mx-0 lg:grid lg:grid-cols-2 lg:px-0 lg:pb-0">
                    {stay.experiences.map((exp) => (
                      <li
                        key={exp.slug}
                        className="w-[76vw] shrink-0 snap-start sm:w-[46vw] lg:w-auto"
                      >
                        <article className="h-full overflow-hidden rounded-sm border border-line bg-ivory">
                          <div className="relative aspect-[16/10]">
                            <Image
                              src={exp.image}
                              alt={exp.imageAlt}
                              fill
                              loading="lazy"
                              sizes="(max-width: 1024px) 76vw, 320px"
                              className="object-cover"
                            />
                            <span className="absolute left-3 top-3 rounded-sm bg-forest-deep/75 px-2.5 py-1 text-[0.7rem] tracking-wide text-ivory backdrop-blur-sm">
                              {exp.category}
                            </span>
                          </div>
                          <div className="p-5">
                            <h3 className="text-[1.05rem] text-forest">{exp.name}</h3>
                            <p className="mt-1.5 text-[0.9rem] leading-snug text-ink/75">
                              {exp.shortDescription}
                            </p>
                            <p className="mt-3 flex flex-wrap items-baseline gap-x-3 text-[0.85rem] text-muted">
                              <span>{exp.duration}</span>
                              {exp.priceFromUgx ? (
                                <span className="tabular-nums">
                                  From {formatUgx(exp.priceFromUgx)}
                                </span>
                              ) : null}
                            </p>
                          </div>
                        </article>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}

              <section aria-labelledby="location" className="mt-12 border-t border-line pt-10">
                <h2 id="location" className="text-[1.5rem] text-forest">
                  Where you will be
                </h2>
                <p className="mt-1.5 text-[0.9rem] text-muted">
                  {stay.destination.name} · {stay.destination.region}
                </p>

                {stay.locationNote ? (
                  <p className="mt-5 text-[1rem] leading-relaxed text-ink/80">
                    {stay.locationNote}
                  </p>
                ) : null}
                <p className="mt-4 text-[0.98rem] leading-relaxed text-muted">
                  {stay.destination.blurb}
                </p>

                {stay.gettingThere ? (
                  <div className="mt-6 rounded-sm border border-line bg-ivory-warm/50 p-5">
                    <h3 className="eyebrow text-gold">Getting there</h3>
                    <p className="mt-2 text-[0.95rem] leading-relaxed text-ink/80">
                      {stay.gettingThere}
                    </p>
                  </div>
                ) : null}

                {stay.latitude !== null && stay.longitude !== null ? (
                  // Coordinates rather than a map: an embedded provider would be a
                  // third-party dependency and an API key for one small block.
                  <p className="mt-4 text-[0.82rem] tabular-nums text-muted">
                    Approximate position {stay.latitude.toFixed(3)},{" "}
                    {stay.longitude.toFixed(3)}
                  </p>
                ) : null}

                <Link
                  href={`/stays?destination=${stay.destination.slug}`}
                  className="mt-6 inline-flex items-center gap-2 border-b border-forest/25 pb-1 text-sm tracking-wide text-forest transition-colors hover:border-forest"
                >
                  All stays in {stay.destination.name}
                  <span aria-hidden="true">&rarr;</span>
                </Link>
              </section>

              {policies.length > 0 ? (
                <section aria-labelledby="policies" className="mt-12 border-t border-line pt-10">
                  <h2 id="policies" className="text-[1.5rem] text-forest">
                    Good to know
                  </h2>
                  <dl className="mt-6 grid gap-x-10 gap-y-5 sm:grid-cols-2">
                    {policies.map((p) => (
                      <div key={p.label}>
                        <dt className="eyebrow text-muted">{p.label}</dt>
                        <dd className="mt-1.5 text-[0.95rem] leading-relaxed text-ink/80">
                          {p.value}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </section>
              ) : null}

              {stay.ratingBreakdown.length > 0 ? (
                <section aria-labelledby="ratings" className="mt-12 border-t border-line pt-10">
                  <h2 id="ratings" className="text-[1.5rem] text-forest">
                    Guest ratings
                  </h2>
                  <div className="mt-6 flex flex-wrap items-center gap-x-10 gap-y-6">
                    <div>
                      <p className="text-[2.6rem] leading-none tabular-nums text-forest">
                        {stay.rating.toFixed(1)}
                      </p>
                      <p className="mt-1 text-[0.85rem] text-muted">
                        {stay.reviewCount} ratings
                      </p>
                    </div>
                    <dl className="grid flex-1 gap-x-10 gap-y-3 sm:grid-cols-2">
                      {stay.ratingBreakdown.map((r) => (
                        <div key={r.label} className="flex items-center gap-3">
                          <dt className="w-24 shrink-0 text-[0.88rem] text-muted">
                            {r.label}
                          </dt>
                          <dd className="flex flex-1 items-center gap-3">
                            <span
                              aria-hidden="true"
                              className="h-1 flex-1 overflow-hidden rounded-full bg-line"
                            >
                              <span
                                className="block h-full rounded-full bg-gold"
                                style={{ width: `${(r.value / 5) * 100}%` }}
                              />
                            </span>
                            <span className="w-7 shrink-0 text-right text-[0.85rem] tabular-nums text-ink">
                              {r.value.toFixed(1)}
                            </span>
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                  <p className="mt-6 text-[0.8rem] leading-relaxed text-muted">
                    Ratings shown are illustrative demo values for this preview, not
                    collected guest reviews.
                  </p>
                </section>
              ) : null}
            </div>

            <aside className="hidden lg:block">
              <div className="sticky top-24">
                <TripPlanner
                  staySlug={stay.slug}
                  fromPriceUgx={stay.priceFromUgx}
                  maxGuests={stay.maxGuests}
                  options={plannerOptions}
                />
              </div>
            </aside>
          </div>
        </div>

        {related.length > 0 ? (
          <section className="border-t border-line bg-ivory-warm/50 py-14 lg:py-20">
            <div className="mx-auto max-w-[1400px] px-5 sm:px-8 lg:px-12">
              <h2 className="text-[1.6rem] text-forest">More stays nearby</h2>
              <p className="mt-2 text-[0.95rem] text-muted">
                Other places we would send you in and around {stay.destination.name}.
              </p>
              <div className="mt-9 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
                {related.map((r, i) => (
                  <StayResultCard key={r.id} stay={r} index={i} />
                ))}
              </div>
            </div>
          </section>
        ) : null}

        <section className="bg-forest py-14 lg:py-20">
          <div className="mx-auto flex max-w-[1400px] flex-col items-start justify-between gap-6 px-5 sm:px-8 lg:flex-row lg:items-center lg:px-12">
            <div>
              <h2 className="text-[clamp(1.6rem,2.8vw,2.2rem)] leading-tight text-ivory">
                Ready to plan {stay.name}?
              </h2>
              <p className="mt-2 text-[0.98rem] text-ivory/75">
                {estimate.complete
                  ? `${estimate.nights} ${estimate.nights === 1 ? "night" : "nights"} · estimated ${formatUgx(estimate.subtotalUgx)}`
                  : "Add your dates and we will carry them through."}
              </p>
            </div>
            <Link
              href={`/book/${stay.slug}${buildTripQuery(trip)}`}
              className="shrink-0 rounded-sm bg-ivory px-8 py-4 text-sm font-medium tracking-wide text-forest transition-colors hover:bg-white"
            >
              Continue to booking
            </Link>
          </div>
        </section>
      </main>

      <TripPlanner
        staySlug={stay.slug}
        fromPriceUgx={stay.priceFromUgx}
        maxGuests={stay.maxGuests}
        options={plannerOptions}
        variant="bar"
      />

      <Footer />
    </>
  );
}

/**
 * A small, consistent icon set drawn inline. One family, one stroke weight —
 * and no emoji, which never look like product UI.
 */
function AmenityIcon({ slug }: { slug: string }) {
  const paths: Record<string, React.ReactNode> = {
    wifi: <><path d="M2 8.5a16 16 0 0 1 20 0" /><path d="M5.5 12.5a11 11 0 0 1 13 0" /><path d="M9 16.5a6 6 0 0 1 6 0" /><path d="M12 20h.01" /></>,
    restaurant: <><path d="M6 3v8a2 2 0 0 0 4 0V3M8 11v10" /><path d="M17 3c-1.5 1.5-2 3.5-2 6 0 1.5.7 2.5 2 3v9" /></>,
    "private-bathroom": <><path d="M4 12h16v3a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4z" /><path d="M7 12V6a2 2 0 0 1 4 0" /></>,
    parking: <><rect x="3" y="3" width="18" height="18" rx="3" /><path d="M9.5 17V8h3a3 3 0 0 1 0 6h-3" /></>,
    campfire: <><path d="M12 21c-3 0-5-2-5-4.5S9 12 12 3c3 9 5 11 5 13.5S15 21 12 21z" /></>,
    "lake-view": <><path d="M3 15c2-2 4-2 6 0s4 2 6 0 4-2 6 0" /><path d="M3 19c2-2 4-2 6 0s4 2 6 0 4-2 6 0" /><circle cx="17" cy="6" r="2.5" /></>,
    "forest-view": <><path d="M12 3 6 13h12z" /><path d="M12 8 7 17h10z" /><path d="M12 17v4" /></>,
    pool: <><path d="M3 16c2-1.5 4-1.5 6 0s4 1.5 6 0 4-1.5 6 0" /><path d="M3 20c2-1.5 4-1.5 6 0s4 1.5 6 0 4-1.5 6 0" /><path d="M7 12V5a2 2 0 0 1 4 0M13 12V5a2 2 0 0 1 4 0" /></>,
    "guided-activities": <><path d="m12 3 8 16H4z" /><path d="M12 3v16" /></>,
    "family-friendly": <><circle cx="8" cy="7" r="2.5" /><circle cx="16" cy="8" r="2" /><path d="M4 20v-3a4 4 0 0 1 8 0v3M14 20v-2.5a3 3 0 0 1 6 0V20" /></>,
    breakfast: <><path d="M4 10h12v4a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5z" /><path d="M16 11h2a2.5 2.5 0 0 1 0 5h-2" /><path d="M7 3v3M11 3v3" /></>,
    "airport-transfer": <><path d="M2 12h20" /><path d="m10 4 6 8-6 8-1-4 3-4-3-4z" /></>,
  };

  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      fill="none"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-[18px] w-[18px] shrink-0 stroke-forest/70"
    >
      {paths[slug] ?? <circle cx="12" cy="12" r="8" />}
    </svg>
  );
}
