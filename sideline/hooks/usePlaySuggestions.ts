"use client";
// QA26: Design system enforcement pass — replaced inline styles, unified icons, enforced card/typography tokens

import { useEffect, useMemo, useState } from "react";
import type { LoggedPlay } from "@/lib/types";
import { deriveFormationGroup, resolveCfbBrowserPlayType, type PlaybookEntry } from "@/lib/playbook";
import { supabase } from "@/lib/supabase";

type Args = {
  down: number;
  distance: number;
  fieldPos: number;
  gameId: string;
  playbook: string;
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

export function usePlaySuggestions({ down, distance, fieldPos, gameId, playbook }: Args) {
  /**
   * usePlaySuggestions
   *
   * Returns context-aware suggestions from the selected CFB26 playbook plus a short
   * "recent calls" list from this game.
   *
   * ALGORITHM:
   * - Pull all plays for the active playbook from `/api/cfb26-plays`.
   * - Build situation bias terms from `(down, distance, fieldPos)` using `biasTerms`.
   * - Score each play by how many bias terms appear in the lowercased play name.
   * - Keep plays with score > 0, sort by score desc then name asc, return top 6.
   * - Pull up to 200 recent `logged_plays` rows, then keep the latest 8 unique
   *   `formation + play_name` combinations.
   * - Hide recent rows that are already present in the suggestion list.
   *
   * FUTURE IMPROVEMENTS (not yet implemented):
   * - Weight by historical efficiency/usage across similar situations
   * - Exclude plays already called on the current drive
   * - Add opponent-adjusted weighting once opponent tendency context is available
   *
   * Suggestions re-derive when `(down, distance, fieldPos)` changes.
   */
  const [playbookEntries, setPlaybookEntries] = useState<PlaybookEntry[]>([]);
  const [recentRows, setRecentRows] = useState<RecentLoggedPlay[]>([]);

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
      // Suggestions badges should mirror PlayBrowser/canonical CFB play type resolution.
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
      const { data, error } = await supabase
        .from("logged_plays")
        .select("id, play_number, drive_number, down, distance, side, yard_line, hash, formation, play_name, yards_gained, result_tag, note, is_inches, created_at")
        .eq("game_session_id", gameId)
        .order("created_at", { ascending: false })
        .limit(200);
      if (error || cancelled) return;
      const desc: RecentLoggedPlay[] = (data ?? []) as RecentLoggedPlay[];
      const seen = new Set<string>();
      const out: RecentLoggedPlay[] = [];
      for (const play of desc) {
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

  return { suggestions, recentPlays };
}
