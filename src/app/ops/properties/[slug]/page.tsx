import Link from "next/link";
import { notFound } from "next/navigation";
import { AccommodationEditor } from "@/components/ops/AccommodationEditor";
import { VisibilityControl } from "@/components/ops/VisibilityControl";
import { getStayForOps } from "@/lib/ops-query";
import { requireStaff } from "@/lib/staff-auth";
import { STAY_VISIBILITY_LABELS, type StayVisibility } from "@/lib/staff-vocab";

/**
 * One property, for operations.
 *
 * Editing is limited to the two fields that are genuinely operational — the
 * nightly rate and how many units exist — plus visibility. Descriptions,
 * photography and amenities are editorial work that belongs with the content,
 * not in a form squeezed into an admin table.
 */

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const stay = await getStayForOps(slug);
  return { title: stay?.name ?? "Property" };
}

export default async function OpsPropertyPage({ params }: Props) {
  const staff = await requireStaff();
  const { slug } = await params;

  const stay = await getStayForOps(slug);
  if (!stay) notFound();

  const canEdit = staff.role === "admin";

  return (
    <main id="main" className="mx-auto max-w-[1000px] px-5 py-10 sm:px-8">
      <Link
        href="/ops/properties"
        className="text-[0.84rem] text-muted transition-colors hover:text-forest"
      >
        ← All properties
      </Link>

      <h1 className="mt-4 text-[1.7rem] text-forest">{stay.name}</h1>
      <p className="mt-1.5 text-[0.9rem] text-muted">
        {stay.destinationName} · {STAY_VISIBILITY_LABELS[stay.visibility as StayVisibility]}
      </p>
      <p className="mt-3 max-w-2xl text-[0.9rem] leading-relaxed text-ink">
        {stay.shortDescription}
      </p>

      <div className="mt-4 flex flex-wrap gap-4">
        <Link
          href={`/stays/${stay.slug}`}
          className="text-[0.85rem] text-forest underline decoration-line underline-offset-4 hover:decoration-forest"
        >
          View the public page
        </Link>
        <Link
          href={`/ops/bookings?stay=${stay.slug}`}
          className="text-[0.85rem] text-forest underline decoration-line underline-offset-4 hover:decoration-forest"
        >
          Bookings for this property
        </Link>
      </div>

      {!canEdit ? (
        <p className="mt-8 rounded-sm border border-line bg-ivory-warm/40 px-4 py-3 text-[0.86rem] leading-relaxed text-muted">
          You can see everything here. Changing rates, inventory or visibility needs an
          administrator account.
        </p>
      ) : null}

      <section aria-labelledby="visibility" className="mt-10">
        <h2 id="visibility" className="text-[1.15rem] text-forest">
          Visibility
        </h2>
        <p className="mt-1.5 max-w-2xl text-[0.85rem] leading-relaxed text-muted">
          Unpublishing removes this property from search, the landing page, the sitemap
          and its own URL. Existing bookings are untouched — they keep the property, the
          accommodation and the rate they were made at.
        </p>
        <div className="mt-4">
          <VisibilityControl
            slug={stay.slug}
            current={stay.visibility as StayVisibility}
            canEdit={canEdit}
          />
        </div>
      </section>

      <section aria-labelledby="accommodation" className="mt-12">
        <h2 id="accommodation" className="text-[1.15rem] text-forest">
          Accommodation
        </h2>
        <p className="mt-1.5 max-w-2xl text-[0.85rem] leading-relaxed text-muted">
          The nightly rate applies to <strong className="text-ink">new</strong> requests
          only. Every booking snapshots what it was quoted, so changing a price here can
          never rewrite what someone already asked for.
        </p>

        <ul className="mt-5 space-y-4">
          {stay.options.map((option) => (
            <li key={option.id}>
              <AccommodationEditor
                staySlug={stay.slug}
                option={option}
                canEdit={canEdit}
              />
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
