"use client";

import { parseCatalogGameVersion } from "@/lib/constants";
import type { PlaybookSummary } from "@/lib/types";
import { useQuery } from "@tanstack/react-query";

export type PlaySheetDisplayMeta = {
  game_version: string;
  scheme: string;
  playbook: string;
};

function summaryToDisplayMeta(item: Pick<PlaybookSummary, "game_version" | "scheme" | "playbook">): PlaySheetDisplayMeta {
  return {
    game_version: parseCatalogGameVersion(item.game_version),
    scheme: item.scheme?.trim() || "Multiple",
    playbook: item.playbook?.trim() ?? "",
  };
}

async function fetchPlaySheetDisplayMeta(sheetId: string): Promise<PlaySheetDisplayMeta> {
  const res = await fetch(`/api/playbook/${sheetId}`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load play sheet");
  const row = (await res.json()) as { game_version?: string | null; scheme?: string | null; playbook?: string | null };
  return {
    game_version: parseCatalogGameVersion(row.game_version),
    scheme: (row.scheme ?? "").trim() || "Multiple",
    playbook: (row.playbook ?? "").trim(),
  };
}

/** Authoritative sheet row fields for metadata display (list cache can omit or stale `game_version`). */
export function usePlaySheetDisplayMeta(item: PlaybookSummary) {
  const listFallback = summaryToDisplayMeta(item);

  return useQuery({
    queryKey: ["play-sheet-display-meta", item.id],
    queryFn: () => fetchPlaySheetDisplayMeta(item.id),
    placeholderData: listFallback,
    staleTime: 60_000,
  });
}
