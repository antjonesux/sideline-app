import type {
  PlaySheet,
  PlaySheetListItem,
  PlaySheetPlay,
  PlaySheetWithPlays,
} from "@/lib/playSheetTypes";
import { DEMO_PLAY_SHEET_ID } from "@/lib/playSheetTypes";
import { getSupabase } from "@/lib/supabase";
import { getStaticDemoPlaySheet } from "@/lib/staticPlaySheet";

function sortPlays(plays: PlaySheetPlay[]): PlaySheetPlay[] {
  return [...plays].sort((a, b) => {
    const so = (a.situation_order ?? 0) - (b.situation_order ?? 0);
    if (so !== 0) return so;
    return (a.play_order ?? 0) - (b.play_order ?? 0);
  });
}

export async function listPlaySheets(params?: {
  offensive_scheme_id?: string | null;
}): Promise<PlaySheetListItem[]> {
  const supabase = getSupabase();
  if (!supabase) {
    const demo = getStaticDemoPlaySheet();
    if (!demo) return [];
    if (
      params?.offensive_scheme_id &&
      demo.offensive_scheme_id !== params.offensive_scheme_id
    ) {
      return [];
    }
    return [
      {
        ...demo,
        play_count: demo.plays.length,
      },
    ];
  }

  let q = supabase
    .from("play_sheets")
    .select("id, name, offensive_scheme_id, defensive_scheme, opponent_team, created_at, updated_at")
    .order("updated_at", { ascending: false });

  if (params?.offensive_scheme_id) {
    q = q.eq("offensive_scheme_id", params.offensive_scheme_id);
  }

  const { data: sheets, error } = await q;
  if (error || !sheets?.length) return [];

  const ids = sheets.map((s) => s.id);
  const { data: counts } =
    ids.length > 0
      ? await supabase
          .from("play_sheet_plays")
          .select("play_sheet_id")
          .in("play_sheet_id", ids)
      : { data: [] as { play_sheet_id: string }[] };

  const countMap = new Map<string, number>();
  for (const row of counts ?? []) {
    const id = row.play_sheet_id as string;
    countMap.set(id, (countMap.get(id) ?? 0) + 1);
  }

  return sheets.map((s) => ({
    ...(s as PlaySheet),
    play_count: countMap.get(s.id) ?? 0,
  }));
}

export async function getPlaySheetWithPlays(
  id: string,
): Promise<PlaySheetWithPlays | null> {
  const supabase = getSupabase();
  if (!supabase) {
    if (id === DEMO_PLAY_SHEET_ID) return getStaticDemoPlaySheet();
    return null;
  }

  const { data: sheet, error: sheetErr } = await supabase
    .from("play_sheets")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (sheetErr || !sheet) {
    if (id === DEMO_PLAY_SHEET_ID) return getStaticDemoPlaySheet();
    return null;
  }

  const { data: plays, error: playsErr } = await supabase
    .from("play_sheet_plays")
    .select("*")
    .eq("play_sheet_id", id)
    .order("situation_order", { ascending: true })
    .order("play_order", { ascending: true });

  if (playsErr) return null;

  return {
    ...(sheet as PlaySheet),
    plays: sortPlays((plays ?? []) as PlaySheetPlay[]),
  };
}

export type PlaySheetPlayInsert = Omit<
  PlaySheetPlay,
  "id" | "created_at" | "play_sheet_id"
> & { play_sheet_id: string };

export async function createPlaySheetWithPlays(input: {
  name: string;
  offensive_scheme_id: string;
  defensive_scheme: string;
  opponent_team?: string | null;
  plays: Omit<PlaySheetPlayInsert, "play_sheet_id">[];
}): Promise<PlaySheetWithPlays | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  const { data: sheet, error: insErr } = await supabase
    .from("play_sheets")
    .insert({
      name: input.name,
      offensive_scheme_id: input.offensive_scheme_id,
      defensive_scheme: input.defensive_scheme,
      opponent_team: input.opponent_team ?? null,
    })
    .select()
    .single();

  if (insErr || !sheet) return null;

  const sheetId = sheet.id as string;
  const playRows = input.plays.map((p) => ({
    ...p,
    play_sheet_id: sheetId,
  }));

  const { data: inserted, error: playErr } = await supabase
    .from("play_sheet_plays")
    .insert(playRows)
    .select();

  if (playErr) {
    await supabase.from("play_sheets").delete().eq("id", sheetId);
    return null;
  }

  return {
    ...(sheet as PlaySheet),
    plays: sortPlays((inserted ?? []) as PlaySheetPlay[]),
  };
}

