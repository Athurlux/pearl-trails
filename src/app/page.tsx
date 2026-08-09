import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Hero } from "@/components/sections/Hero";
import { Destinations } from "@/components/sections/Destinations";
import { FeaturedStays } from "@/components/sections/FeaturedStays";
import { StayCategories } from "@/components/sections/StayCategories";
import { Experiences } from "@/components/sections/Experiences";
import { EditorialFeature } from "@/components/sections/EditorialFeature";
import { TripPreview } from "@/components/sections/TripPreview";
import { WhyPearlTrails } from "@/components/sections/WhyPearlTrails";
import { FinalCta } from "@/components/sections/FinalCta";

/**
 * Server Component by design. Only Header, SearchBar, StaysGrid, StayCard and
 * Reveal ship JavaScript — everything else is rendered on the server.
 */
export default function HomePage() {
  return (
    <>
      <Header />
      <main id="main">
        <Hero />
        <Destinations />
        <FeaturedStays />
        <StayCategories />
        <Experiences />
        <EditorialFeature />
        <TripPreview />
        <WhyPearlTrails />
        <FinalCta />
      </main>
      <Footer />
    </>
  );
}
