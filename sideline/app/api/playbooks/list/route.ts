import { fetchDistinctTendenciesPlaybooks } from "@/lib/tendenciesServer";
import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";

export async function GET() {
  const playbooks = await fetchDistinctTendenciesPlaybooks(supabase);
  return NextResponse.json({ playbooks });
}
