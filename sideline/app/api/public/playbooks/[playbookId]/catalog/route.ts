import { COULDNT_FINISH_THAT } from "@/lib/coachCopy";
import { parseCatalogSideOfBall } from "@/lib/constants";
import {
  fetchPublicPlaybookCatalog,
  PUBLIC_PLAYBOOK_API_CACHE_HEADERS,
} from "@/lib/publicPlaybooksServer";
import { NextRequest, NextResponse } from "next/server";

type RouteParams = { params: Promise<{ playbookId: string }> };

/** Full CFB27 playbook catalog (formations + plays) for within-playbook search. No auth. */
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
    const data = await fetchPublicPlaybookCatalog(playbookName, preferredSide);
    if (!data) {
      return NextResponse.json({ error: "Playbook not found" }, { status: 404 });
    }
    return NextResponse.json({ data }, { headers: PUBLIC_PLAYBOOK_API_CACHE_HEADERS });
  } catch {
    return NextResponse.json({ error: COULDNT_FINISH_THAT }, { status: 500 });
  }
}
