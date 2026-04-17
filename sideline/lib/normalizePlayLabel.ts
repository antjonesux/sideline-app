import { normalizePlayName } from "./utils";

/** Strip redundant formation prefix from a play label for list display; applies full play-name normalization. */
export function normalizePlayLabel(playName: string, formation: string): string {
  const raw = normalizePlayName(playName);
  if (!formation) return raw;
  const escaped = formation.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const withoutPrefix = raw.replace(new RegExp(`^${escaped}\\s*(?:[-:>]+)?\\s*`, "i"), "");
  return normalizePlayName(withoutPrefix.trim() || raw);
}

/**
 * One row per **visible** play under a formation. Sheet rows often duplicate the same call as
 * `MTN 01 TRAP` vs `Pistol Full House TE MTN 01 TRAP` — same `normalizePlayLabel`, different raw `play_name`.
 */
export function dedupePlaysByDisplayInFormation<
  T extends { play_name: string; is_new_in_26?: boolean | null; formation_type?: string | null },
>(rows: T[], formation: string): T[] {
  const m = new Map<string, T>();
  for (const row of rows) {
    const dk = normalizePlayLabel(row.play_name, formation);
    const existing = m.get(dk);
    if (!existing) {
      m.set(dk, { ...row, play_name: normalizePlayName(row.play_name) });
      continue;
    }
    const pnA = normalizePlayName(existing.play_name);
    const pnB = normalizePlayName(row.play_name);
    const play_name = pnA.length <= pnB.length ? pnA : pnB;
    m.set(dk, {
      ...existing,
      play_name,
      is_new_in_26: Boolean(existing.is_new_in_26) || Boolean(row.is_new_in_26),
      formation_type: existing.formation_type ?? row.formation_type,
    });
  }
  return [...m.values()];
}
