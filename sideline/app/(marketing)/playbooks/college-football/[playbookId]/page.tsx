import type { Metadata } from "next";
import { BrowsePlaybookDetail } from "@/components/marketing/BrowsePlaybookDetail";
import { PlaybooksPageShell } from "@/components/marketing/PlaybooksPageShell";
import { publicPlaybooksHref, publicPlaybooksHrefWithSide } from "@/lib/publicPlaybooksPaths";
import {
  listPublicPlaybookStaticParams,
  publicPlaybookSeoYear,
  resolvePublicPlaybookGameVersion,
} from "@/lib/publicPlaybooksServer";

/** 24h ISR for public playbook browse. */
export const revalidate = 86400;

export async function generateStaticParams() {
  try {
    return await listPublicPlaybookStaticParams();
  } catch (err) {
    console.error("[playbooks/college-football/[playbookId]] generateStaticParams:", err);
    return [];
  }
}

function decodeParam(raw: string): string {
  try {
    return decodeURIComponent(raw).trim();
  } catch {
    return raw.trim();
  }
}

function parseSide(raw: string | string[] | undefined): "offense" | "defense" | null {
  const value = Array.isArray(raw) ? raw[0] : raw;
  return value === "defense" || value === "offense" ? value : null;
}

type PageProps = {
  params: Promise<{ playbookId: string }>;
  searchParams: Promise<{ side?: string | string[] }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { playbookId: rawId } = await params;
  const playbookId = decodeParam(rawId ?? "");
  const version = await resolvePublicPlaybookGameVersion();
  const year = publicPlaybookSeoYear(version);
  const label = playbookId || "Playbook";
  const title = `${label} Playbook — College Football ${year} | The Sideline`;
  const description = `Explore ${label} formations and plays in EA SPORTS College Football ${year}.`;
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: playbookId ? publicPlaybooksHref(playbookId) : undefined,
      type: "website",
    },
  };
}

export default async function PlaybookDetailPage({ params, searchParams }: PageProps) {
  const { playbookId: rawId } = await params;
  const playbookId = decodeParam(rawId ?? "");
  const side = parseSide((await searchParams).side);
  const nextFromUrl = publicPlaybooksHrefWithSide([playbookId], side);

  return (
    <PlaybooksPageShell nextFromUrl={nextFromUrl}>
      <BrowsePlaybookDetail playbookId={playbookId} />
    </PlaybooksPageShell>
  );
}
