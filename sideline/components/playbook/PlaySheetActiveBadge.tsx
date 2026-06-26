import { PLAY_SHEET_ACTIVE_BADGE } from "@/lib/coachCopy";
import { playSheetActiveBadgeClass } from "@/lib/constants/designTokens";

export function PlaySheetActiveBadge() {
  return <span className={playSheetActiveBadgeClass}>{PLAY_SHEET_ACTIVE_BADGE}</span>;
}
