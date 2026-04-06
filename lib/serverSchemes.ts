import { getStaticSchemeDetail, getStaticSchemes, SCHEME_IDS } from "@/lib/staticData";
import { getSupabase } from "@/lib/supabase";
import type { Scheme, SchemeDetail, SchemeFormation } from "@/lib/types";

const SCHEME_ORDER = Object.values(SCHEME_IDS);

function sortSchemesLikeMvp(list: Scheme[]): Scheme[] {
  return [...list].sort(
    (a, b) =>
      SCHEME_ORDER.indexOf(a.id as (typeof SCHEME_ORDER)[number]) -
      SCHEME_ORDER.indexOf(b.id as (typeof SCHEME_ORDER)[number]),
  );
}

export async function loadSchemes(): Promise<Scheme[]> {
  const supabase = getSupabase();
  if (!supabase) return getStaticSchemes();

  const { data, error } = await supabase
    .from("schemes")
    .select("id,name,coach_name,description,tempo,cfb26_playbook,created_at")
    .order("name", { ascending: true });

  if (error || !data?.length) return getStaticSchemes();
  return sortSchemesLikeMvp(data as Scheme[]);
}

function sortedCalls(calls: SchemeDetail["situational_calls"]) {
  return [...calls].sort((a, b) => a.priority - b.priority);
}

/** One row per position — avoids tripled UI when seed.sql was applied multiple times before unique index. */
function dedupePlayerTypesByPosition(
  rows: SchemeDetail["scheme_player_types"],
): SchemeDetail["scheme_player_types"] {
  const sorted = [...rows].sort((a, b) => {
    const ta = a.created_at ?? "";
    const tb = b.created_at ?? "";
    if (ta !== tb) return ta.localeCompare(tb);
    return a.id.localeCompare(b.id);
  });
  const seen = new Set<string>();
  const out: SchemeDetail["scheme_player_types"] = [];
  for (const r of sorted) {
    if (seen.has(r.position)) continue;
    seen.add(r.position);
    out.push(r);
  }
  return out;
}

/** Prefer DB rows; fill gaps from static so new roster slots ship before re-seed (avoids flash-then-vanish). */
function mergePlayerTypesWithFallback(
  dbDeduped: SchemeDetail["scheme_player_types"],
  staticRows: SchemeDetail["scheme_player_types"],
): SchemeDetail["scheme_player_types"] {
  const have = new Set(dbDeduped.map((r) => r.position));
  const extra = staticRows.filter((r) => !have.has(r.position));
  return [...dbDeduped, ...extra];
}

function mergeFormationsWithFallback(
  dbDeduped: SchemeDetail["scheme_formations"],
  staticRows: SchemeDetail["scheme_formations"],
): SchemeDetail["scheme_formations"] {
  const have = new Set(dbDeduped.map((r) => r.formation_name));
  const extra = staticRows.filter((r) => !have.has(r.formation_name));
  return [...dbDeduped, ...extra];
}

function mergeCallsWithFallback(
  dbDeduped: SchemeDetail["situational_calls"],
  staticRows: SchemeDetail["situational_calls"],
): SchemeDetail["situational_calls"] {
  const have = new Set(dbDeduped.map((r) => r.situation));
  const extra = staticRows.filter((r) => !have.has(r.situation));
  return [...dbDeduped, ...extra];
}

/** Matches `FormationPanel` group order — DB returns arbitrary order without this. */
const FORMATION_GROUP_RANK: Record<string, number> = {
  "Core Passing": 0,
  "RPO/Run": 1,
  "Red Zone": 2,
  "3rd Down": 3,
};

function formationGroupSortKey(g: string | null): number {
  if (g == null) return 99;
  return g in FORMATION_GROUP_RANK ? FORMATION_GROUP_RANK[g]! : 50;
}

