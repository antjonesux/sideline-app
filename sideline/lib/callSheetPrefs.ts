import { COULDNT_FINISH_THAT } from "@/lib/coachCopy";
import type { SupabaseClient } from "@supabase/supabase-js";

export async function readActiveCallSheetId(
  supabase: SupabaseClient,
  userId: string,
): Promise<string | null> {
  const { data: prefs, error } = await supabase
    .from("user_call_sheet_prefs")
    .select("active_call_sheet_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("user_call_sheet_prefs read:", error);
    return null;
  }

  if (prefs) {
    return (prefs.active_call_sheet_id as string | null | undefined) ?? null;
  }

  // Legacy accounts without a prefs row: resolve to the most recently updated sheet.
  const { data: sheet, error: sheetErr } = await supabase
    .from("play_sheets")
    .select("id")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (sheetErr) {
    console.error("play_sheets active fallback:", sheetErr);
    return null;
  }

  return (sheet?.id as string | undefined) ?? null;
}

export async function upsertActiveCallSheetId(
  supabase: SupabaseClient,
  userId: string,
  callSheetId: string,
): Promise<{ error: string | null }> {
  const { data: sheet, error: sheetErr } = await supabase
    .from("play_sheets")
    .select("id")
    .eq("id", callSheetId)
    .eq("user_id", userId)
    .maybeSingle();

  if (sheetErr) {
    console.error("play_sheets active validation:", sheetErr);
    return { error: COULDNT_FINISH_THAT };
  }
  if (!sheet) return { error: "Not found" };

  const { error } = await supabase.from("user_call_sheet_prefs").upsert({
    user_id: userId,
    active_call_sheet_id: callSheetId,
    updated_at: new Date().toISOString(),
  });

  if (error) {
    console.error("user_call_sheet_prefs upsert:", error);
    return { error: COULDNT_FINISH_THAT };
  }

  return { error: null };
}

export async function maybeSetActiveOnCreate(
  supabase: SupabaseClient,
  userId: string,
  newSheetId: string,
): Promise<void> {
  const activeId = await readActiveCallSheetId(supabase, userId);
  if (activeId) return;
  await upsertActiveCallSheetId(supabase, userId, newSheetId);
}
