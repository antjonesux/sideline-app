"use client";

import { FormationPanel } from "@/components/FormationPanel";
import { PlayerTypePanel } from "@/components/PlayerTypePanel";
import { SituationalCallSheet } from "@/components/SituationalCallSheet";
import { fetchSchemeDetailWithCache } from "@/lib/fetchSchemes";
import { getStaticSchemeDetail } from "@/lib/staticData";
import { useGameStore } from "@/store/gameStore";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect } from "react";

export default function SchemeDashboardPage() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : "";
  const setActiveSchemeId = useGameStore((s) => s.setActiveSchemeId);

  useEffect(() => {
    if (id) setActiveSchemeId(id);
    return () => setActiveSchemeId(null);
  }, [id, setActiveSchemeId]);

  const staticFallback = getStaticSchemeDetail(id);

  const { data } = useQuery({
    queryKey: ["scheme", id],
    queryFn: () => fetchSchemeDetailWithCache(id),
    enabled: Boolean(id),
    placeholderData: () => staticFallback ?? undefined,
    staleTime: 30 * 60_000,
  });

  const detail = data ?? staticFallback;

  if (!id || !detail) {
    return (
      <div className="min-h-screen px-4 py-16 md:px-10">
        <p className="font-mono text-sm text-[var(--chalk-muted)]">
          Scheme not found.
        </p>
        <Link
          href="/"
          className="mt-4 inline-block font-mono text-sm text-[var(--accent-soft)]"
        >
          ← Back to schemes
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-16">
      <header className="border-b border-white/10 bg-black/30 px-4 py-6 md:px-10">
        <Link
          href="/"
          className="font-mono text-xs text-[var(--accent-soft)] hover:text-[var(--accent)]"
        >
          ← All schemes
        </Link>
        <div className="mt-4 flex flex-wrap items-baseline gap-3">
          <h1 className="font-display text-3xl tracking-wide text-[var(--chalk)] md:text-5xl">
            {detail.name}
          </h1>
          {detail.tempo ? (
            <span className="rounded border border-white/20 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-[var(--chalk-muted)]">
              {detail.tempo}
            </span>
          ) : null}
        </div>
        {detail.coach_name ? (
          <p className="mt-2 font-mono text-xs text-[var(--chalk-muted)]">
            Based on {detail.coach_name}
          </p>
        ) : null}
        {detail.cfb26_playbook ? (
          <p className="mt-3 font-mono text-sm text-[var(--accent-soft)]">
            CFB26 playbook · {detail.cfb26_playbook}
          </p>
        ) : null}
      </header>

      <main
        key={id}
        className="sideline-scheme-reveal mx-auto max-w-6xl space-y-10 px-4 py-8 md:space-y-12 md:px-10"
      >
        <SituationalCallSheet calls={detail.situational_calls} />

        <div className="grid gap-8 lg:grid-cols-2 lg:items-start">
          <PlayerTypePanel playerTypes={detail.scheme_player_types} />
          <FormationPanel formations={detail.scheme_formations} />
        </div>
      </main>
    </div>
  );
}
