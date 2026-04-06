import teams from "@/data/cfb26-team-schemes.json";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(teams);
}
