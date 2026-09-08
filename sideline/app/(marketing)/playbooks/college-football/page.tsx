import type { Metadata } from "next";
import { BrowsePlaybooksHome } from "@/components/marketing/BrowsePlaybooksHome";
import { PlaybooksPageShell } from "@/components/marketing/PlaybooksPageShell";
import { PUBLIC_PLAYBOOKS_BASE_PATH } from "@/lib/publicPlaybooksPaths";
import {
  publicPlaybookSeoYear,
  resolvePublicPlaybookGameVersion,
} from "@/lib/publicPlaybooksServer";

/** 24h ISR for public playbook browse. */
export const revalidate = 86400;

export async function generateMetadata(): Promise<Metadata> {
  const version = await resolvePublicPlaybookGameVersion();
  const year = publicPlaybookSeoYear(version);
  const title = `College Football ${year} Playbooks — The Sideline`;
  const description = `Browse every playbook in EA SPORTS College Football ${year}. Explore formations and plays for dynasty coaches.`;
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: PUBLIC_PLAYBOOKS_BASE_PATH,
      type: "website",
    },
  };
}

export default function PlaybooksHomePage() {
  return (
    <PlaybooksPageShell nextFromUrl={PUBLIC_PLAYBOOKS_BASE_PATH}>
      <BrowsePlaybooksHome />
    </PlaybooksPageShell>
  );
}
