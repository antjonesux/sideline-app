"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import type { PlaybookEntry } from "@/lib/playbook";
import { sortFormationTypes } from "@/lib/playbooks/formation-types";
import { fetchCfb26PlaybookEntries } from "@/lib/filmLoggerCatalogFetch";
import { filmLoggerQueryKeys } from "@/lib/filmLoggerQueryKeys";

export type FormationGroup = {
  group: string;
  formations: {
    name: string;
    plays: PlaybookEntry[];
  }[];
};

export function formationGroupsFromEntries(rows: PlaybookEntry[]): FormationGroup[] {
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
}

const CATALOG_STALE_MS = 5 * 60 * 1000;
const CATALOG_GC_MS = 45 * 60 * 1000;

export function useFormationGroups(playbook: string) {
  const catalogQuery = useQuery({
    queryKey: filmLoggerQueryKeys.cfb26Catalog(playbook),
    queryFn: () => fetchCfb26PlaybookEntries(playbook),
    enabled: Boolean(playbook.trim()),
    staleTime: CATALOG_STALE_MS,
    gcTime: CATALOG_GC_MS,
  });

  const rows = catalogQuery.data ?? [];

  const groups = useMemo(() => formationGroupsFromEntries(rows), [rows]);

  return {
    groups,
    entries: rows,
    loading: catalogQuery.isPending && Boolean(playbook.trim()),
    error: catalogQuery.error instanceof Error ? catalogQuery.error.message : null,
    hasAttemptedLoad: catalogQuery.isFetched,
  };
}
