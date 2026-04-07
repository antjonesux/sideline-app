import { listFieldPositionRules } from "@/lib/serverGameSessions";
import { STATIC_FIELD_POSITION_RULES } from "@/lib/staticMvp4Rules";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const rows = await listFieldPositionRules();
  return NextResponse.json(
    rows.length ? rows : STATIC_FIELD_POSITION_RULES,
  );
}
