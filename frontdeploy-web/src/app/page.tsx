import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Hero } from "@/components/sections/Hero";
import { Features } from "@/components/sections/Features";
import { HowItWorks } from "@/components/sections/HowItWorks";
import { Ticker } from "@/components/sections/Ticker";
import { Install } from "@/components/sections/Install";
import { Cta } from "@/components/sections/Cta";
import { Divider } from "@/components/ui/Divider";

export default function Home() {
  return (
    <>
      <Navbar />
      <Hero />
      <Divider />
      <Features />
      <Divider />
      <HowItWorks />
      <Ticker />
      <Install />
      <Divider />
      <Cta />
      <Footer />
    </>
  );
}
