import { COULDNT_FINISH_THAT } from "@/lib/coachCopy";
import {
  fetchPublicGlobalSearch,
  PUBLIC_SEARCH_API_CACHE_HEADERS,
} from "@/lib/publicPlaybooksServer";
import { NextRequest, NextResponse } from "next/server";

/** Public global playbook lookup search — playbooks, formations, plays. No auth. */
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";

  try {
    const data = await fetchPublicGlobalSearch(q);
    return NextResponse.json({ data }, { headers: PUBLIC_SEARCH_API_CACHE_HEADERS });
  } catch {
    return NextResponse.json({ error: COULDNT_FINISH_THAT }, { status: 500 });
  }
}
