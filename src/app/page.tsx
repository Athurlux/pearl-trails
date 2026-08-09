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
import {
  countStaysByType,
  listDestinationsWithCounts,
  listFeaturedStays,
} from "@/lib/stays-query";

/**
 * Rendered per request because the catalogue is the source of truth and this
 * page states real counts. Baking it at build time would let the homepage
 * quietly disagree with /stays after the next seed.
 */
export const dynamic = "force-dynamic";

/**
 * Server Component. Only Header, SearchBar, SaveButton and Reveal ship
 * JavaScript — every section below is rendered on the server.
 */
export default async function HomePage() {
  const [destinations, featured, typeCounts] = await Promise.all([
    listDestinationsWithCounts(),
    listFeaturedStays(6),
    countStaysByType(),
  ]);

  return (
    <>
      <Header />
      <main id="main">
        <Hero destinations={destinations} />
        <Destinations destinations={destinations} />
        <FeaturedStays stays={featured} />
        <StayCategories counts={typeCounts} />
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
