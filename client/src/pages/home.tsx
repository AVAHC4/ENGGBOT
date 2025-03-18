import HeroSection from "@/components/hero-section";
import FeaturesSection from "@/components/features-section";
import ContentSection from "@/components/content-section";
import FooterSection from "@/components/footer";

export default function Home() {
  return (
    <div className="min-h-screen">
      <HeroSection />
      <ContentSection />
      <FeaturesSection />
      <FooterSection />
    </div>
  );
}