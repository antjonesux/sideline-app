"use client";

import { fetchCatalogPlaybooksList } from "@/lib/playbooks/catalog-playbooks";
import type { CatalogGameVersion, CatalogSideOfBall } from "@/lib/constants";
import { useEffect, useState } from "react";

type Options = {
  gameVersion: CatalogGameVersion | null;
  sideOfBall: CatalogSideOfBall | null;
  /** Local QA — skip API and use this list. */
  qaStaticPlaybooks?: string[];
  enabled?: boolean;
};

export function useCatalogPlaybooks({
  gameVersion,
  sideOfBall,
  qaStaticPlaybooks,
  enabled = true,
}: Options) {
  const [playbooks, setPlaybooks] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (qaStaticPlaybooks?.length) {
      setPlaybooks([...qaStaticPlaybooks].sort((a, b) => a.localeCompare(b)));
      setLoading(false);
      setFailed(false);
      return;
    }

    if (!enabled || !gameVersion || !sideOfBall) {
      setPlaybooks([]);
      setLoading(false);
      setFailed(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setPlaybooks([]);
    setFailed(false);

    void (async () => {
      const result = await fetchCatalogPlaybooksList(gameVersion, sideOfBall);
      if (cancelled) return;
      setPlaybooks(result.playbooks);
      setFailed(result.failed);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [enabled, gameVersion, sideOfBall, qaStaticPlaybooks]);

  return { playbooks, loading, failed };
}
