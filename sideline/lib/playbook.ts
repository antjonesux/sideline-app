import { categorizeCfbPlayType, deriveCfbPlayTypeFromName } from "@/lib/tendenciesPlayType";

/** Personnel / numbered calls like "94 WILL" — often runs even when `playbooks.play_type` says pass. */
export function playNameLooksLikeNumberedPersonnelCall(name: string): boolean {
  return /^(0[1-9]|[1-9][0-9]?)\s+/i.test(name.trim());
}

/** Pass/RPO tokens in the call name; if present we trust CFB over the numbered-call heuristic. */
export function nameHasExplicitPassOrRpoSignal(name: string): boolean {
  const n = name.toLowerCase();
  if (n.includes("rpo")) return true;
  if (n.includes("play action")) return true;
  if (/(?:^|[\s_-])pa(?:[\s_-]|$)/.test(n)) return true;
  return (
    n.includes("screen") ||
    n.includes("pass") ||
    n.includes("mesh") ||
    n.includes("slant") ||
    n.includes("stick") ||
    n.includes("spot") ||
    n.includes("drive") ||
    n.includes("flood") ||
    n.includes("curl") ||
    n.includes("vert") ||
    n.includes("cross") ||
    n.includes("spacing") ||
    n.includes("post")
  );
}

/**
 * When the sheet labels a numbered personnel call as pass family but the name has no pass/RPO cues,
 * treat it as a run (coaching convention; `playbooks.play_type` is often wrong here).
 */
export function shouldOverrideCfbPassLabelToRun(playName: string, cfbPlayType: string | null | undefined): boolean {
  const cfb = (cfbPlayType ?? "").trim();
  if (!cfb) return false;
  if (!playNameLooksLikeNumberedPersonnelCall(playName)) return false;
  if (nameHasExplicitPassOrRpoSignal(playName)) return false;
  const bucket = categorizeCfbPlayType(cfb);
  return bucket === "Pass" || bucket === "Play Action" || bucket === "Screen";
}

export type PlaybookEntry = {
  play_id: string;
  formation: string;
  group: string;
  play_name: string;
  play_type: "RUN" | "PASS" | "RPO";
};

export function inferPlayType(name: string): PlaybookEntry["play_type"] {
  const n = name.toLowerCase();
  if (n.includes("rpo")) return "RPO";
  if (
    n.includes("pass") ||
    n.includes("mesh") ||
    n.includes("slant") ||
    n.includes("stick") ||
    n.includes("spot") ||
    n.includes("drive") ||
    n.includes("flood") ||
    n.includes("curl") ||
    n.includes("vert") ||
    n.includes("cross") ||
    n.includes("spacing") ||
    n.includes("post")
  ) {
    return "PASS";
  }
  if (
    n.includes("zone") ||
    n.includes("dive") ||
    n.includes("power") ||
    n.includes("sneak") ||
    n.includes("iso") ||
    n.includes("counter") ||
    n.includes("sweep")
  ) {
    return "RUN";
  }
  return "RUN";
}

/**
 * Maps `playbooks.play_type` (and seed labels) to RUN | PASS | RPO using the same ladder as
 * Tendencies (`attachPlayTypes` / `deriveCfbPlayTypeFromName` + `categorizeCfbPlayType`).
 */
export function resolveCfbDisplayPlayType(
  playName: string,
  dbPlayType: string | null | undefined,
): PlaybookEntry["play_type"] {
  const trimmed = (dbPlayType ?? "").trim();
  const upper = trimmed.toUpperCase();
  if (upper === "RUN" || upper === "PASS" || upper === "RPO") {
    if (upper === "PASS" && shouldOverrideCfbPassLabelToRun(playName, trimmed)) {
      return "RUN";
    }
    return upper as PlaybookEntry["play_type"];
  }

  if (shouldOverrideCfbPassLabelToRun(playName, trimmed)) {
    return "RUN";
  }

  const raw = trimmed || deriveCfbPlayTypeFromName(playName);
  const bucket = categorizeCfbPlayType(raw);
  if (bucket === "RPO") return "RPO";
  if (bucket === "Run" || bucket === "Option") return "RUN";
  if (bucket === "Pass" || bucket === "Play Action" || bucket === "Screen") return "PASS";
  return inferPlayType(playName);
}

/**
 * UI browser/suggestion strict resolver: trust `playbooks.play_type` first and
 * avoid name-based PASS->RUN overrides so pre-log badges match canonical CFB data.
 */
export function resolveCfbBrowserPlayType(
  playName: string,
  dbPlayType: string | null | undefined,
): PlaybookEntry["play_type"] {
  const trimmed = (dbPlayType ?? "").trim();
  const upper = trimmed.toUpperCase();
  if (upper === "RUN" || upper === "PASS" || upper === "RPO") {
    return upper as PlaybookEntry["play_type"];
  }
  const bucket = categorizeCfbPlayType(trimmed);
  if (bucket === "RPO") return "RPO";
  if (bucket === "Pass" || bucket === "Play Action" || bucket === "Screen") return "PASS";
  if (bucket === "Run" || bucket === "Option") return "RUN";
  return inferPlayType(playName);
}

export function deriveFormationGroup(formation: string): string {
  const f = formation.toLowerCase();
  if (f.includes("goal line")) return "Goal Line";
  if (f.includes("hail mary")) return "Hail Mary";
  if (f.includes("gun")) return "Gun";
  if (f.includes("pistol")) return "Pistol";
  if (f.includes("singleback")) return "Singleback";
  if (f.includes("shotgun")) return "Shotgun";
  if (f.includes("i form") || f === "i" || f.startsWith("i ")) return "I Form";
  if (f.includes("flexbone")) return "Flexbone";
  if (f.includes("wingbone")) return "Wingbone";
  if (f.includes("wildcat")) return "Wildcat";
  if (f.includes("power i")) return "Power I";
  return "Other";
}

/**
 * Prefer DB `formation_type` (source-aligned) for the browser section key;
 * fall back to `deriveFormationGroup` for rows where the field is absent.
 */
export function resolveFormationSection(
  formation: string,
  formationType: string | null | undefined,
): string {
  const ft = (formationType ?? "").trim();
  return ft || deriveFormationGroup(formation);
}