export async function updatePlaySheetMeta(
  id: string,
  patch: Partial<Pick<PlaySheet, "name" | "opponent_team">>,
): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;
  const { error } = await supabase.from("play_sheets").update(patch).eq("id", id);
  return !error;
}

export async function deletePlaySheet(id: string): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;
  const { error } = await supabase.from("play_sheets").delete().eq("id", id);
  return !error;
}

export async function updatePlayRow(
  playId: string,
  patch: Partial<
    Pick<
      PlaySheetPlay,
      | "formation"
      | "play_name"
      | "coaching_note"
      | "counter_formation"
      | "counter_play"
      | "custom_note"
      | "is_featured"
      | "is_used"
      | "situation_order"
      | "play_order"
    >
  >,
): Promise<PlaySheetPlay | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("play_sheet_plays")
    .update(patch)
    .eq("id", playId)
    .select()
    .single();
  if (error || !data) return null;
  return data as PlaySheetPlay;
}

export async function insertPlayRow(
  row: PlaySheetPlayInsert,
): Promise<PlaySheetPlay | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("play_sheet_plays")
    .insert(row)
    .select()
    .single();
  if (error || !data) return null;
  return data as PlaySheetPlay;
}

export async function deletePlayRow(playId: string): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;
  const { error } = await supabase
    .from("play_sheet_plays")
    .delete()
    .eq("id", playId);
  return !error;
}

export async function duplicatePlaySheet(
  sourceId: string,
  newName: string,
): Promise<PlaySheetWithPlays | null> {
  const src = await getPlaySheetWithPlays(sourceId);
  if (!src) return null;

  return createPlaySheetWithPlays({
    name: newName,
    offensive_scheme_id: src.offensive_scheme_id,
    defensive_scheme: src.defensive_scheme,
    opponent_team: src.opponent_team,
    plays: src.plays.map((p) => ({
      situation: p.situation,
      situation_order: p.situation_order,
      play_order: p.play_order,
      formation: p.formation,
      play_name: p.play_name,
      coaching_note: p.coaching_note,
      counter_formation: p.counter_formation,
      counter_play: p.counter_play,
      custom_note: p.custom_note,
      is_featured: p.is_featured,
      is_used: false,
    })),
  });
}

export async function loadCfb26PlaysGrouped(playbook: string): Promise<Map<string, string[]>> {
  const map = new Map<string, string[]>();
  const supabase = getSupabase();
  if (!supabase) return map;

  const { data, error } = await supabase
    .from("cfb26_plays")
    .select("formation, play_name")
    .eq("playbook", playbook)
    .order("formation", { ascending: true })
    .order("play_name", { ascending: true });

  if (error || !data) return map;

  for (const row of data) {
    const f = row.formation as string;
    const n = row.play_name as string;
    if (!map.has(f)) map.set(f, []);
    map.get(f)!.push(n);
  }
  return map;
}

export async function listCfb26Formations(playbook: string): Promise<string[]> {
  const supabase = getSupabase();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("cfb26_plays")
    .select("formation")
    .eq("playbook", playbook);

  if (error || !data) return [];
  const set = new Set<string>();
  for (const row of data) {
    set.add(row.formation as string);
  }
  return Array.from(set).sort();
}

export async function listCfb26PlaysForFormation(
  playbook: string,
  formation: string,
): Promise<{ play_name: string; play_type: string | null; is_new_in_26: boolean }[]> {
  const supabase = getSupabase();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("cfb26_plays")
    .select("play_name, play_type, is_new_in_26")
    .eq("playbook", playbook)
    .eq("formation", formation)
    .order("play_name", { ascending: true });

  if (error || !data) return [];
  return data as {
    play_name: string;
    play_type: string | null;
    is_new_in_26: boolean;
  }[];
}
