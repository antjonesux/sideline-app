import type { CatalogSideOfBall } from "@/lib/constants";
import { resolveDefensiveDisplayPlayType } from "@/lib/defensivePlayTypeResolution";
import {
  deriveFormationGroup,
  resolveCfbBrowserPlayType,
  resolveFormationSection,
  type CatalogPlayType,
  type PlaybookEntry,
} from "@/lib/playbook";
import type { SheetScenarioBlock } from "@/lib/types";

type Cfb26ApiRow = {
  formation: string;
  play_name: string;
  play_type?: string | null;
  formation_type?: string | null;
};

function catalogPlayTypeForSide(
  playName: string,
  rawType: string | null | undefined,
  sideOfBall: CatalogSideOfBall,
): CatalogPlayType {
  if (sideOfBall === "defense") {
    return resolveDefensiveDisplayPlayType(playName, rawType) ?? "ZONE";
  }
  return resolveCfbBrowserPlayType(playName, rawType);
}

export async function fetchCfb26PlaybookEntries(
  playbook: string,
  catalogSideOfBall: CatalogSideOfBall = "offense",
): Promise<PlaybookEntry[]> {
  if (!playbook.trim()) return [];
  const res = await fetch(`/api/cfb26-plays?playbook=${encodeURIComponent(playbook)}&list=all`);
  const json = (await res.json()) as { rows?: Cfb26ApiRow[]; error?: string };
  if (!res.ok) throw new Error(json.error ?? "Failed to load playbook catalog");
  return (json.rows ?? []).map((row) => ({
    play_id: `${row.formation}::${row.play_name}`.toLowerCase(),
    formation: row.formation,
    group: resolveFormationSection(row.formation, row.formation_type),
    play_name: row.play_name,
    play_type: catalogPlayTypeForSide(row.play_name, row.play_type, catalogSideOfBall),
  }));
}

type SheetPlaysApiRow = {
  formation: string;
  play_name: string;
  play_type?: string | null;
};

/** Play sheet rows for one scenario (YOUR CALLS). */
export async function fetchPlaySheetScenarioCalls(
  sheetId: string,
  scenarioLabel: string,
  catalogSideOfBall: CatalogSideOfBall = "offense",
): Promise<{ sheetCalls: PlaybookEntry[]; sheetName: string | null }> {
  const res = await fetch(
    `/api/playbook/${sheetId}/plays?scenario=${encodeURIComponent(scenarioLabel)}&slim=1`,
  );
  const json = (await res.json()) as { plays?: SheetPlaysApiRow[]; sheetName?: string | null; error?: string };
  if (!res.ok) throw new Error(json.error ?? "Failed to load play sheet");
  const rows = json.plays ?? [];
  const sheetCalls: PlaybookEntry[] = rows.map((row) => {
    const formation = String(row.formation ?? "").trim() || "Other";
    const play_name = String(row.play_name ?? "").trim();
    const rawType = row.play_type;
    return {
      play_id: `${formation}::${play_name}`.toLowerCase(),
      formation,
      group: deriveFormationGroup(formation),
      play_name,
      play_type: catalogPlayTypeForSide(play_name, rawType, catalogSideOfBall),
    };
  });
  return { sheetCalls, sheetName: json.sheetName?.trim() || null };
}

/** Full play sheet with all scenarios (existing GET `/api/playbook/[id]`). */
export async function fetchPlaySheetOverview(
  sheetId: string,
): Promise<{ sheetName: string | null; scenarios: SheetScenarioBlock[] }> {
  const res = await fetch(`/api/playbook/${sheetId}`);
  const json = (await res.json()) as {
    name?: string;
    scenarios?: SheetScenarioBlock[];
    error?: string;
  };
  if (!res.ok) throw new Error(json.error ?? "Failed to load play sheet");
  return {
    sheetName: typeof json.name === "string" ? json.name.trim() || null : null,
    scenarios: json.scenarios ?? [],
  };
}
