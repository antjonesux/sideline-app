import type { Metadata } from "next";
import { BrowseFormationDetail } from "@/components/marketing/BrowseFormationDetail";
import { PlaybooksPageShell } from "@/components/marketing/PlaybooksPageShell";
import { publicPlaybooksHref, publicPlaybooksHrefWithSide } from "@/lib/publicPlaybooksPaths";
import {
  listPublicFormationStaticParams,
  publicPlaybookSeoYear,
  resolvePublicPlaybookGameVersion,
} from "@/lib/publicPlaybooksServer";

/** 24h ISR for public playbook browse. */
export const revalidate = 86400;

export async function generateStaticParams() {
  try {
    return await listPublicFormationStaticParams();
  } catch (err) {
    console.error("[playbooks/college-football/.../formation] generateStaticParams:", err);
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
  params: Promise<{ playbookId: string; formationId: string }>;
  searchParams: Promise<{ side?: string | string[] }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { playbookId: rawPlaybook, formationId: rawFormation } = await params;
  const playbookId = decodeParam(rawPlaybook ?? "");
  const formationId = decodeParam(rawFormation ?? "");
  const version = await resolvePublicPlaybookGameVersion();
  const year = publicPlaybookSeoYear(version);
  const formationLabel = formationId || "Formation";
  const title = `${formationLabel} — College Football ${year} | The Sideline`;
  const description = playbookId
    ? `Plays in ${formationLabel} from the ${playbookId} playbook in EA SPORTS College Football ${year}.`
    : `Explore plays in EA SPORTS College Football ${year} formations.`;
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: playbookId && formationId ? publicPlaybooksHref(playbookId, formationId) : undefined,
      type: "website",
    },
  };
}

export default async function FormationDetailPage({ params, searchParams }: PageProps) {
  const { playbookId: rawPlaybook, formationId: rawFormation } = await params;
  const playbookId = decodeParam(rawPlaybook ?? "");
  const formationId = decodeParam(rawFormation ?? "");
  const side = parseSide((await searchParams).side);
  const nextFromUrl = publicPlaybooksHrefWithSide([playbookId, formationId], side);

  return (
    <PlaybooksPageShell nextFromUrl={nextFromUrl}>
      <BrowseFormationDetail playbookId={playbookId} formationId={formationId} />
    </PlaybooksPageShell>
  );
}
