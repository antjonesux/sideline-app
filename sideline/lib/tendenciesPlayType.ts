/** Normalize `cfb26_plays.play_type` (and similar labels) for grouping. */
export function normalizePlayTypeKey(raw: string | null | undefined): string {
  if (!raw) return "";
  return raw
    .trim()
    .toLowerCase()
    .replace(/[\s/]+/g, "_")
    .replace(/[^a-z0-9_]/g, "");
}

export type PlayTypeBucket = "Run" | "Pass" | "Play Action" | "Screen" | "RPO" | "Option" | "Other";

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
]);

const RPO_KEYS = new Set(["rpo_alert", "rpoalert", "rpo_peek", "rpopeek", "rpo_read", "rporead"]);

const OPTION_KEYS = new Set(["option_qb_run", "optionqb_run", "qb_draw", "qbdraw"]);

const PLAY_ACTION_KEYS = new Set(["play_action", "playaction"]);
const SCREEN_KEYS = new Set(["screen"]);

function normalizePlayName(raw: string | null | undefined): string {
  if (!raw) return "";
  return raw
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9 ]+/g, " ")
    .replace(/\s+/g, " ");
}

function playNameStartsWith(name: string, prefixes: string[]): boolean {
  return prefixes.some((prefix) => name.startsWith(prefix));
}

/**
 * When the play name resolves to one of these granular `deriveCfbPlayTypeFromName` labels,
 * Tendencies prefer that label over a catalog `cfb26_plays.play_type` hit so distribution
 * shows Screen / Play Action / RPO / Option instead of generic Pass/Run/Other.
 */
export function derivedRawOverridesCatalogForTendencies(derived: string): boolean {
  return (
    derived === "screen" ||
    derived === "play_action" ||
    derived === "rpo_read" ||
    derived === "option_qb_run"
  );
}

export function deriveCfbPlayTypeFromName(playName: string | null | undefined): string {
  const raw = (playName ?? "").trim().toLowerCase();
  const name = normalizePlayName(playName);
  if (!name || !raw) return "";

  // RPO — specific patterns before generic `rpo *` and before `mtn` / `bounce` run or pass branches
  if (raw.includes("rpo bubble")) return "rpo_read";
  if (raw.startsWith("mtn rpo")) return "rpo_read";
  if (raw.startsWith("bounce rpo")) return "rpo_read";

  if (raw.startsWith("rpo alert") || raw.startsWith("rpo peek") || raw.startsWith("rpo read") || raw.startsWith("rpo zone")) return "rpo_read";
  // Play action: written out, leading `PA ` / `PA_`, ` PA ` token, or isolated `PA` token (e.g. "MTN PA Z SPOT").
  if (raw.includes("play action")) return "play_action";
  if (
    raw.startsWith("pa ") ||
    raw.startsWith("pa_") ||
    raw.includes(" pa ") ||
    /(?:^|[\s_-])pa(?:[\s_-]|$)/.test(raw)
  ) {
    return "play_action";
  }
  if (raw.includes("screen")) return "screen";
  if (
    raw.includes("speed option") ||
    raw.includes("triple option") ||
    raw.includes("load option") ||
    raw.includes("invert veer")
  ) {
    return "option_qb_run";
  }
  if (
    raw.startsWith("read option") ||
    raw.startsWith("qb zone") ||
    raw.startsWith("qb power") ||
    raw.startsWith("qb draw") ||
    raw.startsWith("midline") ||
    raw.includes("rd option") ||
    raw.includes("rd opt")
  ) return "option_qb_run";

  if (raw.startsWith("jet touch")) return "quick_pass";

  if (
    raw.startsWith("hb dive") ||
    raw.startsWith("hb sting") ||
    raw.startsWith("hb duo") ||
    raw.startsWith("hb gut") ||
    raw.startsWith("hb stretch") ||
    raw.startsWith("inside zone") ||
    raw.startsWith("hb base") ||
    raw.includes("split dive") ||
    raw.startsWith("hb zone") ||
    raw.startsWith("hb quick base") ||
    raw.startsWith("bounce inside")
  ) return "inside_run";
  if (
    raw.startsWith("hb sweep") ||
    raw.startsWith("outside zone") ||
    raw.startsWith("power o") ||
    raw.startsWith("power g") ||
    raw.startsWith("hb power") ||
    raw.includes("strong power") ||
    raw.startsWith("hb counter") ||
    raw.includes("counter y") ||
    raw.includes("counter") ||
    raw.includes("01 trap") ||
    raw.startsWith("mtn hb") ||
    raw.startsWith("mtn counter") ||
    raw.startsWith("jet power") ||
    raw.startsWith("jet hb") ||
    raw.startsWith("qb sneak") ||
    raw.startsWith("qb blast") ||
    raw.startsWith("qb g ") ||
    raw.startsWith("bounce outside")
  ) return "outside_run";

  if (
    raw.includes("dagger") ||
    raw.includes("flood") ||
    raw.includes("verticals") ||
    raw.startsWith("all go") ||
    raw.includes("deep") ||
    raw.includes("post shot") ||
    raw.startsWith("posts") ||
    raw.includes("four verts")
  ) return "deep_pass";
  if (
    raw.includes("levels") ||
    raw.includes("mesh") ||
    raw.includes("curl") ||
    raw.includes("smash") ||
    raw.includes("stick") ||
    raw.includes("cross") ||
    raw.includes("drive") ||
    raw.includes("spot") ||
    raw.includes("dig") ||
    raw.includes("sail") ||
    raw.includes("slant") ||
    raw.includes("combo") ||
    raw.includes("seam") ||
    raw.includes("angle") ||
    raw.includes("under") ||
    raw.includes("nod") ||
    raw.includes("return") ||
    raw.includes("corner") ||
    raw.includes("hitch")
  ) return "medium_pass";
  if (raw.startsWith("mtn pa") || raw.startsWith("mtn mesh") || raw.startsWith("mtn z") || raw.startsWith("mtn bench")) return "quick_pass";

  if (playNameStartsWith(name, ["LEVELS", "MESH", "CURL", "SMASH", "STICK"]) || name.includes(" DRIVE")) return "medium_pass";
  if (playNameStartsWith(name, ["SLANTS", "QUICK"]) || name.includes("Z SPOT")) return "quick_pass";
  if (name.includes("HB DRAW") || name.includes("QB DRAW")) return "qb_draw";

  return "";
}

export function categorizeCfbPlayType(playType: string | null | undefined): PlayTypeBucket {
  const key = normalizePlayTypeKey(playType);
  if (!key) return "Other";

  if (key.includes("rpo") || RPO_KEYS.has(key)) return "RPO";
  if (PLAY_ACTION_KEYS.has(key)) return "Play Action";
  if (SCREEN_KEYS.has(key)) return "Screen";
  if (OPTION_KEYS.has(key) || key === "option" || (key.includes("option") && key.includes("qb"))) return "Option";
  if (RUN_KEYS.has(key)) return "Run";
  if (key.includes("counter") && !key.includes("pass")) return "Run";
  if (PASS_KEYS.has(key)) return "Pass";

  if (key.includes("screen")) return "Screen";
  if (key.includes("play_action")) return "Play Action";
  if (key.includes("pass")) return "Pass";
  if (key.includes("run") || key.includes("rush")) return "Run";

  return "Other";
}

/** For situation bars: run vs everything else. */
export function isRunLeanBucket(bucket: PlayTypeBucket): boolean {
  return bucket === "Run" || bucket === "Option";
}
