import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";

/** Distinct CFB26 playbook names from reference plays (for playbook sheet setup). */
export async function GET() {
  const { data, error } = await supabase.from("cfb26_plays").select("playbook").not("playbook", "is", null).limit(50000);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const names = new Set<string>();
  for (const row of data ?? []) {
    const p = String((row as { playbook?: string }).playbook ?? "").trim();
    if (p) names.add(p);
  }

  return NextResponse.json({ playbooks: [...names].sort((a, b) => a.localeCompare(b)) });
}
