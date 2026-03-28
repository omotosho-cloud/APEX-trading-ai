import LandingHero from "@/modules/landing/hero";
import LandingSignalPreview from "@/modules/landing/signal-preview";
import LandingFeatures from "@/modules/landing/features";
import LandingPricing from "@/modules/landing/pricing";
import LandingFooter from "@/modules/landing/footer";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-surface text-text-primary">
      <LandingHero />
      <LandingSignalPreview />
      <LandingFeatures />
      <LandingPricing />
      <LandingFooter />
    </div>
  );
}
