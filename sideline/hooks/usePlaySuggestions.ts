"use client";
// QA26: Design system enforcement pass — replaced inline styles, unified icons, enforced card/typography tokens

import { useEffect, useMemo, useState } from "react";
import { deriveFieldZone, deriveScenario } from "@/lib/derivePlayContext";
import { fromAbsoluteYard } from "@/lib/fieldPosition";
import type { LoggedPlay } from "@/lib/types";
import { deriveFormationGroup, resolveCfbBrowserPlayType, type PlaybookEntry } from "@/lib/playbook";
import { endCriticalFlow } from "@/lib/perfInstrumentation";

type Args = {
  down: number;
  distance: number;
  fieldPos: number;
  gameId: string;
  playbook: string;
  /** When the caller already knows the sheet, pass its ID to skip the lookup. */
  sheetId?: string | null;
  /** Optional in-flight logger-open flow id started by the parent. */
  loggerOpenFlowId?: string | null;
};

type RecentLoggedPlay = LoggedPlay & { created_at?: string | null };

function biasTerms(down: number, distance: number, fieldPos: number): string[] {
  if (fieldPos >= 85) return ["power", "inside zone", "iso", "stick", "spot", "curl flat"];
  if (down === 1 && distance === 10) return ["inside zone", "outside zone", "rpo", "hb dive"];
  if (down === 2 && distance <= 5) return ["power", "inside zone", "slant", "stick", "spot"];
  if (down === 3 && distance <= 3) return ["sneak", "power", "mesh", "stick"];
  if (down === 3 && distance >= 4 && distance <= 7) return ["mesh", "slant", "spacing", "drive", "flood", "curl flat"];
  if (down === 3 && distance >= 8) return ["four verts", "verticals", "spacing", "post", "y cross"];
  return ["inside zone", "outside zone", "slant", "mesh", "spacing", "stick"];
}

type SheetPlaysApiRow = {
  formation: string;
  play_name: string;
  play_type?: string | null;
};

