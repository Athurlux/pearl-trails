import { Reveal } from "@/components/ui/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";

const pillars = [
  {
    title: "Uganda, not everywhere",
    body: "We only list stays in Uganda. That narrowness is the product — we know the roads, the seasons and which lodge is worth the extra two hours.",
  },
  {
    title: "Places we have stood in",
    body: "Every property is chosen for where it sits and how it treats the land and the people around it. Nothing is listed because it paid to be.",
  },
  {
    title: "Prices in shillings",
    body: "Rates are shown in UGX, the currency the lodge actually charges in. No conversion surprises at the end of the booking.",
  },
  {
    title: "One trip, arranged",
    body: "Stays and experiences sit in the same place, so a gorilla permit and the bed you sleep in afterwards are not two separate problems.",
  },
];

export function WhyPearlTrails() {
  return (
    <section id="about" className="scroll-mt-20 bg-ivory py-20 lg:py-28">
      <div className="mx-auto max-w-[1400px] px-5 sm:px-8 lg:px-12">
        <SectionHeading
          eyebrow="Why Pearl Trails"
          title="Fewer listings. Better ones."
        />

        <div className="mt-12 grid gap-x-10 gap-y-12 sm:grid-cols-2 lg:mt-16 lg:grid-cols-4">
          {pillars.map((pillar, i) => (
            <Reveal as="article" key={pillar.title} delay={i * 90}>
              <span
                aria-hidden="true"
                className="block text-[0.75rem] tabular-nums tracking-[0.14em] text-gold"
              >
                {String(i + 1).padStart(2, "0")}
              </span>
              <div className="rule-gold mt-4" />
              <h3 className="mt-5 text-[1.25rem] leading-snug text-forest">
                {pillar.title}
              </h3>
              <p className="mt-3 text-[0.95rem] leading-relaxed text-muted">
                {pillar.body}
              </p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
