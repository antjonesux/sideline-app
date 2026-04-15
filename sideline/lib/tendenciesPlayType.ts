/** Normalize `cfb26_plays.play_type` (and similar labels) for grouping. */
export function normalizePlayTypeKey(raw: string | null | undefined): string {
  if (!raw) return "";
  return raw
    .trim()
    .toLowerCase()
    .replace(/[\s/]+/g, "_")
    .replace(/[^a-z0-9_]/g, "");
}

export type PlayTypeBucket = "Run" | "Pass" | "RPO" | "Option" | "Other";

const RUN_KEYS = new Set([
  "inside_run",
  "outside_run",
  "counter_run",
  "insiderun",
  "outsiderun",
  "counterrun",
  "counter",
  "fb_run",
  "fbrun",
]);

const PASS_KEYS = new Set([
  "deep_pass",
  "deeppass",
  "medium_pass",
  "mediumpass",
  "quick_pass",
  "quickpass",
  "play_action",
  "playaction",
  "screen",
]);

const RPO_KEYS = new Set(["rpo_alert", "rpoalert", "rpo_peek", "rpopeek", "rpo_read", "rporead"]);

const OPTION_KEYS = new Set(["option_qb_run", "optionqb_run", "qb_draw", "qbdraw"]);

export function categorizeCfbPlayType(playType: string | null | undefined): PlayTypeBucket {
  const key = normalizePlayTypeKey(playType);
  if (!key) return "Other";

  if (key.includes("rpo") || RPO_KEYS.has(key)) return "RPO";
  if (OPTION_KEYS.has(key) || (key.includes("option") && key.includes("qb"))) return "Option";
  if (RUN_KEYS.has(key)) return "Run";
  if (key.includes("counter") && !key.includes("pass")) return "Run";
  if (PASS_KEYS.has(key)) return "Pass";

  if (key.includes("pass") || key.includes("screen")) return "Pass";
  if (key.includes("run") || key.includes("rush")) return "Run";

  return "Other";
}

/** For situation bars: run vs everything else. */
export function isRunLeanBucket(bucket: PlayTypeBucket): boolean {
  return bucket === "Run";
}
