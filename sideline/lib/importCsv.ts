import type { Side } from "@/lib/derivePlayContext";

export const CSV_RESULT_LABELS = [
  "GAIN",
  "FIRST DOWN",
  "TOUCHDOWN",
  "INCOMPLETE",
  "SACK",
  "TURNOVER",
  "NO GAIN",
  "PENALTY",
] as const;

export type CsvResultLabel = (typeof CSV_RESULT_LABELS)[number];

const RESULT_NORMALIZE = new Map<string, string>(
  CSV_RESULT_LABELS.map((label) => [label.replace(/\s+/g, "").toUpperCase(), label]),
);

/** DB `logged_plays.result_tag` values after import. */
export function csvResultLabelToDbTag(label: CsvResultLabel): string {
  switch (label) {
    case "FIRST DOWN":
      return "FIRST_DOWN";
    case "NO GAIN":
      return "NO_GAIN";
    default:
      return label.replace(/\s+/g, "_");
  }
}

export function normalizeCsvResult(raw: string): CsvResultLabel | null {
  const k = raw.trim().replace(/\s+/g, "").toUpperCase();
  const label = RESULT_NORMALIZE.get(k);
  if (!label) return null;
  return label as CsvResultLabel;
}

export type CsvRowInput = {
  drive_number: string;
  play_number: string;
  quarter: string;
  down: string;
  distance: string;
  yard_line: string;
  formation: string;
  play_name: string;
  result: string;
  yards: string;
  score_context?: string;
  note?: string;
};

export type ValidatedImportPlay = {
  drive_number: number;
  play_number: number;
  quarter: number;
  down: number;
  distance: number;
  yard_line: string;
  formation: string;
  play_name: string;
  result: CsvResultLabel;
  result_db: string;
  yards: number;
  score_context?: string;
  note?: string | null;
};

export type RowValidationIssue = { line: number; errors: string[] };

const REQUIRED_KEYS: (keyof CsvRowInput)[] = [
  "drive_number",
  "play_number",
  "quarter",
  "down",
  "distance",
  "yard_line",
  "formation",
  "play_name",
  "result",
  "yards",
];

const YARD_LINE_RE = /^(OWN\s+\d+|OPP\s+\d+|50)$/i;

export function parseYardLineField(raw: string): { side: Side; yard_line: number } | null {
  const s = raw.trim().toUpperCase();
  if (s === "50") return { side: "OWN", yard_line: 50 };
  const own = /^OWN\s+(\d+)$/.exec(s);
  if (own) {
    const n = parseInt(own[1], 10);
    if (n >= 1 && n <= 50) return { side: "OWN", yard_line: n };
    return null;
  }
  const opp = /^OPP\s+(\d+)$/.exec(s);
  if (opp) {
    const n = parseInt(opp[1], 10);
    if (n >= 1 && n <= 50) return { side: "OPP", yard_line: n };
    return null;
  }
  return null;
}

export function parseQuarter(raw: string): number | null {
  const t = raw.trim().toUpperCase();
  if (t === "OT") return 5;
  const n = parseInt(t, 10);
  if (Number.isNaN(n)) return null;
  if (n >= 1 && n <= 4) return n;
  return null;
}

export function parseFinalScore(raw: string): { my_score: number; opponent_score: number } | null {
  const m = raw.trim().match(/^(\d+)\s*[-–]\s*(\d+)$/);
  if (!m) return null;
  return { my_score: parseInt(m[1], 10), opponent_score: parseInt(m[2], 10) };
}

function nonEmpty(v: string | undefined): boolean {
  return v !== undefined && String(v).trim() !== "";
}

