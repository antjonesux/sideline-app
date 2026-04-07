import type { GameState, PlaySheetPlay, Scenario } from "@/lib/liveTypes";

const PLAY_TYPE_WEIGHTS: Record<string, number> = {
  deep_pass: 0.95,
  play_action: 0.85,
  medium_pass: 0.9,
  option_qb_run: 0.8,
  inside_run: 0.75,
  rpo_alert: 0.75,
  screen: 0.7,
  quick_pass: 0.65,
  outside_run: 0.6,
  counter_run: 0.6,
  qb_draw: 0.55,
  unknown: 0.5,
};

function inferPlayType(playName: string): string {
  const name = playName.toUpperCase();
  if (name.includes("VERTICAL") || name.includes("DAGGER") || name.includes("DEEP")) return "deep_pass";
  if (name.startsWith("PA ") || name.includes("PLAY ACTION")) return "play_action";
  if (name.includes("RPO ALERT")) return "rpo_alert";
  if (name.includes("RPO")) return "medium_pass";
  if (name.includes("READ OPTION") || name.includes("QB POWER") || name.includes("QB ZONE")) return "option_qb_run";
  if (name.includes("SCREEN")) return "screen";
  if (name.includes("SLANT") || name.includes("STICK") || name.includes("QUICK")) return "quick_pass";
  if (name.includes("COUNTER") || name.includes("POWER O")) return "counter_run";
  if (name.includes("ZONE") || name.includes("DIVE") || name.includes("STRETCH")) return "inside_run";
  return "unknown";
}

export function getRecommendations(
  scenario: Scenario,
  playSheet: PlaySheetPlay[],
  gameState: GameState,
  usedThisDrive: string[],
): PlaySheetPlay[] {
  const scoped = playSheet.filter((p) => p.scenario === scenario);
  const scored = scoped.map((p) => {
    const pt = inferPlayType(p.playName);
    let score = PLAY_TYPE_WEIGHTS[pt] ?? PLAY_TYPE_WEIGHTS.unknown;
    if (p.playName.toUpperCase().startsWith("MTN")) score += 0.1;
    if (usedThisDrive.includes(p.id)) score -= 0.15;
    if (scenario === "Goal Line" && p.formation.startsWith("Pistol")) score += 0.1;
    if (scenario === "2-Minute Drill" && p.formation.startsWith("Gun Empty")) score += 0.1;
    if (gameState.scoreContext === "DOWN_7_PLUS" && gameState.quarter === 4 && pt.includes("run")) score -= 0.2;
    return { play: p, score };
  });
  return scored.sort((a, b) => b.score - a.score).slice(0, 3).map((s) => s.play);
}