export function usePlaySuggestions({ down, distance, fieldPos, gameId, playbook, sheetId, loggerOpenFlowId }: Args) {
  const [playbookEntries, setPlaybookEntries] = useState<PlaybookEntry[]>([]);
  const [recentRows, setRecentRows] = useState<RecentLoggedPlay[]>([]);
  const [sheetCalls, setSheetCalls] = useState<PlaybookEntry[]>([]);
  const [sheetName, setSheetName] = useState<string | null>(null);

  /** Same scenario string written with new logs (see drives plays POST). */
  const scenarioLabel = useMemo(() => {
    const { side, yard_line } = fromAbsoluteYard(fieldPos);
    const fieldZone = deriveFieldZone(yard_line, side);
    return deriveScenario(down, distance, fieldZone);
  }, [down, distance, fieldPos]);

  useEffect(() => {
    let flowClosed = false;
    const closeLoggerOpenFlow = (
      status: "ok" | "error" | "cancelled" | "skipped",
      details: Record<string, string | number | boolean | null | undefined>,
    ) => {
      if (!loggerOpenFlowId || flowClosed) return;
      endCriticalFlow(loggerOpenFlowId, status, details);
      flowClosed = true;
    };

    if (!sheetId || !scenarioLabel) {
      setSheetCalls([]);
      setSheetName(null);
      closeLoggerOpenFlow("skipped", {
        reason: !sheetId ? "no_sheet_id" : "no_scenario",
      });
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(
          `/api/playbook/${sheetId}/plays?scenario=${encodeURIComponent(scenarioLabel)}&slim=1`,
          { cache: "no-store" },
        );
        const json = (await res.json()) as { plays?: SheetPlaysApiRow[]; sheetName?: string | null; error?: string };
        if (!res.ok || cancelled) {
          if (!cancelled) {
            setSheetCalls([]);
            setSheetName(null);
            closeLoggerOpenFlow("error", {
              reason: "sheet_fetch_failed",
              statusCode: res.status,
              scenario: scenarioLabel,
            });
          }
          return;
        }
        setSheetName(json.sheetName?.trim() || null);
        const rows = json.plays ?? [];
        setSheetCalls(
          rows.map((row) => {
            const formation = String(row.formation ?? "").trim() || "Other";
            const play_name = String(row.play_name ?? "").trim();
            const rawType = row.play_type;
            return {
              play_id: `${formation}::${play_name}`.toLowerCase(),
              formation,
              group: deriveFormationGroup(formation),
              play_name,
              play_type: resolveCfbBrowserPlayType(play_name, rawType),
            };
          }),
        );
        closeLoggerOpenFlow("ok", {
          scenario: scenarioLabel,
          sheetCalls: rows.length,
        });
      } catch (error) {
        if (!cancelled) {
          setSheetCalls([]);
          setSheetName(null);
          closeLoggerOpenFlow("error", {
            reason: "sheet_fetch_exception",
            message: error instanceof Error ? error.message : "unknown",
          });
        }
      }
    })();
    return () => {
      cancelled = true;
      closeLoggerOpenFlow("cancelled", { reason: "sheet_effect_cleanup" });
    };
  }, [sheetId, scenarioLabel, loggerOpenFlowId]);

  useEffect(() => {
    if (!playbook) {
      setPlaybookEntries([]);
      return;
    }
    let cancelled = false;
    void (async () => {
      const res = await fetch(`/api/cfb26-plays?playbook=${encodeURIComponent(playbook)}&list=all`, { cache: "no-store" });
      const json = (await res.json()) as {
        rows?: Array<{ formation: string; play_name: string; play_type?: string | null }>;
      };
      if (!res.ok || cancelled) return;
      setPlaybookEntries(
        (json.rows ?? []).map((row) => ({
          play_id: `${row.formation}::${row.play_name}`.toLowerCase(),
          formation: row.formation,
          group: deriveFormationGroup(row.formation),
          play_name: row.play_name,
          play_type: resolveCfbBrowserPlayType(row.play_name, row.play_type),
        })),
      );
    })();
    return () => {
      cancelled = true;
    };
  }, [playbook]);

  useEffect(() => {
    if (!gameId) {
      setRecentRows([]);
      return;
    }
    let cancelled = false;
    void (async () => {
      const res = await fetch(`/api/games/${gameId}/drives`);
      if (!res.ok || cancelled) return;
      type DriveWithPlays = { plays?: RecentLoggedPlay[] };
      const drives = (await res.json()) as DriveWithPlays[];
      if (cancelled) return;
      const allPlays: RecentLoggedPlay[] = [];
      for (const d of drives) {
        for (const p of d.plays ?? []) allPlays.push(p);
      }
      allPlays.sort((a, b) => {
        const aTime = a.created_at ?? "";
        const bTime = b.created_at ?? "";
        return bTime.localeCompare(aTime);
      });
      const seen = new Set<string>();
      const out: RecentLoggedPlay[] = [];
      for (const play of allPlays) {
        const key = `${play.formation}::${play.play_name}`.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        out.push(play);
        if (out.length === 8) break;
      }
      setRecentRows(out);
    })();
    return () => {
      cancelled = true;
    };
  }, [gameId]);

  const situationKey = `${down}:${distance}:${fieldPos}`;
  const suggestions = useMemo(() => {
    const terms = biasTerms(down, distance, fieldPos);
    const scored = playbookEntries
      .map((entry) => {
        const n = entry.play_name.toLowerCase();
        const score = terms.reduce((acc, t) => (n.includes(t) ? acc + 1 : acc), 0);
        return { entry, score };
      })
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score || a.entry.play_name.localeCompare(b.entry.play_name))
      .map((item) => item.entry);
    return scored.slice(0, 6);
  }, [situationKey, playbookEntries]);

  const recentPlays = useMemo(() => {
    const suggestionIds = new Set(suggestions.map((s) => s.play_id));
    return recentRows.filter((play) => !suggestionIds.has(`${play.formation}::${play.play_name}`.toLowerCase()));
  }, [recentRows, suggestions]);

  return { suggestions, recentPlays, sheetCalls, sheetName, scenarioLabel };
}
