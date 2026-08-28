import type { Metadata } from "next";
import { BrowsePlaybookDetail } from "@/components/marketing/BrowsePlaybookDetail";
import { MarketingNav } from "@/components/marketing/MarketingNav";

export const metadata: Metadata = {
  title: "Playbook — The Sideline",
  description: "Explore formations in EA SPORTS College Football 27 playbooks.",
};

function first(param: string | string[] | undefined): string | undefined {
  if (Array.isArray(param)) return param[0];
  return param;
}

type PageProps = {
  params: Promise<{ playbookId: string }>;
  searchParams: Promise<{ next?: string | string[]; side?: string | string[] }>;
};

export default async function PlaybookDetailPage({ params, searchParams }: PageProps) {
  const { playbookId: rawId } = await params;
  let playbookId = rawId ?? "";
  try {
    playbookId = decodeURIComponent(rawId ?? "").trim();
  } catch {
    playbookId = (rawId ?? "").trim();
  }

  const sp = await searchParams;
  const rawNext = first(sp.next);
  const nextFromUrl =
    typeof rawNext === "string" && rawNext.startsWith("/") && !rawNext.startsWith("//")
      ? rawNext
      : `/playbooks/${encodeURIComponent(playbookId)}`;
  const side = first(sp.side) ?? null;

  return (
    <>
      <MarketingNav nextFromUrl={nextFromUrl} />
      <BrowsePlaybookDetail playbookId={playbookId} side={side} />
    </>
  );
}
