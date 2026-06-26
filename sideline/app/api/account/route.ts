import type { SupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const ACCOUNT_DELETE_LOG_PREFIX = "[DELETE /api/account]";

function logDeleteStepFailure(step: string, error: unknown) {
  console.error(`${ACCOUNT_DELETE_LOG_PREFIX} step=${step}`, error);
}

async function deleteForUser(
  admin: SupabaseClient,
  step: string,
  table: string,
  userId: string,
) {
  const { error } = await admin.from(table).delete().eq("user_id", userId);
  if (error) {
    logDeleteStepFailure(step, error);
    return error;
  }
  return null;
}

export async function DELETE() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  let admin: SupabaseClient;
  try {
    admin = createAdminClient();
  } catch {
    return NextResponse.json(
      { error: "Account deletion is not available in this environment." },
      { status: 503 },
    );
  }

  const uid = user.id;

  try {
    // Deletion order: children before parents; app data before auth user.
    // `logged_plays` references `game_sessions` without ON DELETE CASCADE, so
    // `game_sessions` must be deleted only after `logged_plays` and `drives`.
    // `dismissed_suggestions` references `play_sheets` without cascade — remove before `play_sheets`.
    const steps: [string, string][] = [
      ["play_sheet_plays", "play_sheet_plays"],
      ["play_sheet_scenarios", "play_sheet_scenarios"],
      ["dismissed_suggestions", "dismissed_suggestions"],
      ["user_call_sheet_prefs", "user_call_sheet_prefs"],
      ["play_sheets", "play_sheets"],
      ["logged_plays", "logged_plays"],
      ["drives", "drives"],
      ["game_sessions", "game_sessions"],
      ["user_profiles", "user_profiles"],
    ];

    for (const [step, table] of steps) {
      const err = await deleteForUser(admin, step, table, uid);
      if (err) {
        return NextResponse.json({ error: "Couldn't delete account. Try again." }, { status: 500 });
      }
    }

    const { error: deleteError } = await admin.auth.admin.deleteUser(uid);
    if (deleteError) {
      logDeleteStepFailure("auth.admin.deleteUser", deleteError);
      return NextResponse.json({ error: "Couldn't delete account. Try again." }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(`${ACCOUNT_DELETE_LOG_PREFIX} step=unexpected`, error);
    return NextResponse.json({ error: "Couldn't delete account. Try again." }, { status: 500 });
  }
}
