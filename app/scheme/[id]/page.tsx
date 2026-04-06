"use client";

import { FormationPanel } from "@/components/FormationPanel";
import { OpponentSelector } from "@/components/OpponentSelector";
import { PlayerTypePanel } from "@/components/PlayerTypePanel";
import { SituationalCallSheet } from "@/components/SituationalCallSheet";
import { fetchSchemeDetailWithCache } from "@/lib/fetchSchemes";
import { getStaticSchemeDetail } from "@/lib/staticData";
import { useGameStore } from "@/store/gameStore";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function SchemeDashboardPage() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : "";
  const setActiveSchemeId = useGameStore((s) => s.setActiveSchemeId);
  const selectedDefensiveScheme = useGameStore((s) => s.selectedDefensiveScheme);
  const [dashTab, setDashTab] = useState<"playbook" | "opponent">("playbook");

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

        <div className="mt-6 flex flex-wrap gap-2 font-mono text-xs">
          <button
            type="button"
            onClick={() => setDashTab("playbook")}
            className={`rounded border px-3 py-2 uppercase tracking-wider transition ${
              dashTab === "playbook"
                ? "border-[var(--accent)] bg-[var(--accent)]/15 text-[var(--chalk)]"
                : "border-white/15 text-[var(--chalk-muted)] hover:border-white/25"
            }`}
          >
            Playbook
          </button>
          <button
            type="button"
            onClick={() => setDashTab("opponent")}
            className={`rounded border px-3 py-2 uppercase tracking-wider transition ${
              dashTab === "opponent"
                ? "border-[var(--accent)] bg-[var(--accent)]/15 text-[var(--chalk)]"
                : "border-white/15 text-[var(--chalk-muted)] hover:border-white/25"
            }`}
          >
            Opponent & game plan
          </button>
        </div>
      </header>

      <main
        key={id}
        className="sideline-scheme-reveal mx-auto max-w-6xl space-y-10 px-4 py-8 md:space-y-12 md:px-10"
      >
        {dashTab === "playbook" ? (
          <>
            <SituationalCallSheet calls={detail.situational_calls} />

            <div className="grid gap-8 lg:grid-cols-2 lg:items-start">
              <PlayerTypePanel playerTypes={detail.scheme_player_types} />
              <FormationPanel formations={detail.scheme_formations} />
            </div>
          </>
        ) : (
          <div className="space-y-8">
            <OpponentSelector />
            {selectedDefensiveScheme ? (
              <div className="rounded-lg border border-[var(--accent)]/30 bg-black/25 p-6">
                <p className="font-mono text-sm text-[var(--chalk-soft)]">
                  Opponent set to{" "}
                  <span className="text-[var(--accent-soft)]">
                    {selectedDefensiveScheme}
                  </span>
                  . Open the full game plan for intel, formation exploits, and the
                  adjusted call sheet (Pre-Game / In-Game).
                </p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <Link
                    href={`/scheme/${id}/gameplan`}
                    className="inline-flex items-center rounded border border-[var(--accent)]/50 bg-[var(--accent)]/10 px-4 py-2 font-mono text-sm text-[var(--accent-soft)] hover:border-[var(--accent)]"
                  >
                    Open game plan →
                  </Link>
                  <Link
                    href={`/scheme/${id}/playsheet/new`}
                    className="inline-flex items-center rounded border border-white/15 px-4 py-2 font-mono text-sm text-[var(--chalk-muted)] hover:border-white/25"
                  >
                    Build play sheet →
                  </Link>
                </div>
              </div>
            ) : null}
          </div>
        )}
      </main>
    </div>
  );
}
