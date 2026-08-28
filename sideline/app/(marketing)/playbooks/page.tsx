import type { Metadata } from "next";
import { BrowsePlaybooksHome } from "@/components/marketing/BrowsePlaybooksHome";
import { MarketingNav } from "@/components/marketing/MarketingNav";

export const metadata: Metadata = {
  title: "Playbooks — The Sideline",
  description: "Every playbook in EA SPORTS College Football 27. Explore formations and plays.",
};

function first(param: string | string[] | undefined): string | undefined {
  if (Array.isArray(param)) return param[0];
  return param;
}

export default async function PlaybooksHomePage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>;
}) {
  const sp = await searchParams;
  const raw = first(sp.next);
  const nextFromUrl =
    typeof raw === "string" && raw.startsWith("/") && !raw.startsWith("//") ? raw : "/playbooks";

  return (
    <>
      <MarketingNav nextFromUrl={nextFromUrl} />
      <BrowsePlaybooksHome />
    </>
  );
}
