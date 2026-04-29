import type { Metadata } from "next";
import { OnboardingCarousel } from "@/components/landing/OnboardingCarousel";

export const metadata: Metadata = {
  title: "Welcome — The Sideline",
  description: "Build your game plan, call the game, and see your tendencies — before kickoff and after the whistle.",
};

function first(param: string | string[] | undefined): string | undefined {
  if (Array.isArray(param)) return param[0];
  return param;
}

export default async function LandingPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>;
}) {
  const sp = await searchParams;
  const raw = first(sp.next);
  const nextFromUrl =
    typeof raw === "string" && raw.startsWith("/") && !raw.startsWith("//") ? raw : undefined;

  return <OnboardingCarousel nextFromUrl={nextFromUrl} />;
}
