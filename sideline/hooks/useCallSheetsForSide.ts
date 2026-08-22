"use client";

import { usePlaybookList } from "@/hooks/usePlaybookList";
import type { CatalogGameVersion, CatalogSideOfBall } from "@/lib/constants";
import { parseCatalogGameVersion } from "@/lib/constants";
import { lookupCatalogPlaybookMeta } from "@/lib/playbooks/catalog-playbooks";
import type { PlaybookSummary } from "@/lib/types";
import { useEffect, useState } from "react";

export function useCallSheetsForSide(side: CatalogSideOfBall, gameVersion: CatalogGameVersion | null) {
  const { data, isLoading, isError } = usePlaybookList();
  const allSheets = data?.playbooks ?? [];
  const sheetIdsKey = allSheets.map((sheet) => sheet.id).join(",");
  const [sheets, setSheets] = useState<PlaybookSummary[]>([]);
  const [resolving, setResolving] = useState(false);

  useEffect(() => {
    if (isLoading || allSheets.length === 0) {
      setSheets([]);
      setResolving(false);
      return;
    }

    let cancelled = false;
    setResolving(true);

    void (async () => {
      const matched: PlaybookSummary[] = [];
      for (const sheet of allSheets) {
        const sheetVersion = parseCatalogGameVersion(sheet.game_version);
        if (gameVersion && sheetVersion !== gameVersion) continue;

        const meta = await lookupCatalogPlaybookMeta(sheet.playbook);
        const sheetSide = meta?.side_of_ball;
        if (sheetSide === side) matched.push(sheet);
      }
      if (!cancelled) {
        setSheets(matched);
        setResolving(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [allSheets, gameVersion, isLoading, sheetIdsKey, side]);

  return {
    sheets,
    isLoading: isLoading || resolving,
    isError,
  };
}
