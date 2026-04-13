import { validateAllRows, type CsvRowInput, type ParsedCsvRow } from "@/lib/importCsv";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as { rows?: CsvRowInput[] } | null;
  const rows = body?.rows;
  if (!Array.isArray(rows)) {
    return NextResponse.json({ error: "Expected { rows: [...] }" }, { status: 400 });
  }

  const parsed: ParsedCsvRow[] = rows.map((r, i) => ({
    ...r,
    _line: i + 2,
  }));

  const { valid_rows, errors } = validateAllRows(parsed);

  return NextResponse.json({
    valid_rows,
    errors,
    summary: {
      total_rows: parsed.length,
      valid_count: valid_rows.length,
      error_count: parsed.length - valid_rows.length,
    },
  });
}
