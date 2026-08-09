import { Reveal } from "@/components/ui/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { StaysGrid } from "./StaysGrid";

export function FeaturedStays() {
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
            <a
              href="#destinations"
              className="inline-flex items-center gap-2 border-b border-forest/25 pb-1 text-sm tracking-wide text-forest transition-colors hover:border-forest"
            >
              Browse by destination
              <span aria-hidden="true">&rarr;</span>
            </a>
          }
        />

        <Reveal className="mt-12 lg:mt-16">
          <StaysGrid />
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
