import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function DELETE() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  let admin;
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
    // Order respects FK constraints:
    // 1. game_sessions → cascades drives + logged_plays
    // 2. play_sheets  → cascades play_sheet_scenarios, play_sheet_plays, dismissed_suggestions
    // 3. user_profiles
    await admin.from("game_sessions").delete().eq("user_id", uid);
    await admin.from("play_sheets").delete().eq("user_id", uid);
    await admin.from("user_profiles").delete().eq("user_id", uid);

    const { error: deleteError } = await admin.auth.admin.deleteUser(uid);
    if (deleteError) {
      return NextResponse.json({ error: "Couldn't delete account. Try again." }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Couldn't delete account. Try again." }, { status: 500 });
  }
}
