import Image from "next/image";
import { SearchBar } from "./SearchBar";

export function Hero() {
  return (
    <section className="relative isolate min-h-[92svh] w-full overflow-hidden bg-forest-deep lg:min-h-[100svh]">
      <Image
        src="/img/hero-uganda.jpg"
        alt="Terraced hillsides falling towards a lake in southwestern Uganda"
        fill
        priority
        fetchPriority="high"
        sizes="100vw"
        className="object-cover object-[62%_center] sm:object-center"
      />

      {/*
        Scrim is anchored to the bottom rather than washing the whole frame, so the
        sky and hills stay legible while the headline still meets contrast.
      */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-t from-forest-deep/95 via-forest-deep/52 to-forest-deep/15"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-r from-forest-deep/75 via-forest-deep/20 to-transparent"
      />

      <div className="relative mx-auto flex min-h-[92svh] max-w-[1400px] flex-col justify-end px-5 pb-10 pt-32 sm:px-8 lg:min-h-[100svh] lg:px-12 lg:pb-16">
        <div className="max-w-3xl">
          <p className="eyebrow text-sand">Uganda · The Pearl of Africa</p>
          <h1 className="mt-5 text-[clamp(2.6rem,7vw,5.25rem)] leading-[0.98] text-ivory">
            Discover Uganda
            <br />
            <span className="italic text-sand">differently.</span>
          </h1>
          <p className="mt-6 max-w-xl text-[1.02rem] leading-relaxed text-ivory/85 sm:text-[1.1rem]">
            Find remarkable lodges, campsites and unforgettable experiences across the most
            beautiful destinations in Uganda.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <a
              href="#stays"
              className="rounded-sm bg-ivory px-8 py-4 text-center text-sm font-medium tracking-wide text-forest transition-colors hover:bg-white"
            >
              Explore Stays
            </a>
            <a
              href="#experiences"
              className="rounded-sm border border-ivory/45 px-8 py-4 text-center text-sm font-medium tracking-wide text-ivory transition-colors hover:border-ivory hover:bg-ivory/10"
            >
              Discover Experiences
            </a>
          </div>
        </div>

        <div className="mt-10 lg:mt-14">
          <SearchBar />
        </div>
      </div>
    </section>
  );
}
