import type { Metadata } from "next";
import { Hero } from "@/components/marketing/Hero";
import { HowItWorks } from "@/components/marketing/HowItWorks";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { MarketingNav } from "@/components/marketing/MarketingNav";
import { Problem } from "@/components/marketing/Problem";
import { WhySideline } from "@/components/marketing/WhySideline";

export const metadata: Metadata = {
  title: "The Sideline",
  description: "Study your game. Call it smarter.",
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
      <Problem />
      <HowItWorks />
      <WhySideline nextFromUrl={nextFromUrl} />
      <MarketingFooter />
    </>
  );
}
