import { deriveFieldZone, deriveScenario } from "@/lib/derivePlayContext";
import type { Side } from "@/lib/derivePlayContext";
import { fromAbsoluteYard, toAbsoluteYard } from "@/lib/fieldPosition";
import { isCoachCallPlay } from "@/lib/filmPlayCounting";
import type { PlaybookEntry } from "@/lib/playbook";
import type { LoggedPlay } from "@/lib/types";

function biasTerms(down: number, distance: number, fieldPos: number): string[] {
  if (fieldPos >= 85) return ["power", "inside zone", "iso", "stick", "spot", "curl flat"];
  if (down === 1 && distance === 10) return ["inside zone", "outside zone", "rpo", "hb dive"];
  if (down === 2 && distance <= 5) return ["power", "inside zone", "slant", "stick", "spot"];
  if (down === 3 && distance <= 3) return ["sneak", "power", "mesh", "stick"];
  if (down === 3 && distance >= 4 && distance <= 7) return ["mesh", "slant", "spacing", "drive", "flood", "curl flat"];
  if (down === 3 && distance >= 8) return ["four verts", "verticals", "spacing", "post", "y cross"];
  return ["inside zone", "outside zone", "slant", "mesh", "spacing", "stick"];
}

function keywordScore(entry: PlaybookEntry, down: number, distance: number, fieldPos: number): number {
  const terms = biasTerms(down, distance, fieldPos);
  const n = entry.play_name.toLowerCase();
  return terms.reduce((acc, t) => (n.includes(t) ? acc + 1 : acc), 0);
}

function loggedPlayAbsoluteYard(p: LoggedPlay): number {
  const side: Side = p.side === "OPP" ? "OPP" : "OWN";
  const yl = Math.min(50, Math.max(1, Math.round(Number(p.yard_line) || 1)));
  return toAbsoluteYard(side, yl);
}

function scenarioForLoggedPlay(p: LoggedPlay): string {
  const abs = loggedPlayAbsoluteYard(p);
  const { side, yard_line } = fromAbsoluteYard(abs);
  const fieldZone = deriveFieldZone(yard_line, side);
  return deriveScenario(p.down, p.distance, fieldZone);
}

function fieldZoneForAbsolute(abs: number): string {
  const { side, yard_line } = fromAbsoluteYard(abs);
  return deriveFieldZone(yard_line, side);
}

/**
 * Situational-tab suggestions — blends this game's logged calls with situation/scenario match
 * and the same keyword bias used previously, without a separate recommendation API.
 */
export function buildSituationAwareCallingSuggestions(
  playbookEntries: PlaybookEntry[],
  allGameCoachCalls: LoggedPlay[],
  currentScenario: string,
  down: number,
  distance: number,
  fieldPos: number,
  limit = 6,
): PlaybookEntry[] {
  if (playbookEntries.length === 0) return [];

  const catalog = new Map(playbookEntries.map((e) => [e.play_id, e]));
  const currentZone = fieldZoneForAbsolute(fieldPos);

  const byKey = new Map<string, LoggedPlay[]>();
  for (const p of allGameCoachCalls) {
    if (!isCoachCallPlay(p)) continue;
    const key = `${String(p.formation ?? "").trim()}::${String(p.play_name ?? "").trim()}`.toLowerCase();
    if (!key || key === "::") continue;
    const list = byKey.get(key) ?? [];
    list.push(p);
    byKey.set(key, list);
  }

  for (const list of byKey.values()) {
    list.sort((a, b) => {
      const dn = (a.drive_number ?? 0) - (b.drive_number ?? 0);
      if (dn !== 0) return dn;
      return (a.play_number ?? 0) - (b.play_number ?? 0);
    });
  }

  type Scored = { entry: PlaybookEntry; score: number };
  const scored: Scored[] = [];

  for (const [key, calls] of byKey) {
    const entry = catalog.get(key);
    if (!entry) continue;

    let scenarioHits = 0;
    let zoneHits = 0;
    let downHits = 0;
    let distNearHits = 0;
    for (const c of calls) {
      if (scenarioForLoggedPlay(c) === currentScenario) scenarioHits += 1;
      if (fieldZoneForAbsolute(loggedPlayAbsoluteYard(c)) === currentZone) zoneHits += 1;
      if (c.down === down) downHits += 1;
      if (Math.abs(c.distance - distance) <= 2) distNearHits += 1;
    }

    const last = calls[calls.length - 1];
    const lastScenario = last ? scenarioForLoggedPlay(last) : "";
    const lastAbs = last ? loggedPlayAbsoluteYard(last) : 0;
    const lastZone = last ? fieldZoneForAbsolute(lastAbs) : "";

    const score =
      scenarioHits * 95 +
      (lastScenario === currentScenario ? 45 : 0) +
      zoneHits * 22 +
      (last && last.down === down ? 18 : 0) +
      (last && Math.abs(last.distance - distance) <= 2 ? 14 : 0) +
      (lastZone === currentZone ? 12 : 0) +
      distNearHits * 8 +
      downHits * 6 +
      calls.length * 5 +
      keywordScore(entry, down, distance, fieldPos) * 11;

    scored.push({ entry, score });
  }

  scored.sort((a, b) => b.score - a.score || a.entry.play_name.localeCompare(b.entry.play_name));

  const out: PlaybookEntry[] = [];
  const seen = new Set<string>();
  for (const row of scored) {
    if (out.length >= limit) break;
    if (seen.has(row.entry.play_id)) continue;
    seen.add(row.entry.play_id);
    out.push(row.entry);
  }

  if (out.length < limit) {
    const filler = playbookEntries
      .map((entry) => ({
        entry,
        score: keywordScore(entry, down, distance, fieldPos),
      }))
      .filter((r) => r.score > 0 && !seen.has(r.entry.play_id))
      .sort((a, b) => b.score - a.score || a.entry.play_name.localeCompare(b.entry.play_name));

    for (const row of filler) {
      if (out.length >= limit) break;
      seen.add(row.entry.play_id);
      out.push(row.entry);
    }
  }

  return out.slice(0, limit);
}
