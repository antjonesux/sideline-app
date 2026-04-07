import { listCoverageAffinities } from "@/lib/serverGameSessions";
import { STATIC_COVERAGE_AFFINITIES } from "@/lib/staticMvp4Rules";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const rows = await listCoverageAffinities();
  return NextResponse.json(
    rows.length ? rows : STATIC_COVERAGE_AFFINITIES,
  );
}
