import Image from "next/image";
import { destinations } from "@/data/destinations";

const siteLinks = [
  { href: "#stays", label: "Exceptional stays" },
  { href: "#destinations", label: "Explore Uganda" },
  { href: "#experiences", label: "Experiences" },
  { href: "#about", label: "Why Pearl Trails" },
];

export function Footer() {
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
                  <a
                    href={link.href}
                    className="text-[0.95rem] text-ivory/70 transition-colors hover:text-ivory"
                  >
                    {link.label}
                  </a>
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
                  <a
                    href="#destinations"
                    className="text-[0.95rem] text-ivory/70 transition-colors hover:text-ivory"
                  >
                    {destination.name}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="mt-14 border-t border-ivory/12 pt-8">
          <p className="max-w-3xl text-[0.8rem] leading-relaxed text-ivory/45">
            Pearl Trails Release 1 is a demonstration build. Properties, prices and
            itineraries shown are original examples created for this preview and do not
            represent real businesses or live rates. Booking, payments and accounts are
            not yet available.
          </p>
          <p className="mt-6 text-[0.8rem] text-ivory/40">
            &copy; {year} Pearl Trails · Stays that stay with you.
          </p>
        </div>
      </div>
    </footer>
  );
}
