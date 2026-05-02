import type { TopFormationRow } from "@/components/tendencies/TopFormationsList";
import type { TopPlayRow } from "@/components/tendencies/TopPlaysList";
import { isSpecialTeamsFormationPlayRow } from "@/lib/playTypeResolution";
import {
  aggregateByFormation,
  aggregateByFormationPlay,
  bestPlayForFormation,
  mostCommonScenarioByFormationPlay,
  qualifiesForReconsiderPlay,
  type LoggedPlayRow,
} from "@/lib/tendenciesServer";
import { normalizePlayName } from "@/lib/utils";

export type GameReconsiderPlayRow = TopPlayRow & { common_scenario: string };

function formationPlayKey(formation: string, playName: string): string {
  return `${formation}\u0000${normalizePlayName(playName ?? "")}`;
}

/**
 * Single-game What's Working: same aggregation and reconsider rules as
 * `/api/tendencies/top-plays` and `/api/tendencies/top-formations`, applied to
 * one game's `logged_plays` rows (no extra endpoints).
 */
export function summarizeGameWhatsWorking(plays: LoggedPlayRow[]): {
  rankedPlays: TopPlayRow[];
  rankedFormations: TopFormationRow[];
  reconsiderPlays: GameReconsiderPlayRow[];
} {
  const rankedPlays = aggregateByFormationPlay(plays, 1, "composite");
  const scenarioByPlay = mostCommonScenarioByFormationPlay(plays);

  const reconsiderPlays = rankedPlays
    .filter((r) => !isSpecialTeamsFormationPlayRow(r.formation, r.play_name))
    .filter(qualifiesForReconsiderPlay)
    .map((r) => ({
      ...r,
      common_scenario: scenarioByPlay.get(formationPlayKey(r.formation, r.play_name)) ?? "Unknown",
    }))
    .sort((a, b) => b.uses - a.uses || a.avg_yards - b.avg_yards);

  const allFormations = aggregateByFormation(plays, 1);
  const rankedFormations: TopFormationRow[] = allFormations.map((f) => {
    const best = bestPlayForFormation(plays, f.formation, 1);
    return {
      ...f,
      best_play: best
        ? {
            play_name: best.play_name,
            uses: best.uses,
            avg_yards: best.avg_yards,
            touchdowns: best.touchdowns,
            first_downs: best.first_downs,
          }
        : null,
    };
  });

  return { rankedPlays, rankedFormations, reconsiderPlays };
}
