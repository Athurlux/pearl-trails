import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { formatUgx } from "@/lib/format";
import { STAY_TYPE_LABELS } from "@/lib/stay-types";
import { findStayBySlug } from "@/lib/stays-query";

/**
 * Release 2 ships the route, not the experience.
 *
 * Stay cards need somewhere real to link to, so this renders genuine database
 * content in the Pearl Trails design and says plainly what is still missing.
 * The full gallery, room types, amenities, map and booking CTA are Release 3 —
 * building half of that now would only have to be undone.
 *
 * No structured data here on purpose: these are invented properties, and
 * emitting LodgingBusiness markup for them would be publishing false facts.
 */

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const stay = await findStayBySlug(slug);
  if (!stay) return { title: "Stay not found" };

  return {
    title: `${stay.name}, ${stay.destinationName}`,
    description: stay.shortDescription,
    alternates: { canonical: `/stays/${stay.slug}` },
    openGraph: {
      title: `${stay.name} · Pearl Trails`,
      description: stay.shortDescription,
      url: `/stays/${stay.slug}`,
      images: [{ url: stay.image, alt: stay.imageAlt }],
    },
  };
}

export default async function StayPage({ params }: Props) {
  const { slug } = await params;
  const stay = await findStayBySlug(slug);
  if (!stay) notFound();

  return (
    <>
      <Header />
      <main id="main">
        <section className="relative isolate min-h-[52svh] overflow-hidden bg-forest-deep pt-24 lg:min-h-[60svh]">
          <Image
            src={stay.image}
            alt={stay.imageAlt}
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-t from-forest-deep/92 via-forest-deep/45 to-forest-deep/25"
          />

          <div className="relative mx-auto flex min-h-[52svh] max-w-[1400px] flex-col justify-end px-5 pb-10 sm:px-8 lg:min-h-[60svh] lg:px-12 lg:pb-14">
            <p className="eyebrow text-sand">
              {stay.destinationName} · {stay.destinationRegion}
            </p>
            <h1 className="mt-3 text-[clamp(2rem,4.6vw,3.6rem)] leading-[1.04] text-ivory">
              {stay.name}
            </h1>
            <p className="mt-4 max-w-xl text-[1.02rem] leading-relaxed text-ivory/85">
              {stay.shortDescription}
            </p>
          </div>
        </section>

        <section className="bg-ivory py-14 lg:py-20">
          <div className="mx-auto max-w-[1400px] px-5 sm:px-8 lg:px-12">
            <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
              <div className="lg:col-span-7">
                <p className="eyebrow text-gold">{STAY_TYPE_LABELS[stay.stayType]}</p>
                <div className="rule-gold mt-4" />
                <p className="mt-6 text-[1.05rem] leading-relaxed text-ink/85">
                  {stay.description}
                </p>

                <dl className="mt-10 grid grid-cols-2 gap-x-8 gap-y-6 border-t border-line pt-8 sm:grid-cols-3">
                  <div>
                    <dt className="eyebrow text-muted">From</dt>
                    <dd className="mt-1.5 text-[1.05rem] tabular-nums text-forest">
                      {formatUgx(stay.priceFromUgx)}
                      <span className="text-[0.85rem] text-muted"> / night</span>
                    </dd>
                  </div>
                  <div>
                    <dt className="eyebrow text-muted">Rating</dt>
                    <dd className="mt-1.5 text-[1.05rem] tabular-nums text-forest">
                      {stay.rating.toFixed(1)}
                      <span className="text-[0.85rem] text-muted">
                        {" "}
                        ({stay.reviewCount})
                      </span>
                    </dd>
                  </div>
                  <div>
                    <dt className="eyebrow text-muted">Sleeps</dt>
                    <dd className="mt-1.5 text-[1.05rem] tabular-nums text-forest">
                      Up to {stay.maxGuests}
                    </dd>
                  </div>
                </dl>
              </div>

              <aside className="lg:col-span-5">
                <div className="rounded-sm border border-line bg-ivory-warm/60 p-7">
                  <p className="eyebrow text-gold">Coming next</p>
                  <h2 className="mt-3 text-[1.4rem] leading-snug text-forest">
                    Full stay details arrive in Release 3.
                  </h2>
                  <p className="mt-4 text-[0.95rem] leading-relaxed text-muted">
                    The photo gallery, room and pitch options, the full amenity list,
                    activities, location and booking are the next milestone. Everything
                    on this page is real data from the Pearl Trails catalogue — there is
                    simply more of it to come.
                  </p>

                  <div className="mt-7 flex flex-col gap-3">
                    <Link
                      href={`/stays?destination=${stay.destinationSlug}`}
                      className="rounded-sm bg-forest px-6 py-3.5 text-center text-sm font-medium tracking-wide text-ivory transition-colors hover:bg-forest-soft"
                    >
                      More stays in {stay.destinationName}
                    </Link>
                    <Link
                      href="/stays"
                      className="rounded-sm border border-line px-6 py-3.5 text-center text-sm text-forest transition-colors hover:border-forest"
                    >
                      Back to all stays
                    </Link>
                  </div>
                </div>

                <p className="mt-6 text-[0.8rem] leading-relaxed text-muted">
                  {stay.name} is an original example created for this preview. It is not
                  a real business and the price shown is illustrative, not a live rate.
                </p>
              </aside>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