/** Field-level validation only (no cross-row rules). */
export function validateRowFields(row: CsvRowInput): string[] {
  const errors: string[] = [];
  for (const key of REQUIRED_KEYS) {
    if (!nonEmpty(row[key])) errors.push(`Missing ${key}`);
  }
  if (errors.length) return errors;

  if (!normalizeCsvResult(row.result)) errors.push(`Invalid result "${row.result.trim()}"`);

  if (parseQuarter(row.quarter) === null) errors.push(`Invalid quarter "${row.quarter.trim()}"`);

  const down = parseInt(row.down, 10);
  if (Number.isNaN(down) || down < 1 || down > 4) errors.push(`Invalid down "${row.down}"`);

  const distance = parseInt(row.distance, 10);
  if (Number.isNaN(distance) || distance < 1) errors.push(`Invalid distance "${row.distance}"`);

  if (!YARD_LINE_RE.test(row.yard_line.trim())) errors.push("Invalid yard_line format");
  else if (!parseYardLineField(row.yard_line)) errors.push("Could not parse yard line");

  const yardsStr = row.yards.trim().replace(/,/g, "");
  if (yardsStr === "" || Number.isNaN(Number(yardsStr))) errors.push("Yards must be numeric");

  const dn = parseInt(row.drive_number, 10);
  const pn = parseInt(row.play_number, 10);
  if (Number.isNaN(dn) || dn < 1) errors.push("Invalid drive_number");
  if (Number.isNaN(pn) || pn < 1) errors.push("Invalid play_number");

  const note = row.note?.trim() ?? "";
  if (note.length > 60) errors.push("note exceeds 60 characters");

  return errors;
}

export type ParsedCsvRow = CsvRowInput & { _line: number };

function rowToValidated(row: CsvRowInput): ValidatedImportPlay | null {
  const resultNorm = normalizeCsvResult(row.result);
  const q = parseQuarter(row.quarter);
  if (!resultNorm || q === null) return null;
  const yardsStr = row.yards.trim().replace(/,/g, "");
  const yards = Number(yardsStr);
  if (Number.isNaN(yards)) return null;
  const dn = parseInt(row.drive_number, 10);
  const pn = parseInt(row.play_number, 10);
  const down = parseInt(row.down, 10);
  const dist = parseInt(row.distance, 10);
  if ([dn, pn, down, dist].some((n) => Number.isNaN(n))) return null;
  const noteTrim = row.note?.trim() ?? "";
  return {
    drive_number: dn,
    play_number: pn,
    quarter: q,
    down,
    distance: dist,
    yard_line: row.yard_line.trim(),
    formation: row.formation.trim(),
    play_name: row.play_name.trim(),
    result: resultNorm,
    result_db: csvResultLabelToDbTag(resultNorm),
    yards,
    score_context: row.score_context?.trim() || undefined,
    note: noteTrim.length ? noteTrim.slice(0, 60) : null,
  };
}

export function validateAllRows(rows: ParsedCsvRow[]): {
  valid_rows: ValidatedImportPlay[];
  errors: RowValidationIssue[];
} {
  const byLine = new Map<number, string[]>();
  const add = (line: number, msg: string) => {
    const cur = byLine.get(line) ?? [];
    cur.push(msg);
    byLine.set(line, cur);
  };

  const sorted = [...rows].sort((a, b) => parseInt(a.play_number, 10) - parseInt(b.play_number, 10));

  sorted.forEach((r, i) => {
    const expected = i + 1;
    const pn = parseInt(r.play_number, 10);
    if (Number.isNaN(pn) || pn !== expected) {
      add(r._line, `play_number must be sequential starting at 1 (expected ${expected}, got ${Number.isNaN(pn) ? "?" : pn})`);
    }
  });

  let prevDrive = 0;
  for (const r of sorted) {
    const d = parseInt(r.drive_number, 10);
    if (!Number.isNaN(d)) {
      if (d < prevDrive) add(r._line, "drive_number decreased vs prior play in order");
      prevDrive = Math.max(prevDrive, d);
    }
  }

  for (const r of sorted) {
    for (const e of validateRowFields(r)) add(r._line, e);
  }

  const errors: RowValidationIssue[] = [...byLine.entries()].map(([line, errs]) => ({
    line,
    errors: [...new Set(errs)],
  }));

  const badLines = new Set(errors.map((e) => e.line));
  const valid_rows: ValidatedImportPlay[] = [];
  for (const r of sorted) {
    if (badLines.has(r._line)) continue;
    const v = rowToValidated(r);
    if (v) valid_rows.push(v);
  }

  return { valid_rows, errors };
}
