import Image from "next/image";
import { Reveal } from "@/components/ui/Reveal";

export function FinalCta() {
  return (
    <section className="relative isolate overflow-hidden bg-forest-deep">
      <Image
        src="/img/cta-savanna.jpg"
        alt=""
        aria-hidden="true"
        fill
        loading="lazy"
        sizes="100vw"
        className="object-cover"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-forest-deep/78"
      />

      <div className="relative mx-auto max-w-[1400px] px-5 py-24 sm:px-8 lg:px-12 lg:py-36">
        <Reveal className="max-w-2xl">
          <p className="eyebrow text-sand">Start somewhere</p>
          <h2 className="mt-4 text-[clamp(2.1rem,4.6vw,3.8rem)] leading-[1.02] text-ivory">
            Your Uganda trip
            <br />
            <span className="italic text-sand">starts here.</span>
          </h2>
          <p className="mt-6 max-w-lg text-[1.02rem] leading-relaxed text-ivory/80">
            Pick a destination, find the stay, add the experiences that make it worth
            the flight.
          </p>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
            <a
              href="#stays"
              className="rounded-sm bg-ivory px-8 py-4 text-center text-sm font-medium tracking-wide text-forest transition-colors hover:bg-white"
            >
              Explore Stays
            </a>
            <a
              href="#destinations"
              className="rounded-sm border border-ivory/45 px-8 py-4 text-center text-sm font-medium tracking-wide text-ivory transition-colors hover:border-ivory hover:bg-ivory/10"
            >
              Browse Destinations
            </a>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
