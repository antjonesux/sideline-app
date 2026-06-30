import type { Metadata } from "next";
import { FeatureGrid } from "@/components/marketing/FeatureGrid";
import { FinalCTA } from "@/components/marketing/FinalCTA";
import { Hero } from "@/components/marketing/Hero";
import { HowItWorks } from "@/components/marketing/HowItWorks";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { MarketingNav } from "@/components/marketing/MarketingNav";
import { Problem } from "@/components/marketing/Problem";
import { ProductShowcase } from "@/components/marketing/ProductShowcase";
import { WhatIsCallSheet } from "@/components/marketing/WhatIsCallSheet";
import { WhySideline } from "@/components/marketing/WhySideline";

export const metadata: Metadata = {
  title: "Welcome — The Sideline",
  description:
    "The modern digital Call Sheet for EA SPORTS College Football. Build personalized game plans and organize your favorite plays into tactical situations.",
};

function first(param: string | string[] | undefined): string | undefined {
  if (Array.isArray(param)) return param[0];
  return param;
}

export default async function MarketingLandingPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>;
}) {
  const sp = await searchParams;
  const raw = first(sp.next);
  const nextFromUrl =
    typeof raw === "string" && raw.startsWith("/") && !raw.startsWith("//") ? raw : undefined;

  return (
    <>
      <MarketingNav nextFromUrl={nextFromUrl} />
      <Hero nextFromUrl={nextFromUrl} />
      <WhatIsCallSheet />
      <Problem />
      <HowItWorks />
      <FeatureGrid />
      <ProductShowcase />
      <WhySideline nextFromUrl={nextFromUrl} />
      <FinalCTA nextFromUrl={nextFromUrl} />
      <MarketingFooter />
    </>
  );
}
