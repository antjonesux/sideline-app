import type { CatalogSideOfBall } from "@/lib/constants";
import { isGenericOffensivePlaybook } from "@/lib/playbooks/generic-playbooks";

/** Public browse buckets for the CFB27 playbook home. */
export type PublicPlaybookClassification = "team-offense" | "alternative-offense" | "defense";

/**
 * Classify a catalog playbook for public browse sections.
 * Reuses `GENERIC_OFFENSIVE_PLAYBOOKS` (Air Raid, Run & Shoot, etc.) — there is no
 * formal team/type column on `playbooks`; side_of_ball + the existing generic list
 * is the same signal the authenticated playbook pickers use.
 */
export function classifyPlaybook(
  name: string,
  sideOfBall: CatalogSideOfBall,
): PublicPlaybookClassification {
  if (sideOfBall === "defense") return "defense";
  return isGenericOffensivePlaybook(name) ? "alternative-offense" : "team-offense";
}
