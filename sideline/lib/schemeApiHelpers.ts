import {
  parseCatalogSideOfBall,
  type CatalogSideOfBall,
} from "@/lib/constants";
import { playbookIlikeExactPattern } from "@/lib/playbookIlikeExact";
import { sheetCfb26Playbook } from "@/lib/playbookUtils";
import type { SupabaseClient } from "@supabase/supabase-js";

export type SchemeCallSheetInput = {
  call_sheet_id: string;
  side_of_ball: CatalogSideOfBall;
};

export type SchemeCallSheetRow = {
  scheme_id: string;
  call_sheet_id: string;
  side_of_ball: CatalogSideOfBall;
  user_id: string;
  created_at: string;
};

type CallSheetRow = {
  id: string;
  name: string;
  cfb26_playbook: string | null;
  playbook: string;
  scheme: string;
};

export type AttachedCallSheet = {
  call_sheet_id: string;
  side_of_ball: CatalogSideOfBall;
  call_sheet: {
    id: string;
    name: string;
    cfb26_playbook: string;
    scheme: string;
  };
};

const SIDE_REQUIRED_MESSAGE = "At least one call sheet is required";
const DUPLICATE_SIDE_MESSAGE = "A scheme can have only one offensive and one defensive call sheet";
const SHEET_NOT_FOUND_MESSAGE = "Call sheet not found";
const SIDE_MISMATCH_MESSAGE = "Call sheet side does not match the selected side of ball";

export async function assertSchemeOwnership(
  supabase: SupabaseClient,
  schemeId: string,
  userId: string,
): Promise<{ error?: string }> {
  const { data, error } = await supabase
    .from("schemes")
    .select("id")
    .eq("id", schemeId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) return { error: "Couldn't finish that. Try again." };
  if (!data) return { error: "Not found" };
  return {};
}

async function resolveCallSheetSideOfBall(
  supabase: SupabaseClient,
  callSheet: CallSheetRow,
): Promise<CatalogSideOfBall | null> {
  const playbookName = sheetCfb26Playbook(callSheet);
  if (!playbookName) return null;

  const { data, error } = await supabase
    .from("playbooks")
    .select("side_of_ball")
    .ilike("playbook", playbookIlikeExactPattern(playbookName))
    .not("playbook", "is", null)
    .limit(1);

  if (error) {
    console.error("resolveCallSheetSideOfBall:", error);
    return null;
  }

  return parseCatalogSideOfBall(data?.[0]?.side_of_ball as string | undefined);
}

export function validateCallSheetInputs(
  callSheets: SchemeCallSheetInput[] | undefined,
): { error?: string; normalized?: SchemeCallSheetInput[] } {
  if (!callSheets || callSheets.length === 0) {
    return { error: SIDE_REQUIRED_MESSAGE };
  }

  const normalized: SchemeCallSheetInput[] = [];
  const seenSides = new Set<CatalogSideOfBall>();
  const seenSheets = new Set<string>();

  for (const entry of callSheets) {
    const callSheetId = String(entry.call_sheet_id ?? "").trim();
    const side = parseCatalogSideOfBall(entry.side_of_ball);
    if (!callSheetId || !side) {
      return { error: "Each call sheet requires call_sheet_id and side_of_ball" };
    }
    if (seenSides.has(side)) {
      return { error: DUPLICATE_SIDE_MESSAGE };
    }
    if (seenSheets.has(callSheetId)) {
      return { error: "Each call sheet can only be attached once" };
    }
    seenSides.add(side);
    seenSheets.add(callSheetId);
    normalized.push({ call_sheet_id: callSheetId, side_of_ball: side });
  }

  return { normalized };
}

export async function validateOwnedCallSheets(
  supabase: SupabaseClient,
  userId: string,
  callSheets: SchemeCallSheetInput[],
): Promise<{ error?: string; rows?: CallSheetRow[] }> {
  const ids = callSheets.map((c) => c.call_sheet_id);
  const { data, error } = await supabase
    .from("play_sheets")
    .select("id, name, cfb26_playbook, playbook, scheme")
    .eq("user_id", userId)
    .in("id", ids);

  if (error) {
    console.error("validateOwnedCallSheets:", error);
    return { error: "Couldn't finish that. Try again." };
  }

  const rows = (data ?? []) as CallSheetRow[];
  if (rows.length !== ids.length) {
    return { error: SHEET_NOT_FOUND_MESSAGE };
  }

  const byId = new Map(rows.map((row) => [row.id, row]));
  for (const entry of callSheets) {
    const sheet = byId.get(entry.call_sheet_id);
    if (!sheet) return { error: SHEET_NOT_FOUND_MESSAGE };
    const catalogSide = await resolveCallSheetSideOfBall(supabase, sheet);
    if (catalogSide && catalogSide !== entry.side_of_ball) {
      return { error: SIDE_MISMATCH_MESSAGE };
    }
  }

  return { rows };
}

export async function replaceSchemeCallSheets(
  supabase: SupabaseClient,
  userId: string,
  schemeId: string,
  callSheets: SchemeCallSheetInput[],
): Promise<{ error?: string }> {
  const { error: deleteError } = await supabase
    .from("scheme_call_sheets")
    .delete()
    .eq("scheme_id", schemeId)
    .eq("user_id", userId);

  if (deleteError) {
    console.error("scheme_call_sheets delete:", deleteError);
    return { error: "Couldn't finish that. Try again." };
  }

  const insertRows = callSheets.map((entry) => ({
    scheme_id: schemeId,
    call_sheet_id: entry.call_sheet_id,
    side_of_ball: entry.side_of_ball,
    user_id: userId,
  }));

  const { error: insertError } = await supabase.from("scheme_call_sheets").insert(insertRows);
  if (insertError) {
    console.error("scheme_call_sheets insert:", insertError);
    if (insertError.code === "23505") {
      return { error: DUPLICATE_SIDE_MESSAGE };
    }
    return { error: "Couldn't finish that. Try again." };
  }

  return {};
}

export async function fetchAttachedCallSheets(
  supabase: SupabaseClient,
  userId: string,
  schemeId: string,
): Promise<AttachedCallSheet[]> {
  const { data, error } = await supabase
    .from("scheme_call_sheets")
    .select("call_sheet_id, side_of_ball, play_sheets(id, name, cfb26_playbook, playbook, scheme)")
    .eq("scheme_id", schemeId)
    .eq("user_id", userId)
    .order("side_of_ball", { ascending: true });

  if (error) {
    console.error("fetchAttachedCallSheets:", error);
    return [];
  }

  return (data ?? []).flatMap((row) => {
    const side = parseCatalogSideOfBall(row.side_of_ball as string);
    const embedded = row.play_sheets;
    const sheet = (Array.isArray(embedded) ? embedded[0] : embedded) as CallSheetRow | null;
    if (!side || !sheet) return [];
    return [{
      call_sheet_id: row.call_sheet_id as string,
      side_of_ball: side,
      call_sheet: {
        id: sheet.id,
        name: sheet.name,
        cfb26_playbook: sheetCfb26Playbook(sheet),
        scheme: sheet.scheme?.trim() || "Multiple",
      },
    }];
  });
}

export async function countSchemeCallSheets(
  supabase: SupabaseClient,
  userId: string,
  schemeId: string,
): Promise<number> {
  const { count, error } = await supabase
    .from("scheme_call_sheets")
    .select("call_sheet_id", { count: "exact", head: true })
    .eq("scheme_id", schemeId)
    .eq("user_id", userId);

  if (error) {
    console.error("countSchemeCallSheets:", error);
    return 0;
  }
  return count ?? 0;
}
