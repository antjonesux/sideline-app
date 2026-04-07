import { getLatestEndedSessionNotes } from "@/lib/serverGameSessions";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const offensive_scheme_id = searchParams.get("offensive_scheme_id");
  const defensive_scheme = searchParams.get("defensive_scheme");
  if (!offensive_scheme_id || !defensive_scheme) {
    return NextResponse.json(
      { error: "offensive_scheme_id and defensive_scheme required" },
      { status: 400 },
    );
  }
  const notes = await getLatestEndedSessionNotes({
    offensive_scheme_id,
    defensive_scheme,
  });
  return NextResponse.json(notes ?? {});
}
