import type { Metadata } from "next";
import { BrowsePlaybookDetail } from "@/components/marketing/BrowsePlaybookDetail";
import { PlaybooksPageShell } from "@/components/marketing/PlaybooksPageShell";
import { listPublicPlaybookStaticParams } from "@/lib/publicPlaybooksServer";

/** 24h ISR for public playbook browse. */
export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Playbook — The Sideline",
  description: "Explore formations in EA SPORTS College Football 27 playbooks.",
};

export async function generateStaticParams() {
  try {
    return await listPublicPlaybookStaticParams();
  } catch (err) {
    console.error("[playbooks/[playbookId]] generateStaticParams:", err);
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

type PageProps = {
  params: Promise<{ playbookId: string }>;
};

export default async function PlaybookDetailPage({ params }: PageProps) {
  const { playbookId: rawId } = await params;
  const playbookId = decodeParam(rawId ?? "");
  const nextFromUrl = `/playbooks/${encodeURIComponent(playbookId)}`;

  return (
    <PlaybooksPageShell nextFromUrl={nextFromUrl}>
      <BrowsePlaybookDetail playbookId={playbookId} />
    </PlaybooksPageShell>
  );
}
