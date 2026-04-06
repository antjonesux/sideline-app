import { loadSchemes } from "@/lib/serverSchemes";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const schemes = await loadSchemes();
  return NextResponse.json(schemes);
}
