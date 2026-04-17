/**
 * Zero-width / bidi / invisible characters (paste from PDF/HTML/Excel).
 * LRM/RLM and embed chars sit *between* digits and block `0 1` → `01` merge if not removed.
 */
const STRIP_INVISIBLE =
  /[\u200B-\u200F\u202A-\u202E\u2060-\u2064\u2066-\u2069\uFEFF]/g;

/** Middle dot / bullet variants used as separators in some sheet exports. */
const SEPARATOR_DOTS = /[\u00B7\u2022\u2219\u22C5]/g;

/**
 * Normalizes a play name for storage, deduping, and display:
 * - Unicode **NFKC** compatibility decomposition
 * - Strip zero-width / bidi controls and **Unicode format** chars (`\p{Cf}`) so hidden marks do not split tokens
 * - Map common dot-separators to space, then **all Unicode space separators** (`\p{Zs}`)
 * - Collapse ASCII whitespace — fixes strings like `MTN  0  1  TRAP` with odd spacing
 * - Trim, uppercase
 * - Repeatedly merge single digits separated by spaces (`0 1` → `01`); word boundaries keep `10 2` intact
 *
 * Use at every DB write for `play_name` and when returning rows from APIs so legacy DB text
 * still renders consistently in the UI.
 */
export function normalizePlayName(name: string): string {
  let s = String(name ?? "")
    .normalize("NFKC")
    .replace(STRIP_INVISIBLE, "")
    .replace(/\p{Cf}/gu, "")
    .replace(SEPARATOR_DOTS, " ")
    .replace(/\p{Zs}+/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
  let next: string;
  do {
    next = s.replace(/\b(\d)\s+(\d)\b/g, "$1$2");
    if (next === s) break;
    s = next;
  } while (true);
  return s;
}

/** Snapshot from DB: canonical `play_name` for client display without requiring a data migration. */
export function withNormalizedPlayName<T extends { play_name?: string | null }>(row: T): T {
  if (row == null || typeof row !== "object") return row;
  const raw = row.play_name;
  if (raw == null || typeof raw !== "string") return row;
  return { ...row, play_name: normalizePlayName(raw) };
}
