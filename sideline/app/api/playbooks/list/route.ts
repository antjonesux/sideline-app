import { fetchDistinctTendenciesPlaybooks } from "@/lib/tendenciesServer";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user }, error: userErr } = await supabase.auth.getUser();
  if (userErr || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const playbooks = await fetchDistinctTendenciesPlaybooks(supabase, user.id);
  return NextResponse.json({ playbooks });
}
