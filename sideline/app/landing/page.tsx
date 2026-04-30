import type { Metadata } from "next";
import { HeroSection } from "@/components/landing/HeroSection";

export const metadata: Metadata = {
  title: "Welcome — The Sideline",
  description:
    "The play-calling companion for College Football 26. Build your game plan, track your tendencies, and see what's actually working.",
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

  return <HeroSection nextFromUrl={nextFromUrl} />;
}
