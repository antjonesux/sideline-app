import { getStaticSchemeDetail, getStaticSchemes, SCHEME_IDS } from "@/lib/staticData";
import { getSupabase } from "@/lib/supabase";
import type { Scheme, SchemeDetail } from "@/lib/types";

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
    supabase.from("scheme_formations").select("*").eq("scheme_id", id),
    supabase
      .from("situational_calls")
      .select("*")
      .eq("scheme_id", id)
      .order("priority", { ascending: true }),
  ]);

  const playerTypes = ptRes.data ?? [];
  const formations = formRes.data ?? [];
  const calls = callRes.data ?? [];

  const base: SchemeDetail = {
    ...(scheme as Scheme),
    scheme_player_types: playerTypes as SchemeDetail["scheme_player_types"],
    scheme_formations: formations as SchemeDetail["scheme_formations"],
    situational_calls: sortedCalls(
      calls as SchemeDetail["situational_calls"],
    ),
  };

  if (!fallback) {
    return base;
  }

  return {
    ...base,
    scheme_player_types:
      base.scheme_player_types.length > 0
        ? base.scheme_player_types
        : fallback.scheme_player_types,
    scheme_formations:
      base.scheme_formations.length > 0
        ? base.scheme_formations
        : fallback.scheme_formations,
    situational_calls:
      base.situational_calls.length > 0
        ? base.situational_calls
        : fallback.situational_calls,
  };
}
