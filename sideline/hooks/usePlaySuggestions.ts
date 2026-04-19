"use client";

import { useEffect, useMemo, useState } from "react";
import type { LoggedPlay } from "@/lib/types";
import { inferPlayType, deriveFormationGroup, type PlaybookEntry } from "@/lib/playbook";

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
      const json = (await res.json()) as { rows?: Array<{ formation: string; play_name: string }> };
      if (!res.ok || cancelled) return;
      setPlaybookEntries(
        (json.rows ?? []).map((row) => ({
          play_id: `${row.formation}::${row.play_name}`.toLowerCase(),
          formation: row.formation,
          group: deriveFormationGroup(row.formation),
          play_name: row.play_name,
          play_type: inferPlayType(row.play_name),
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
      const res = await fetch(`/api/games/${gameId}/drives`, { cache: "no-store" });
      const drives = (await res.json()) as Array<{ plays?: RecentLoggedPlay[] }>;
      if (!res.ok || cancelled) return;
      const desc: RecentLoggedPlay[] = drives
        .flatMap((d) => d.plays ?? [])
        .sort(
          (a, b) =>
            new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime(),
        );
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
