"use client";
// QA26: Design system enforcement pass — replaced inline styles, unified icons, enforced card/typography tokens

import { useEffect, useMemo, useState } from "react";
import { deriveFormationGroup, resolveCfbBrowserPlayType, type PlaybookEntry } from "@/lib/playbook";

export type FormationGroup = {
  group: string;
  formations: {
    name: string;
    plays: PlaybookEntry[];
  }[];
};

export function useFormationGroups(playbook: string) {
  const [rows, setRows] = useState<PlaybookEntry[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!playbook) {
      setRows([]);
      return;
    }
    let cancelled = false;
    void (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/cfb26-plays?playbook=${encodeURIComponent(playbook)}&list=all`, {
          cache: "no-store",
        });
        const json = (await res.json()) as {
          rows?: Array<{ formation: string; play_name: string; play_type?: string | null }>;
        };
        if (!res.ok || cancelled) return;
        // PlayBrowser badges must reflect canonical `cfb26_plays.play_type` (no numbered-call override).
        setRows(
          (json.rows ?? []).map((row) => ({
            play_id: `${row.formation}::${row.play_name}`.toLowerCase(),
            formation: row.formation,
            group: deriveFormationGroup(row.formation),
            play_name: row.play_name,
            play_type: resolveCfbBrowserPlayType(row.play_name, row.play_type),
          })),
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [playbook]);

  const groups = useMemo<FormationGroup[]>(() => {
    const byGroup = new Map<string, Map<string, PlaybookEntry[]>>();
    for (const row of rows) {
      if (!byGroup.has(row.group)) byGroup.set(row.group, new Map());
      const formations = byGroup.get(row.group);
      if (!formations) continue;
      if (!formations.has(row.formation)) formations.set(row.formation, []);
      formations.get(row.formation)?.push(row);
    }
    return Array.from(byGroup.entries())
      .map(([group, formations]) => ({
        group,
        formations: Array.from(formations.entries())
          .map(([name, plays]) => ({ name, plays }))
          .sort((a, b) => a.name.localeCompare(b.name)),
      }))
      .sort((a, b) => a.group.localeCompare(b.group));
  }, [rows]);

  return { groups, entries: rows, loading };
}
