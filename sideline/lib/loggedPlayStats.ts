import { isStandardSuccessfulPlay } from "@/lib/loggedPlaySuccess";
import { normalizePlayName } from "@/lib/utils";

export type ComboStats = { uses: number; avg_yards: number; success_rate: number };

export type LoggedPlayStatRow = {
  formation: string;
  play_name: string;
  yards_gained: number | null;
  result_tag?: string | null;
  down?: number | null;
  distance?: number | null;
};

export function comboKey(formation: string, playName: string): string {
  return `${formation.trim().toLowerCase()}\t${normalizePlayName(playName).toLowerCase()}`;
}

/** Aggregate by formation + play and by formation only (same scenario slice). */
export function aggregateLoggedPlays(rows: LoggedPlayStatRow[]): {
  byCombo: Map<string, ComboStats>;
  byFormation: Map<string, { uses: number; success_rate: number }>;
  comboDisplay: Map<string, { formation: string; play_name: string }>;
} {
  const comboBuckets = new Map<string, { yards: number[]; successes: number }>();
  const formBuckets = new Map<string, { n: number; successes: number }>();
  const comboDisplay = new Map<string, { formation: string; play_name: string }>();

  for (const r of rows) {
    const f = (r.formation ?? "").trim();
    const p = (r.play_name ?? "").trim();
    if (!f || !p) continue;

    const ck = comboKey(f, p);
    if (!comboDisplay.has(ck)) {
      comboDisplay.set(ck, { formation: f, play_name: p });
    }
    const y = r.yards_gained ?? 0;
    const ok = isStandardSuccessfulPlay(r);
    const cur = comboBuckets.get(ck) ?? { yards: [], successes: 0 };
    cur.yards.push(y);
    if (ok) cur.successes += 1;
    comboBuckets.set(ck, cur);

    const fb = formBuckets.get(f) ?? { n: 0, successes: 0 };
    fb.n += 1;
    if (ok) fb.successes += 1;
    formBuckets.set(f, fb);
  }

  const byCombo = new Map<string, ComboStats>();
  for (const [k, v] of comboBuckets) {
    const uses = v.yards.length;
    const avg_yards = uses ? Math.round((v.yards.reduce((a, b) => a + b, 0) / uses) * 10) / 10 : 0;
    const success_rate = uses ? Math.round((v.successes / uses) * 100) : 0;
    byCombo.set(k, { uses, avg_yards, success_rate });
  }

  const byFormation = new Map<string, { uses: number; success_rate: number }>();
  for (const [f, v] of formBuckets) {
    byFormation.set(f, {
      uses: v.n,
      success_rate: v.n ? Math.round((v.successes / v.n) * 100) : 0,
    });
  }

  return { byCombo, byFormation, comboDisplay };
}

export type SuggestionRow = {
  formation: string;
  play_name: string;
  uses: number;
  success_rate: number;
  pooled?: boolean;
};

/** Laplace-smoothed success score: handles low-N combos without over-ranking single-use flukes. */
function smoothedScore(successes: number, uses: number): number {
  return (successes + 1) / (uses + 2);
}

function meetsFloor(s: ComboStats): boolean {
  if (s.uses === 1) return s.success_rate >= 100;
  return s.uses >= 2 && s.success_rate >= 50;
}

/**
 * Build up to `limit` suggestions from formation+play combo stats.
 *
 * `candidateByCombo` is the widened (pooled + exact) aggregate used to discover
 * candidates. When `exactByCombo` is provided, each candidate's displayed
 * stats come from exact-scenario data if available (honest numbers for the tab);
 * only combos absent from the exact set use pooled stats and get `pooled: true`.
 */
export function buildSuggestions(
  candidateByCombo: Map<string, ComboStats>,
  sheetKeys: Set<string>,
  comboDisplay?: Map<string, { formation: string; play_name: string }>,
  limit = 3,
  exactByCombo?: Map<string, ComboStats>,
): SuggestionRow[] {
  const out: SuggestionRow[] = [];
  for (const [k] of candidateByCombo) {
    if (sheetKeys.has(k)) continue;

    const exactStats = exactByCombo?.get(k);
    const isPooledRow = exactByCombo ? !exactStats : false;
    const displayStats = exactStats ?? candidateByCombo.get(k)!;

    if (!meetsFloor(displayStats)) continue;

    const display = comboDisplay?.get(k);
    const [formation, play_name] = display ? [display.formation, display.play_name] : k.split("\t");
    if (!formation || !play_name) continue;
    out.push({
      formation,
      play_name,
      uses: displayStats.uses,
      success_rate: displayStats.success_rate,
      ...(isPooledRow ? { pooled: true } : {}),
    });
  }

  const successes = (s: SuggestionRow) => Math.round((s.success_rate / 100) * s.uses);
  out.sort((a, b) => {
    const multiA = a.uses >= 2 ? 1 : 0;
    const multiB = b.uses >= 2 ? 1 : 0;
    if (multiB !== multiA) return multiB - multiA;
    const sa = smoothedScore(successes(a), a.uses);
    const sb = smoothedScore(successes(b), b.uses);
    if (sb !== sa) return sb - sa;
    return b.success_rate - a.success_rate || b.uses - a.uses;
  });

  return out.slice(0, limit);
}
