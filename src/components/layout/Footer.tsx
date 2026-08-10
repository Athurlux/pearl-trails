import Image from "next/image";
import Link from "next/link";
import { listDestinations } from "@/lib/stays-query";

const siteLinks = [
  { href: "/stays", label: "Explore stays" },
  { href: "/#destinations", label: "Explore Uganda" },
  { href: "/#experiences", label: "Experiences" },
  { href: "/#about", label: "Why Pearl Trails" },
];

/**
 * Server Component. Destination links come from the catalogue rather than a
 * hardcoded list, so the footer cannot advertise a destination we do not have.
 */
export async function Footer() {
  const destinations = await listDestinations();
  const year = 2026;

  return (
    <footer className="bg-forest-deep text-ivory">
      <div className="mx-auto max-w-[1400px] px-5 py-16 sm:px-8 lg:px-12 lg:py-20">
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-8">
          <div className="lg:col-span-5">
            <Image
              src="/brand/logo-reversed.png"
              alt="Pearl Trails"
              width={200}
              height={56}
              className="h-12 w-auto"
            />
            <p className="mt-6 max-w-sm text-[0.95rem] leading-relaxed text-ivory/65">
              Lodges, campsites and experiences across Uganda — the Pearl of Africa.
            </p>
            <p className="mt-6 text-[0.85rem] text-ivory/45">Kampala, Uganda</p>
          </div>

          <nav className="lg:col-span-3" aria-labelledby="footer-explore">
            <h2 id="footer-explore" className="eyebrow text-sand">
              Explore
            </h2>
            <ul className="mt-5 space-y-3">
              {siteLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-[0.95rem] text-ivory/70 transition-colors hover:text-ivory"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav className="lg:col-span-4" aria-labelledby="footer-destinations">
            <h2 id="footer-destinations" className="eyebrow text-sand">
              Destinations
            </h2>
            <ul className="mt-5 grid grid-cols-2 gap-x-6 gap-y-3">
              {destinations.map((destination) => (
                <li key={destination.slug}>
                  <Link
                    href={`/stays?destination=${destination.slug}`}
                    className="text-[0.95rem] text-ivory/70 transition-colors hover:text-ivory"
                  >
                    {destination.name}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="mt-14 border-t border-ivory/12 pt-8">
          <p className="max-w-3xl text-[0.8rem] leading-relaxed text-ivory/45">
            {/*
              Kept accurate release by release. Booking requests became real in
              Release 4, so the old blanket "booking is not available" line would
              now be false — but payments and accounts genuinely do not exist,
              and saying so is the difference between a demo and a misrepresentation.
            */}
            Pearl Trails is a demonstration build. Properties, prices, availability and
            itineraries shown are original examples created for this preview and do not
            represent real businesses or live rates. Reservation requests are stored and
            given a reference, but no payment is taken, no account is created, and no
            real lodge is contacted.
          </p>
          <p className="mt-6 text-[0.8rem] text-ivory/40">
            &copy; {year} Pearl Trails · Stays that stay with you.
          </p>
        </div>
      </div>
    </footer>
  );
}
