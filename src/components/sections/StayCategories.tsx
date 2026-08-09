import Image from "next/image";
import Link from "next/link";
import { categories } from "@/data/categories";
import { Reveal } from "@/components/ui/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";
import type { StayType } from "@/lib/stay-types";

export function StayCategories({ counts }: { counts: Record<StayType, number> }) {
  return (
    <section className="bg-ivory py-20 lg:py-28">
      <div className="mx-auto max-w-[1400px] px-5 sm:px-8 lg:px-12">
        <SectionHeading
          eyebrow="Stay categories"
          title="However you like to sleep outdoors."
          intro="Canvas or stone, off-grid or full service — the category shapes the whole trip more than the map pin does."
        />

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:mt-16 lg:grid-cols-3">
          {categories.map((category, i) => {
            const count = category.types.reduce((n, t) => n + (counts[t] ?? 0), 0);
            return (
              <Reveal
                as="article"
                key={category.slug}
                delay={(i % 3) * 80}
                className="group relative isolate flex min-h-[220px] overflow-hidden rounded-sm bg-forest-deep lg:min-h-[240px]"
              >
                <Image
                  src={category.image}
                  alt={category.imageAlt}
                  fill
                  loading="lazy"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  className="object-cover opacity-70 transition-all duration-[1200ms] ease-out group-hover:scale-[1.05] group-hover:opacity-80"
                />
                <div
                  aria-hidden="true"
                  className="absolute inset-0 bg-gradient-to-t from-forest-deep/90 via-forest-deep/45 to-forest-deep/15"
                />

                <div className="relative flex w-full flex-col justify-end p-6">
                  <div className="flex items-baseline justify-between gap-3">
                    <h3 className="text-[1.4rem] text-ivory">
                      {/* Each category is a real stay-type filter on the catalogue. */}
                      <Link
                        href={`/stays?type=${category.types.join(",")}`}
                        className="after:absolute after:inset-0"
                      >
                        {category.name}
                      </Link>
                    </h3>
                    <span className="shrink-0 text-[0.78rem] tabular-nums text-sand">
                      {count}
                    </span>
                  </div>
                  <p className="mt-1.5 text-[0.92rem] leading-snug text-ivory/70">
                    {category.description}
                  </p>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
