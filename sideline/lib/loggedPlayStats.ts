export type ComboStats = { uses: number; avg_yards: number; success_rate: number };

export type LoggedPlayStatRow = {
  formation: string;
  play_name: string;
  yards_gained: number | null;
  is_success: boolean | null;
};

export function comboKey(formation: string, playName: string): string {
  return `${formation.trim()}\t${playName.trim()}`;
}

/** Aggregate by formation + play and by formation only (same scenario slice). */
export function aggregateLoggedPlays(rows: LoggedPlayStatRow[]): {
  byCombo: Map<string, ComboStats>;
  byFormation: Map<string, { uses: number; success_rate: number }>;
} {
  const comboBuckets = new Map<string, { yards: number[]; successes: number }>();
  const formBuckets = new Map<string, { n: number; successes: number }>();

  for (const r of rows) {
    const f = (r.formation ?? "").trim();
    const p = (r.play_name ?? "").trim();
    if (!f || !p) continue;

    const ck = comboKey(f, p);
    const y = r.yards_gained ?? 0;
    const ok = Boolean(r.is_success);
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

  return { byCombo, byFormation };
}

export type SuggestionRow = { formation: string; play_name: string; uses: number; success_rate: number };

export function buildSuggestions(
  byCombo: Map<string, ComboStats>,
  sheetKeys: Set<string>,
  limit = 3,
): SuggestionRow[] {
  const out: SuggestionRow[] = [];
  for (const [k, s] of byCombo) {
    if (s.uses < 3 || s.success_rate < 60) continue;
    if (sheetKeys.has(k)) continue;
    const [formation, play_name] = k.split("\t");
    if (!formation || !play_name) continue;
    out.push({ formation, play_name, uses: s.uses, success_rate: s.success_rate });
  }
  out.sort((a, b) => b.success_rate - a.success_rate || b.uses - a.uses);
  return out.slice(0, limit);
}
