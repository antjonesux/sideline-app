import { loadGamePlanBundle } from "@/lib/serverGamePlan";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const offensiveSchemeId = searchParams.get("offensiveSchemeId");
  const defensiveScheme = searchParams.get("defensiveScheme");

  if (!offensiveSchemeId || !defensiveScheme) {
    return NextResponse.json(
      { error: "offensiveSchemeId and defensiveScheme are required" },
      { status: 400 },
    );
  }

  const bundle = await loadGamePlanBundle(offensiveSchemeId, defensiveScheme);

  if (!bundle) {
    return NextResponse.json(
      { error: "Game plan not found for this matchup" },
      { status: 404 },
    );
  }

  return NextResponse.json(bundle);
}
