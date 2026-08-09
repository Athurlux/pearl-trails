import Image from "next/image";
import Link from "next/link";
import { Reveal } from "@/components/ui/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";

interface Destination {
  slug: string;
  name: string;
  region: string;
  tagline: string;
  blurb: string;
  image: string;
  imageAlt: string;
  stayCount: number;
}

function DestinationTile({
  destination,
  size,
  priorityIndex,
}: {
  destination: Destination;
  size: "large" | "small";
  priorityIndex: number;
}) {
  const isLarge = size === "large";

  return (
    <Reveal
      as="article"
      delay={priorityIndex * 70}
      className={[
        "group relative isolate overflow-hidden rounded-sm bg-forest-deep",
        isLarge ? "min-h-[380px] sm:min-h-[460px] lg:min-h-[540px]" : "min-h-[260px] lg:min-h-[300px]",
      ].join(" ")}
    >
      <Image
        src={destination.image}
        alt={destination.imageAlt}
        fill
        loading="lazy"
        sizes={isLarge ? "(max-width: 1024px) 100vw, 55vw" : "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"}
        className="object-cover transition-transform duration-[1200ms] ease-out group-hover:scale-[1.04]"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-t from-forest-deep/88 via-forest-deep/25 to-transparent"
      />

      <div className="relative flex h-full flex-col justify-end p-6 lg:p-8">
        <p className="eyebrow text-sand/90">{destination.region}</p>
        <h3
          className={[
            "mt-2 text-ivory",
            isLarge ? "text-[clamp(1.9rem,3vw,2.6rem)]" : "text-2xl",
          ].join(" ")}
        >
          {/* The tile is now a real entry point into Explore, not decoration. */}
          <Link
            href={`/stays?destination=${destination.slug}`}
            className="after:absolute after:inset-0"
          >
            {destination.name}
          </Link>
        </h3>
        <p className="mt-2 max-w-md text-[0.95rem] leading-snug text-ivory/80">
          {destination.tagline}
        </p>
        {isLarge ? (
          <p className="mt-3 hidden max-w-md text-[0.92rem] leading-relaxed text-ivory/65 sm:block">
            {destination.blurb}
          </p>
        ) : null}
        <p className="mt-4 text-[0.78rem] tracking-wide text-ivory/55">
          {destination.stayCount} {destination.stayCount === 1 ? "stay" : "stays"}
        </p>
      </div>
    </Reveal>
  );
}

export function Destinations({ destinations }: { destinations: Destination[] }) {
  const [first, second, ...rest] = destinations;
  if (!first) return null;

  return (
    <section id="destinations" className="scroll-mt-20 bg-ivory py-20 lg:py-28">
      <div className="mx-auto max-w-[1400px] px-5 sm:px-8 lg:px-12">
        <SectionHeading
          eyebrow="Explore Uganda"
          title={
            <>
              Eight places worth
              <br className="hidden sm:block" /> rearranging a year for.
            </>
          }
          intro="From forest that swallows sound to a valley most travellers never reach — start with where you want to wake up."
          action={
            <Link
              href="/stays"
              className="inline-flex items-center gap-2 border-b border-forest/25 pb-1 text-sm tracking-wide text-forest transition-colors hover:border-forest"
            >
              Explore all stays
              <span aria-hidden="true">&rarr;</span>
            </Link>
          }
        />

        {/* Deliberately asymmetric: two anchors, then a quieter row. */}
        <div className="mt-12 grid gap-4 lg:mt-16 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <DestinationTile destination={first} size="large" priorityIndex={0} />
          </div>
          {second ? (
            <div className="lg:col-span-5">
              <DestinationTile destination={second} size="large" priorityIndex={1} />
            </div>
          ) : null}
        </div>

        {rest.length > 0 ? (
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {rest.map((d, i) => (
              <DestinationTile
                key={d.slug}
                destination={d}
                size="small"
                priorityIndex={i % 3}
              />
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}
