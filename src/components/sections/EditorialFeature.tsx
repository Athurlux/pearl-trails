import Image from "next/image";
import { Reveal } from "@/components/ui/Reveal";

export function EditorialFeature() {
  return (
    <section className="bg-ivory py-20 lg:py-28">
      <div className="mx-auto max-w-[1400px] px-5 sm:px-8 lg:px-12">
        <div className="grid items-center gap-10 lg:grid-cols-12 lg:gap-16">
          <Reveal className="lg:col-span-7">
            <div className="relative aspect-[4/3] overflow-hidden rounded-sm bg-ivory-warm lg:aspect-[5/4]">
              <Image
                src="/img/editorial-kidepo.jpg"
                alt="An acacia tree silhouetted against a burnt-orange savanna sunset"
                fill
                loading="lazy"
                sizes="(max-width: 1024px) 100vw, 58vw"
                className="object-cover"
              />
            </div>
          </Reveal>

          <Reveal delay={120} className="lg:col-span-5">
            <p className="eyebrow text-gold">Field notes</p>
            <h2 className="mt-3 text-[clamp(1.9rem,3.4vw,3rem)] leading-[1.06] text-forest">
              The park most people
              <br className="hidden sm:block" /> never reach.
            </h2>
            <div className="rule-gold mt-6" />
            <p className="mt-6 text-[1.02rem] leading-relaxed text-ink/80">
              Kidepo Valley sits in the far northeast, closer to South Sudan than to
              Kampala. Getting there takes a flight or a long, deliberate drive — which
              is exactly why the plains stay empty and the silence at night is total.
            </p>
            <p className="mt-4 text-[1rem] leading-relaxed text-muted">
              Buffalo move in the hundreds across the Narus Valley. The Morungole
              mountains hold the horizon. There are a handful of places to stay, and
              that is the point.
            </p>
            <a
              href="#destinations"
              className="mt-8 inline-flex items-center gap-2 border-b border-forest/25 pb-1 text-sm tracking-wide text-forest transition-colors hover:border-forest"
            >
              Read about Kidepo
              <span aria-hidden="true">&rarr;</span>
            </a>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
