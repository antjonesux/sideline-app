import type { Metadata } from "next";
import { BrowsePlaybooksHome } from "@/components/marketing/BrowsePlaybooksHome";
import { PlaybooksPageShell } from "@/components/marketing/PlaybooksPageShell";

/** 24h ISR for public playbook browse. */
export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Playbooks — The Sideline",
  description: "Every playbook in EA SPORTS College Football 27. Explore formations and plays.",
};

export default function PlaybooksHomePage() {
  return (
    <PlaybooksPageShell nextFromUrl="/playbooks">
      <BrowsePlaybooksHome />
    </PlaybooksPageShell>
  );
}
