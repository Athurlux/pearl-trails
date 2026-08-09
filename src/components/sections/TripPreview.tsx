import { itineraryPreview } from "@/data/itinerary";
import { Reveal } from "@/components/ui/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";

export function TripPreview() {
  const { title, destination, nights, days } = itineraryPreview;

  return (
    <section className="bg-ivory-warm py-20 lg:py-28">
      <div className="mx-auto max-w-[1400px] px-5 sm:px-8 lg:px-12">
        <SectionHeading
          eyebrow="Trip preview"
          title="A stay is a shape, not a date range."
          intro="This is what one of our short Bwindi trips actually looks like, hour by hour."
        />

        <Reveal className="mt-12 overflow-hidden rounded-sm border border-line bg-ivory lg:mt-16">
          <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 border-b border-line px-6 py-6 lg:px-10">
            <div>
              <h3 className="text-[1.5rem] text-forest">{title}</h3>
              <p className="mt-1 text-[0.92rem] text-muted">{destination}</p>
            </div>
            <p className="text-[0.85rem] tracking-wide text-gold">
              {nights} nights · {days.length} days
            </p>
          </div>

          <ol className="grid divide-y divide-line lg:grid-cols-3 lg:divide-x lg:divide-y-0">
            {days.map((day) => (
              <li key={day.day} className="px-6 py-7 lg:px-8 lg:py-9">
                <div className="flex items-baseline gap-3">
                  <span className="text-[0.75rem] tracking-[0.14em] text-gold">
                    DAY {day.day}
                  </span>
                  <span className="h-px flex-1 bg-line" aria-hidden="true" />
                </div>
                <h4 className="mt-3 text-[1.2rem] text-forest">{day.label}</h4>

                <ul className="mt-5 space-y-4">
                  {day.activities.map((activity) => (
                    <li key={activity.time} className="flex gap-4">
                      <time className="w-12 shrink-0 pt-0.5 text-[0.8rem] tabular-nums text-muted">
                        {activity.time}
                      </time>
                      <span className="text-[0.95rem] leading-snug text-ink">
                        {activity.title}
                      </span>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>
        </Reveal>

        <Reveal className="mt-8">
          <p className="max-w-2xl text-[0.82rem] leading-relaxed text-muted">
            Itineraries are illustrative in this release. Booking, availability and
            payment arrive in a later milestone.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
