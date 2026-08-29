import { COULDNT_FINISH_THAT } from "@/lib/coachCopy";
import { fetchPublicPlaybookList, PUBLIC_PLAYBOOK_API_CACHE_HEADERS } from "@/lib/publicPlaybooksServer";
import { NextResponse } from "next/server";

/** Public CFB27 playbook browse list — no auth. */
export async function GET() {
  try {
    const data = await fetchPublicPlaybookList();
    return NextResponse.json({ data }, { headers: PUBLIC_PLAYBOOK_API_CACHE_HEADERS });
  } catch {
    return NextResponse.json({ error: COULDNT_FINISH_THAT }, { status: 500 });
  }
}
