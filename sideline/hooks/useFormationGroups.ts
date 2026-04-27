"use client";
// QA26: Design system enforcement pass — replaced inline styles, unified icons, enforced card/typography tokens

import { useEffect, useMemo, useState } from "react";
import { resolveFormationSection, resolveCfbBrowserPlayType, type PlaybookEntry } from "@/lib/playbook";
import { sortFormationTypes } from "@/lib/playbooks/formation-types";

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
        const requestUrl = `/api/cfb26-plays?playbook=${encodeURIComponent(playbook)}&list=all`;
        console.log("[useFormationGroups] request", {
          playbook,
          playbookJson: JSON.stringify(playbook),
          requestUrl,
        });
        const res = await fetch(requestUrl, {
          cache: "no-store",
        });
        const json = (await res.json()) as {
          rows?: Array<{ formation: string; play_name: string; play_type?: string | null; formation_type?: string | null }>;
        };
        console.log("[useFormationGroups] fetch resolved", {
          ok: res.ok,
          status: res.status,
          rowsPreview: (json.rows ?? []).slice(0, 3),
        });
        if (!res.ok || cancelled) return;
        setRows(
          (json.rows ?? []).map((row) => ({
            play_id: `${row.formation}::${row.play_name}`.toLowerCase(),
            formation: row.formation,
            group: resolveFormationSection(row.formation, row.formation_type),
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
      .sort((a, b) => sortFormationTypes(a.group, b.group));
  }, [rows]);

  useEffect(() => {
    console.log("[useFormationGroups] return", {
      groups,
      isLoading: loading,
      error: null,
    });
  }, [groups, loading]);

  return { groups, entries: rows, loading };
}
