import { matchesFormationPlaySearch } from "@/lib/matchesFormationPlaySearch";
import { normalizePlayLabel } from "@/lib/normalizePlayLabel";
import { playbookIlikeExactPattern } from "@/lib/playbookIlikeExact";
import { normalizePlayName } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { sortFormationTypes } from "@/lib/playbooks/formation-types";
import { NextRequest, NextResponse } from "next/server";

const NO_STORE = { "Cache-Control": "no-store, max-age=0" } as const;

function sanitizeIlikeTerm(raw: string): string {
  return raw.replace(/%/g, "").replace(/,/g, "");
}

function normalizePlayNameForGroup(playName: string, formation: string): string {
  const escaped = formation.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const stripped = playName
    .trim()
    .replace(new RegExp(`^${escaped}\\s*(?:[-:>]+)?\\s*`, "i"), "")
    .replace(/\s+/g, " ")
    .trim();
  return normalizePlayName(stripped || playName.trim());
}

type Cfb26PlayRow = {
  formation: string;
  play_name: string;
  formation_type: string | null;
  is_new_in_26: boolean | null;
  play_type: string | null;
};

/** One row per formation + **display** play (prefix-stripped label); merges sheet spacing + redundant formation-in-name duplicates. */
function dedupeCfb26Rows(rows: Cfb26PlayRow[]): Cfb26PlayRow[] {
  const map = new Map<string, Cfb26PlayRow>();
  for (const row of rows) {
    const f = row.formation.trim() || "Other";
    const displayKey = normalizePlayLabel(row.play_name, f);
    const key = `${f}\t${displayKey}`;
    const pn = normalizePlayName(row.play_name);
    const existing = map.get(key);
    if (!existing) {
      map.set(key, {
        ...row,
        formation: f,
        play_name: pn,
        play_type: row.play_type?.trim() ? row.play_type.trim() : null,
      });
      continue;
    }
    const pnA = normalizePlayName(existing.play_name);
    const pnB = pn;
    const play_name = pnA.length <= pnB.length ? pnA : pnB;
    const mergedType = existing.play_type?.trim() || row.play_type?.trim() || null;
    map.set(key, {
      ...existing,
      formation: f,
      play_name,
      is_new_in_26: Boolean(existing.is_new_in_26) || Boolean(row.is_new_in_26),
      formation_type: existing.formation_type ?? row.formation_type,
      play_type: mergedType,
    });
  }
  return Array.from(map.values());
}

export async function GET(req: NextRequest) {
  const playbook = req.nextUrl.searchParams.get("playbook");
  const formation = req.nextUrl.searchParams.get("formation");
  const searchRaw = req.nextUrl.searchParams.get("search")?.trim() ?? "";
  if (!playbook) {
    return NextResponse.json({ error: "playbook query parameter is required" }, { status: 400, headers: NO_STORE });
  }

  const listAll = req.nextUrl.searchParams.get("list") === "all";
  if (listAll && !formation) {
    const { data, error } = await supabase
      .from("cfb26_plays")
      .select("formation, play_name, formation_type, is_new_in_26, play_type")
      .ilike("playbook", playbookIlikeExactPattern(playbook))
      .order("formation", { ascending: true })
      .order("play_name", { ascending: true })
      .limit(12000);

    if (error) return NextResponse.json({ error: error.message }, { status: 500, headers: NO_STORE });
    const rows = dedupeCfb26Rows(
      (data ?? []).map((r) => ({
        formation: String(r.formation ?? "").trim() || "Other",
        play_name: normalizePlayName(String(r.play_name ?? "")),
        formation_type: r.formation_type ?? null,
        is_new_in_26: r.is_new_in_26 ?? null,
        play_type: String((r as { play_type?: string }).play_type ?? "").trim() || null,
      })),
    ).sort((a, b) => {
      const fc = a.formation.localeCompare(b.formation);
      if (fc !== 0) return fc;
      return a.play_name.localeCompare(b.play_name);
    });
    return NextResponse.json({ rows }, { headers: NO_STORE });
  }

  if (formation) {
    const { data, error } = await supabase
      .from("cfb26_plays")
      .select("play_name, is_new_in_26")
      .ilike("playbook", playbookIlikeExactPattern(playbook))
      .eq("formation", formation)
      .order("play_name", { ascending: true });

    if (error) return NextResponse.json({ error: error.message }, { status: 400, headers: NO_STORE });
    const deduped = new Map<string, { play_name: string; is_new_in_26?: boolean | null }>();
    for (const row of data ?? []) {
      const displayName = normalizePlayNameForGroup(String(row.play_name ?? ""), formation);
      const key = displayName.replace(/\s+/g, "");
      if (!deduped.has(key)) deduped.set(key, { ...row, play_name: displayName });
    }
    return NextResponse.json({ plays: Array.from(deduped.values()) }, { headers: NO_STORE });
  }

  if (searchRaw.length >= 2) {
    const terms = searchRaw
      .split(/\s+/)
      .map((t) => sanitizeIlikeTerm(t))
      .filter((t) => t.length > 0);
    if (terms.length === 0) {
      return NextResponse.json({ grouped: [] }, { headers: NO_STORE });
    }

    let searchQuery = supabase
      .from("cfb26_plays")
      .select("formation, play_name, formation_type, is_new_in_26, play_type")
      .ilike("playbook", playbookIlikeExactPattern(playbook));
    for (const term of terms) {
      const pattern = `%${term}%`.replace(/"/g, '""');
      searchQuery = searchQuery.or(`play_name.ilike."${pattern}",formation.ilike."${pattern}"`);
    }
    const { data, error } = await searchQuery
      .order("formation", { ascending: true })
      .order("play_name", { ascending: true })
      .limit(500);

    if (error) return NextResponse.json({ error: error.message }, { status: 500, headers: NO_STORE });

    const rows = dedupeCfb26Rows(
      (data ?? [])
        .map((row) => ({
          formation: String(row.formation ?? "").trim() || "Other",
          play_name: normalizePlayName(String(row.play_name ?? "")),
          formation_type: row.formation_type ?? null,
          is_new_in_26: row.is_new_in_26 ?? null,
          play_type: String((row as { play_type?: string }).play_type ?? "").trim() || null,
        }))
        .filter((row) => matchesFormationPlaySearch(searchRaw, row.formation, row.play_name)),
    );
    const groupedMap = new Map<string, Cfb26PlayRow[]>();
    for (const play of rows) {
      const f = play.formation;
      if (!groupedMap.has(f)) groupedMap.set(f, []);
      groupedMap.get(f)!.push(play);
    }

    const grouped = Array.from(groupedMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([formationName, plays]) => ({ formation: formationName, plays }));

    return NextResponse.json({ grouped }, { headers: NO_STORE });
  }

  const { data, error } = await supabase
    .from("cfb26_plays")
    .select("formation, formation_type")
    .ilike("playbook", playbookIlikeExactPattern(playbook));

  if (error) return NextResponse.json({ error: error.message }, { status: 400, headers: NO_STORE });

  const byType = new Map<string, Set<string>>();
  for (const row of data ?? []) {
    const t = row.formation_type?.trim() || "Other";
    const f = row.formation?.trim();
    if (!f) continue;
    if (!byType.has(t)) byType.set(t, new Set());
    byType.get(t)!.add(f);
  }

  const groups = Array.from(byType.entries())
    .sort(([ta], [tb]) => sortFormationTypes(ta, tb))
    .map(([formation_type, set]) => ({
      formation_type,
      formations: Array.from(set).sort((a, b) => a.localeCompare(b)),
    }));

  return NextResponse.json({ groups }, { headers: NO_STORE });
}
