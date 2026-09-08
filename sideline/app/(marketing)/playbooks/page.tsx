import { permanentRedirect } from "next/navigation";
import { PUBLIC_PLAYBOOKS_BASE_PATH } from "@/lib/publicPlaybooksPaths";

/**
 * Legacy `/playbooks` entry — always land on the evergreen SEO path.
 * Complements the 301 in `next.config.ts` so client navigations also rewrite the URL bar.
 */
export default function PlaybooksLegacyIndexRedirect() {
  permanentRedirect(PUBLIC_PLAYBOOKS_BASE_PATH);
}
