import { loadDefensiveSchemes } from "@/lib/serverGamePlan";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const rows = await loadDefensiveSchemes();
  return NextResponse.json(rows);
}
