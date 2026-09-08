import type { Metadata } from "next";
import { BrowsePlayDetail } from "@/components/marketing/BrowsePlayDetail";
import { PlaybooksPageShell } from "@/components/marketing/PlaybooksPageShell";
import { publicPlaybooksHref, publicPlaybooksHrefWithSide } from "@/lib/publicPlaybooksPaths";
import {
  publicPlaybookSeoYear,
  resolvePublicPlaybookGameVersion,
} from "@/lib/publicPlaybooksServer";

/** 24h ISR; play detail generated on demand (no generateStaticParams — triples too large). */
export const revalidate = 86400;

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
  params: Promise<{ playbookId: string; formationId: string; playId: string }>;
  searchParams: Promise<{ side?: string | string[] }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { playbookId: rawPlaybook, formationId: rawFormation, playId: rawPlay } = await params;
  const playbookId = decodeParam(rawPlaybook ?? "");
  const formationId = decodeParam(rawFormation ?? "");
  const playId = decodeParam(rawPlay ?? "");
  const version = await resolvePublicPlaybookGameVersion();
  const year = publicPlaybookSeoYear(version);
  const playLabel = playId || "Play";
  const title = `${playLabel} — College Football ${year} | The Sideline`;
  const description =
    playbookId && formationId
      ? `${playLabel} from ${formationId} in the ${playbookId} playbook — EA SPORTS College Football ${year}.`
      : `Play detail from EA SPORTS College Football ${year} playbooks.`;
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url:
        playbookId && formationId && playId
          ? publicPlaybooksHref(playbookId, formationId, playId)
          : undefined,
      type: "website",
    },
  };
}

export default async function PlayDetailPage({ params, searchParams }: PageProps) {
  const { playbookId: rawPlaybook, formationId: rawFormation, playId: rawPlay } = await params;
  const playbookId = decodeParam(rawPlaybook ?? "");
  const formationId = decodeParam(rawFormation ?? "");
  const playId = decodeParam(rawPlay ?? "");
  const side = parseSide((await searchParams).side);
  const nextFromUrl = publicPlaybooksHrefWithSide([playbookId, formationId, playId], side);

  return (
    <PlaybooksPageShell nextFromUrl={nextFromUrl}>
      <BrowsePlayDetail playbookId={playbookId} formationId={formationId} playId={playId} />
    </PlaybooksPageShell>
  );
}
