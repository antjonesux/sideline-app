import { COULDNT_FINISH_THAT } from "@/lib/coachCopy";
import { parseCatalogSideOfBall } from "@/lib/constants";
import { fetchPublicPlaybookFormations } from "@/lib/publicPlaybooksServer";
import { NextRequest, NextResponse } from "next/server";

type RouteParams = { params: Promise<{ playbookId: string }> };

/** Public CFB27 playbook formations — no auth. `playbookId` is the URL-encoded playbook name. */
export async function GET(req: NextRequest, { params }: RouteParams) {
  const { playbookId: rawId } = await params;
  let playbookName = "";
  try {
    playbookName = decodeURIComponent(rawId ?? "").trim();
  } catch {
    return NextResponse.json({ error: "Playbook not found" }, { status: 404 });
  }

  if (!playbookName) {
    return NextResponse.json({ error: "Playbook not found" }, { status: 404 });
  }

  const preferredSide = parseCatalogSideOfBall(req.nextUrl.searchParams.get("side"));

  try {
    const data = await fetchPublicPlaybookFormations(playbookName, preferredSide);
    if (!data) {
      return NextResponse.json({ error: "Playbook not found" }, { status: 404 });
    }
    return NextResponse.json({ data });
  } catch {
    return NextResponse.json({ error: COULDNT_FINISH_THAT }, { status: 500 });
  }
}
