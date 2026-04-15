import type { PlayTypeBucket } from "@/lib/tendenciesPlayType";
import { attachPlayTypes, fetchCfbPlayTypeMap, isSuccessPlay, playbookForGame, type GameRow, type LoggedPlayRow } from "@/lib/tendenciesServer";

export type DriveWithPlays = {
  id: string;
  drive_number: number;
  quarter: number | null;
  score_mine: number | null;
  score_opponent: number | null;
  note: string | null;
  plays: LoggedPlayRow[];
};

function aggregateFormationGame(plays: LoggedPlayRow[]) {
  type A = { uses: number; yards: number; successes: number; rows: LoggedPlayRow[] };
  const m = new Map<string, A>();
  for (const p of plays) {
    const a = m.get(p.formation) ?? { uses: 0, yards: 0, successes: 0, rows: [] };
    a.uses += 1;
    a.yards += p.yards_gained ?? 0;
    if (isSuccessPlay(p)) a.successes += 1;
    a.rows.push(p);
    m.set(p.formation, a);
  }
  return [...m.entries()]
    .map(([formation, a]) => ({
      formation,
      plays: a.uses,
      avg_yards: a.uses ? Math.round((a.yards / a.uses) * 10) / 10 : 0,
      success_rate: a.uses ? Math.round((a.successes * 100) / a.uses) : 0,
      play_rows: [...a.rows].sort((x, y) => (x.play_number ?? 0) - (y.play_number ?? 0)),
    }))
    .sort((x, y) => y.plays - x.plays);
}

function aggregatePlayCombo(plays: LoggedPlayRow[]) {
  type A = { uses: number; yards: number; successes: number };
  const m = new Map<string, A>();
  for (const p of plays) {
    const k = `${p.formation}\u0000${p.play_name}`;
    const a = m.get(k) ?? { uses: 0, yards: 0, successes: 0 };
    a.uses += 1;
    a.yards += p.yards_gained ?? 0;
    if (isSuccessPlay(p)) a.successes += 1;
    m.set(k, a);
  }
  return [...m.entries()].map(([key, a]) => {
    const [formation, play_name] = key.split("\u0000");
    return {
      formation,
      play_name,
      uses: a.uses,
      avg_yards: a.uses ? Math.round((a.yards / a.uses) * 10) / 10 : 0,
      success_rate: a.uses ? Math.round((a.successes * 100) / a.uses) : 0,
    };
  });
}

function formatPlayLine(f: string, n: string) {
  return `${f} → ${n}`;
}

export function buildTendenciesGamePayload(game: GameRow, drives: DriveWithPlays[], cfbTypes: Map<string, string>) {
  const plays = drives.flatMap((d) => d.plays);
  const gamesById = new Map<string, GameRow>([[game.id, game]]);
  const buckets = attachPlayTypes(plays, gamesById, cfbTypes).map((b) => b.bucket);
  let run = 0;
  for (const b of buckets) {
    if (b === "Run") run += 1;
  }
  const passish = plays.length - run;
  const runPct = plays.length ? Math.round((run * 1000) / plays.length) / 10 : 0;
  const passPct = plays.length ? Math.round((passish * 1000) / plays.length) / 10 : 0;

  let successes = 0;
  let yards = 0;
  let tds = 0;
  let turnovers = 0;
  for (const p of plays) {
    if (isSuccessPlay(p)) successes += 1;
    yards += p.yards_gained ?? 0;
    const tag = (p.result_tag ?? "").toUpperCase();
    if (tag === "TOUCHDOWN") tds += 1;
    if (tag === "TURNOVER") turnovers += 1;
  }

  const combos = aggregatePlayCombo(plays);
  const qualified = combos.filter((c) => c.uses >= 2);
  let best = qualified.sort((a, b) => b.success_rate - a.success_rate || b.avg_yards - a.avg_yards)[0];
  if (!best && plays.length) {
    const maxY = [...plays].sort((a, b) => (b.yards_gained ?? 0) - (a.yards_gained ?? 0))[0];
    if (maxY) {
      best = {
        formation: maxY.formation,
        play_name: maxY.play_name,
        uses: 1,
        avg_yards: maxY.yards_gained ?? 0,
        success_rate: isSuccessPlay(maxY) ? 100 : 0,
      };
    }
  }

  let worst = qualified.sort((a, b) => a.success_rate - b.success_rate || a.avg_yards - b.avg_yards)[0];
  if (!worst && combos.length) {
    worst = [...combos].sort((a, b) => a.success_rate - b.success_rate || a.avg_yards - b.avg_yards)[0];
  }

  const formCounts = new Map<string, number>();
  for (const p of plays) {
    formCounts.set(p.formation, (formCounts.get(p.formation) ?? 0) + 1);
  }
  const mostUsed = [...formCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—";

  const formation_breakdown = aggregateFormationGame(plays);

  return {
    stats: {
      play_count: plays.length,
      drive_count: drives.length,
      total_yards: yards,
      tds,
      turnovers,
      success_rate: plays.length ? Math.round((successes * 1000) / plays.length) / 10 : 0,
      avg_yards_per_play: plays.length ? Math.round((yards / plays.length) * 10) / 10 : 0,
      run_pct: runPct,
      pass_pct: passPct,
      most_used_formation: mostUsed,
      best_play: best ? { label: formatPlayLine(best.formation, best.play_name), ...best } : null,
      worst_play: worst ? { label: formatPlayLine(worst.formation, worst.play_name), ...worst } : null,
    },
    formation_breakdown,
    run_pass: { run_pct: runPct, pass_pct: passPct } satisfies { run_pct: number; pass_pct: number },
    play_type_buckets: buckets,
  };
}
