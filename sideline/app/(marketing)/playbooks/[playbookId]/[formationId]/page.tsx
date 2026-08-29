import type { Metadata } from "next";
import { BrowseFormationDetail } from "@/components/marketing/BrowseFormationDetail";
import { PlaybooksPageShell } from "@/components/marketing/PlaybooksPageShell";
import { listPublicFormationStaticParams } from "@/lib/publicPlaybooksServer";

/** 24h ISR for public playbook browse. */
export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Formation — The Sideline",
  description: "Explore plays in EA SPORTS College Football 27 formations.",
};

export async function generateStaticParams() {
  try {
    return await listPublicFormationStaticParams();
  } catch (err) {
    console.error("[playbooks/.../formation] generateStaticParams:", err);
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
  params: Promise<{ playbookId: string; formationId: string }>;
};

export default async function FormationDetailPage({ params }: PageProps) {
  const { playbookId: rawPlaybook, formationId: rawFormation } = await params;
  const playbookId = decodeParam(rawPlaybook ?? "");
  const formationId = decodeParam(rawFormation ?? "");
  const nextFromUrl = `/playbooks/${encodeURIComponent(playbookId)}/${encodeURIComponent(formationId)}`;

  return (
    <PlaybooksPageShell nextFromUrl={nextFromUrl}>
      <BrowseFormationDetail playbookId={playbookId} formationId={formationId} />
    </PlaybooksPageShell>
  );
}
