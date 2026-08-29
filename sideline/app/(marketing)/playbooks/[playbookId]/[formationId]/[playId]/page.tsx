import type { Metadata } from "next";
import { BrowsePlayDetail } from "@/components/marketing/BrowsePlayDetail";
import { PlaybooksPageShell } from "@/components/marketing/PlaybooksPageShell";

/** 24h ISR; play detail generated on demand (no generateStaticParams — triples too large). */
export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Play — The Sideline",
  description: "Play detail from EA SPORTS College Football 27 playbooks.",
};

function decodeParam(raw: string): string {
  try {
    return decodeURIComponent(raw).trim();
  } catch {
    return raw.trim();
  }
}

type PageProps = {
  params: Promise<{ playbookId: string; formationId: string; playId: string }>;
};

export default async function PlayDetailPage({ params }: PageProps) {
  const { playbookId: rawPlaybook, formationId: rawFormation, playId: rawPlay } = await params;
  const playbookId = decodeParam(rawPlaybook ?? "");
  const formationId = decodeParam(rawFormation ?? "");
  const playId = decodeParam(rawPlay ?? "");
  const nextFromUrl = `/playbooks/${encodeURIComponent(playbookId)}/${encodeURIComponent(formationId)}/${encodeURIComponent(playId)}`;

  return (
    <PlaybooksPageShell nextFromUrl={nextFromUrl}>
      <BrowsePlayDetail playbookId={playbookId} formationId={formationId} playId={playId} />
    </PlaybooksPageShell>
  );
}
