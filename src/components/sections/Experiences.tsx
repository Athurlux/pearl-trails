import Image from "next/image";
import { experiences } from "@/data/experiences";
import { Reveal } from "@/components/ui/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";

export function Experiences() {
  return (
    <section id="experiences" className="scroll-mt-20 bg-forest py-20 lg:py-28">
      <div className="mx-auto max-w-[1400px] px-5 sm:px-8 lg:px-12">
        <SectionHeading
          tone="dark"
          eyebrow="Experiences"
          title="The reason you came."
          intro="Booked alongside your stay, run by guides who live where they work."
        />

        {/*
          A rail rather than another grid: it breaks the vertical rhythm and it is
          honestly how you scan experiences. Edge-to-edge on small screens.
        */}
        <Reveal className="mt-12 lg:mt-16">
          <ul
            // scroll-px matches the inline padding: without it, snap-start aligns
            // the first card to the padding box and the rail scrolls itself flush
            // against the viewport edge on load.
            className="-mx-5 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-px-5 px-5 pb-4 sm:-mx-8 sm:scroll-px-8 sm:px-8 lg:-mx-12 lg:scroll-px-12 lg:px-12"
            style={{ scrollbarWidth: "thin" }}
          >
            {experiences.map((experience, i) => (
              <li
                key={experience.slug}
                className="group w-[76vw] shrink-0 snap-start sm:w-[46vw] lg:w-[clamp(260px,24vw,340px)]"
              >
                <div className="relative aspect-[3/4] overflow-hidden rounded-sm bg-forest-deep">
                  <Image
                    src={experience.image}
                    alt={experience.imageAlt}
                    fill
                    loading={i < 2 ? "eager" : "lazy"}
                    sizes="(max-width: 640px) 76vw, (max-width: 1024px) 46vw, 340px"
                    className="object-cover transition-transform duration-[1200ms] ease-out group-hover:scale-[1.05]"
                  />
                  <div
                    aria-hidden="true"
                    className="absolute inset-0 bg-gradient-to-t from-forest-deep/85 via-transparent to-transparent"
                  />
                  <div className="absolute inset-x-0 bottom-0 p-5">
                    <h3 className="text-[1.25rem] text-ivory">{experience.name}</h3>
                    <p className="mt-1 text-[0.85rem] text-ivory/70">
                      {experience.destination} · {experience.duration}
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </Reveal>

        <Reveal className="mt-8">
          <p className="text-[0.85rem] text-ivory/55">Scroll for more experiences &rarr;</p>
        </Reveal>
      </div>
    </section>
  );
}