/** Stable playbook order: use static sequence when known, else group + name. */
function sortFormationsForDisplay(
  rows: SchemeFormation[],
  playbookOrder: SchemeFormation[],
): SchemeFormation[] {
  const indexByName = new Map(
    playbookOrder.map((f, i) => [f.formation_name, i] as const),
  );
  return [...rows].sort((a, b) => {
    const ia = indexByName.get(a.formation_name);
    const ib = indexByName.get(b.formation_name);
    if (ia !== undefined && ib !== undefined && ia !== ib) return ia - ib;
    if (ia !== undefined && ib === undefined) return -1;
    if (ia === undefined && ib !== undefined) return 1;
    const ga = formationGroupSortKey(a.formation_group);
    const gb = formationGroupSortKey(b.formation_group);
    if (ga !== gb) return ga - gb;
    return a.formation_name.localeCompare(b.formation_name);
  });
}

function dedupeFormationsByName(
  rows: SchemeDetail["scheme_formations"],
): SchemeDetail["scheme_formations"] {
  const sorted = [...rows].sort((a, b) => {
    const ta = a.created_at ?? "";
    const tb = b.created_at ?? "";
    if (ta !== tb) return ta.localeCompare(tb);
    return a.id.localeCompare(b.id);
  });
  const seen = new Set<string>();
  const out: SchemeDetail["scheme_formations"] = [];
  for (const r of sorted) {
    const key = r.formation_name;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(r);
  }
  return out;
}

function dedupeSituationalCallsBySituation(
  rows: SchemeDetail["situational_calls"],
): SchemeDetail["situational_calls"] {
  const sorted = [...rows].sort((a, b) => {
    const ta = a.created_at ?? "";
    const tb = b.created_at ?? "";
    if (ta !== tb) return ta.localeCompare(tb);
    if (a.priority !== b.priority) return a.priority - b.priority;
    return a.id.localeCompare(b.id);
  });
  const seen = new Set<string>();
  const out: SchemeDetail["situational_calls"] = [];
  for (const r of sorted) {
    if (seen.has(r.situation)) continue;
    seen.add(r.situation);
    out.push(r);
  }
  return out;
}

export async function loadSchemeDetail(id: string): Promise<SchemeDetail | null> {
  const fallback = getStaticSchemeDetail(id);
  const supabase = getSupabase();

  if (!supabase) {
    return fallback;
  }

  const { data: scheme, error: schemeError } = await supabase
    .from("schemes")
    .select("id,name,coach_name,description,tempo,cfb26_playbook,created_at")
    .eq("id", id)
    .maybeSingle();

  if (schemeError || !scheme) {
    return fallback;
  }

  const [ptRes, formRes, callRes] = await Promise.all([
    supabase.from("scheme_player_types").select("*").eq("scheme_id", id),
    supabase
      .from("scheme_formations")
      .select("*")
      .eq("scheme_id", id)
      .order("formation_name", { ascending: true }),
    supabase
      .from("situational_calls")
      .select("*")
      .eq("scheme_id", id)
      .order("priority", { ascending: true }),
  ]);

  const playerTypes = dedupePlayerTypesByPosition(
    (ptRes.data ?? []) as SchemeDetail["scheme_player_types"],
  );
  const formations = dedupeFormationsByName(
    (formRes.data ?? []) as SchemeDetail["scheme_formations"],
  );
  const calls = dedupeSituationalCallsBySituation(
    (callRes.data ?? []) as SchemeDetail["situational_calls"],
  );

  const base: SchemeDetail = {
    ...(scheme as Scheme),
    scheme_player_types: playerTypes,
    scheme_formations: formations,
    situational_calls: sortedCalls(calls),
  };

  if (!fallback) {
    return {
      ...base,
      scheme_formations: sortFormationsForDisplay(base.scheme_formations, []),
    };
  }

  return {
    ...base,
    scheme_player_types: mergePlayerTypesWithFallback(
      base.scheme_player_types,
      fallback.scheme_player_types,
    ),
    scheme_formations: sortFormationsForDisplay(
      mergeFormationsWithFallback(
        base.scheme_formations,
        fallback.scheme_formations,
      ),
      fallback.scheme_formations,
    ),
    situational_calls: sortedCalls(
      mergeCallsWithFallback(base.situational_calls, fallback.situational_calls),
    ),
  };
}
