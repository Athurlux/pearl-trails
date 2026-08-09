import Link from "next/link";
import { Reveal } from "@/components/ui/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { StayResultCard } from "@/components/stays/StayResultCard";
import type { StayResult } from "@/lib/stays-query";

/**
 * The landing-page showcase now reads the same catalogue as /stays and uses the
 * same card, so a stay cannot look one way here and another way in Explore.
 */
export function FeaturedStays({ stays }: { stays: StayResult[] }) {
  if (stays.length === 0) return null;

  return (
    <section id="stays" className="scroll-mt-20 bg-ivory-warm py-20 lg:py-28">
      <div className="mx-auto max-w-[1400px] px-5 sm:px-8 lg:px-12">
        <SectionHeading
          eyebrow="Exceptional stays"
          title={
            <>
              Places we would
              <br className="hidden sm:block" /> book ourselves.
            </>
          }
          intro="Lodges, camps and cabins chosen for where they sit and how they treat the land around them."
          action={
            <Link
              href="/stays"
              className="inline-flex items-center gap-2 border-b border-forest/25 pb-1 text-sm tracking-wide text-forest transition-colors hover:border-forest"
            >
              Browse all stays
              <span aria-hidden="true">&rarr;</span>
            </Link>
          }
        />

        <Reveal className="mt-12 lg:mt-16">
          <div className="grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
            {stays.map((stay, i) => (
              <StayResultCard key={stay.id} stay={stay} index={i} />
            ))}
          </div>
        </Reveal>

        <p className="mt-10 max-w-2xl text-[0.82rem] leading-relaxed text-muted">
          Pearl Trails is a demonstration release. The properties shown are original
          examples created for this preview, not real businesses, and prices are
          illustrative rather than live rates.
        </p>
      </div>
    </section>
  );
}
