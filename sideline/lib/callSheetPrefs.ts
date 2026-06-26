import { COULDNT_FINISH_THAT } from "@/lib/coachCopy";
import type { SupabaseClient } from "@supabase/supabase-js";

async function findMostRecentCallSheetId(
  supabase: SupabaseClient,
  userId: string,
): Promise<string | null> {
  const { data: sheet, error } = await supabase
    .from("play_sheets")
    .select("id")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("play_sheets active fallback:", error);
    return null;
  }

  return (sheet?.id as string | undefined) ?? null;
}

async function callSheetExistsForUser(
  supabase: SupabaseClient,
  userId: string,
  callSheetId: string,
): Promise<boolean | null> {
  const { data: sheet, error } = await supabase
    .from("play_sheets")
    .select("id")
    .eq("id", callSheetId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("play_sheets active validation read:", error);
    return null;
  }

  return Boolean(sheet);
}

async function persistActiveCallSheetId(
  supabase: SupabaseClient,
  userId: string,
  callSheetId: string | null,
): Promise<{ error: string | null }> {
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

  const storedId = (prefs?.active_call_sheet_id as string | null | undefined) ?? null;
  if (storedId) {
    const exists = await callSheetExistsForUser(supabase, userId, storedId);
    if (exists === true) return storedId;
    if (exists === null) return storedId;
  }

  const fallbackId = await findMostRecentCallSheetId(supabase, userId);
  if (!fallbackId) return null;

  if (storedId !== fallbackId) {
    await persistActiveCallSheetId(supabase, userId, fallbackId);
  }

  return fallbackId;
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

  return persistActiveCallSheetId(supabase, userId, callSheetId);
}

/** After deleting the active sheet, re-point to the most recently updated remaining sheet (or clear). */
export async function reassignActiveCallSheetAfterDelete(
  supabase: SupabaseClient,
  userId: string,
): Promise<void> {
  const nextId = await findMostRecentCallSheetId(supabase, userId);
  await persistActiveCallSheetId(supabase, userId, nextId);
}

export async function wasActiveCallSheet(
  supabase: SupabaseClient,
  userId: string,
  callSheetId: string,
): Promise<boolean> {
  const { data: prefs, error } = await supabase
    .from("user_call_sheet_prefs")
    .select("active_call_sheet_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("user_call_sheet_prefs read:", error);
    return false;
  }

  return prefs?.active_call_sheet_id === callSheetId;
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
