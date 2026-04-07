"use client";

import { CoverageQuickTagDrawer } from "@/components/CoverageQuickTagDrawer";
import { FieldStripSelector } from "@/components/FieldStripSelector";
import { GameStateBar, ScoreContextDrawer } from "@/components/GameStateBar";
import { GameTimeline } from "@/components/GameTimeline";
import { InGameCallSheet } from "@/components/InGameCallSheet";
import { InGameSheet } from "@/components/InGameSheet";
import { LiveRecommendationCard } from "@/components/LiveRecommendationCard";
import {
  PreGameNotesForm,
  primaryCoverageToTag,
  readPregameDraft,
} from "@/components/PreGameNotesForm";
import { SituationQuickNav } from "@/components/SituationQuickNav";
import { fetchGamePlanBundle } from "@/lib/fetchGamePlan";
import { situationFromGameState } from "@/lib/gameStateMapping";
import { playSheetPlayToDraft } from "@/lib/mapPlayToDraft";
import type {
  CoverageAffinityRow,
  EnginePlay,
  FieldPositionRuleRow,
  FieldZone,
  LiveGameState,
  LocalTimelineEvent,
} from "@/lib/mvp4Types";
import type { DraftPlayRow, PlaySheetWithPlays } from "@/lib/playSheetTypes";
import { getRecommendation } from "@/lib/recommendationEngine";
import { playbookFromSchemeField } from "@/lib/resolvePlaybook";
import type { Scheme } from "@/lib/types";
import { useGameStore } from "@/store/gameStore";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

function rowToEngine(r: DraftPlayRow): EnginePlay {
  return {
    id: r.id!,
    situation: r.situation,
    formation: r.formation,
    play_name: r.play_name,
    coaching_note: r.coaching_note,
    counter_play: r.counter_play,
    is_featured: r.is_featured,
    is_used: r.is_used,
    play_type: r.play_type ?? null,
  };
}

export function InGamePlaySheetSession({
  schemeId,
  sheetId,
}: {
  schemeId: string;
  sheetId: string;
}) {
  const router = useRouter();
  const gs = useGameStore((s) => s.liveGameState);
  const setLiveGameState = useGameStore((s) => s.setLiveGameState);
  const activeSituationKey = useGameStore((s) => s.activeSituationKey);
  const setActiveSituationKey = useGameStore((s) => s.setActiveSituationKey);
  const gamePlanInGameTab = useGameStore((s) => s.gamePlanInGameTab);
  const setGamePlanInGameTab = useGameStore((s) => s.setGamePlanInGameTab);
  const setActivePlaySheetId = useGameStore((s) => s.setActivePlaySheetId);
  const appendLocalTimelineEvent = useGameStore(
    (s) => s.appendLocalTimelineEvent,
  );
  const clearLocalTimeline = useGameStore((s) => s.clearLocalTimeline);
  const localTimelineEvents = useGameStore((s) => s.localTimelineEvents);
  const setGameSessionId = useGameStore((s) => s.setGameSessionId);

  const [fieldOpen, setFieldOpen] = useState(false);
  const [scoreOpen, setScoreOpen] = useState(false);
  const [coverageOpen, setCoverageOpen] = useState(false);
  const [coverageNoteDraft, setCoverageNoteDraft] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);

  const draftKey = `sideline-pregame-${schemeId}-${sheetId}`;

  const { data: sheet } = useQuery({
    queryKey: ["playsheet", sheetId],
    queryFn: async () => {
      const res = await fetch(`/api/playsheets/${sheetId}`);
      if (!res.ok) return null;
      return (await res.json()) as PlaySheetWithPlays;
    },
    enabled: Boolean(sheetId),
  });

  const { data: scheme } = useQuery({
    queryKey: ["scheme-meta", schemeId],
    queryFn: async () => {
      const res = await fetch(`/api/schemes/${schemeId}`);
      if (!res.ok) return null;
      return (await res.json()) as Scheme;
    },
    enabled: Boolean(schemeId),
  });

  const playbook = useMemo(
    () => playbookFromSchemeField(scheme?.cfb26_playbook),
    [scheme?.cfb26_playbook],
  );

  const { data: fieldRules = [] } = useQuery({
    queryKey: ["field-position-rules"],
    queryFn: async () => {
      const res = await fetch("/api/field-position-rules");
      if (!res.ok) return [];
      return (await res.json()) as FieldPositionRuleRow[];
    },
    staleTime: 60 * 60_000,
  });

  const { data: covRules = [] } = useQuery({
    queryKey: ["coverage-affinities"],
    queryFn: async () => {
      const res = await fetch("/api/coverage-affinities");
      if (!res.ok) return [];
      return (await res.json()) as CoverageAffinityRow[];
    },
    staleTime: 60 * 60_000,
  });

  const { data: gamePlanBundle } = useQuery({
    queryKey: ["gameplan", schemeId, sheet?.defensive_scheme],
    queryFn: () =>
      fetchGamePlanBundle(schemeId, sheet!.defensive_scheme),
    enabled: Boolean(schemeId && sheet?.defensive_scheme),
    staleTime: 30 * 60_000,
  });

  const [rows, setRows] = useState<DraftPlayRow[]>([]);

  useEffect(() => {
    if (sheet?.plays) {
      setRows(sheet.plays.map((p) => playSheetPlayToDraft(p)));
    }
  }, [sheet]);

  useEffect(() => {
    setActivePlaySheetId(sheetId);
  }, [sheetId, setActivePlaySheetId]);

  const resetLiveGameFromPregame = useCallback(() => {
    const pre = readPregameDraft(draftKey);
    const tags: string[] = [];
    if (pre?.primary_coverage) {
      tags.push(primaryCoverageToTag(pre.primary_coverage));
    }
    useGameStore.getState().resetLiveGameState();
    if (tags.length) {
      useGameStore.getState().setLiveGameState({ coverageTags: tags });
    }
  }, [draftKey]);

  useEffect(() => {
    if (!sheet?.id) return;
    clearLocalTimeline();
    resetLiveGameFromPregame();
    setSessionId(null);
    setGameSessionId(null);
    let cancelled = false;
    (async () => {
      const pre = readPregameDraft(draftKey);
      const res = await fetch("/api/game-sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          play_sheet_id: sheetId,
          pregame: pre ?? undefined,
        }),
      });
      if (cancelled) return;
      if (res.ok) {
        const j = (await res.json()) as {
          session: { id: string };
          pregame: unknown;
        };
        setSessionId(j.session.id);
        setGameSessionId(j.session.id);
        return;
      }
      const local = `local-${crypto.randomUUID()}`;
      setSessionId(local);
      setGameSessionId(local);
    })();
    return () => {
      cancelled = true;
    };
  }, [
    sheet?.id,
    sheetId,
    draftKey,
    clearLocalTimeline,
    resetLiveGameFromPregame,
    setGameSessionId,
  ]);

  useEffect(() => {
    setActiveSituationKey(situationFromGameState(gs));
  }, [gs, setActiveSituationKey]);

  const enginePlays = useMemo(() => rows.map(rowToEngine), [rows]);

  const rec = useMemo(
    () => getRecommendation(gs, enginePlays, fieldRules, covRules),
    [gs, enginePlays, fieldRules, covRules],
  );

  const pushTimeline = useCallback(
    async (ev: Omit<LocalTimelineEvent, "id" | "createdAt">) => {
      const full: LocalTimelineEvent = {
        ...ev,
        id: crypto.randomUUID(),
        createdAt: Date.now(),
      };
      appendLocalTimelineEvent(full);
      const sid = useGameStore.getState().gameSessionId;
      if (sid && !sid.startsWith("local-")) {
        await fetch(`/api/game-sessions/${sid}/timeline`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            event_type: full.eventType,
            quarter: full.quarter,
            is_ot: full.isOt,
            field_zone: full.fieldZone,
            down: full.down,
            distance_bucket: full.distanceBucket,
            score_context: full.scoreContext,
            coverage_tags: full.coverageTags,
            play_called_formation: full.playFormation,
            play_called_name: full.playName,
            marked_used: full.markedUsed,
            quick_note: full.quickNote,
          }),
        });
      }
    },
    [appendLocalTimelineEvent],
  );

  const snapshotContext = useCallback(() => {
    const qNum = gs.quarter === "OT" ? 4 : gs.quarter;
    return {
      quarter: qNum,
      isOt: gs.quarter === "OT",
      fieldZone: gs.fieldZone,
      down: gs.down,
      distanceBucket: gs.distanceBucket,
      scoreContext: gs.scoreContext,
      coverageTags: [...gs.coverageTags],
    };
  }, [gs]);

  const onMarkUsed = useCallback(
    async (play: EnginePlay) => {
      const ctx = snapshotContext();
      await fetch(`/api/playsheets/${sheetId}/plays/${play.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_used: true }),
      });
      setRows((prev) =>
        prev.map((r) =>
          r.id === play.id ? { ...r, is_used: true } : r,
        ),
      );
      await pushTimeline({
        ...ctx,
        playFormation: play.formation,
        playName: play.play_name,
        markedUsed: true,
        quickNote: null,
        eventType: "play_used",
      });
    },
    [sheetId, snapshotContext, pushTimeline],
  );

  const onSwapPlay = useCallback((play: EnginePlay) => {
    setRows((prev) =>
      prev.map((r) =>
        r.id === play.id
          ? {
              ...r,
              formation: play.formation,
              play_name: play.play_name,
              coaching_note: play.coaching_note,
              counter_play: play.counter_play,
              play_type: play.play_type,
            }
          : r,
      ),
    );
  }, []);

  const cycleDown = () => {
    const next = ((gs.down % 4) + 1) as LiveGameState["down"];
    setLiveGameState({ down: next });
  };

  const cycleDistance = () => {
    const o: LiveGameState["distanceBucket"][] = ["SHORT", "MED", "LONG"];
    const i = o.indexOf(gs.distanceBucket);
    setLiveGameState({ distanceBucket: o[(i + 1) % o.length] });
  };

  const cycleQuarter = () => {
    if (gs.quarter === 1) setLiveGameState({ quarter: 2 });
    else if (gs.quarter === 2) setLiveGameState({ quarter: 3 });
    else if (gs.quarter === 3) setLiveGameState({ quarter: 4 });
    else if (gs.quarter === 4) setLiveGameState({ quarter: "OT" });
    else setLiveGameState({ quarter: 1 });
  };

  const toggleCoverageTag = async (tag: string) => {
    const upper = tag.toUpperCase();
    const has = gs.coverageTags.some(
      (t) => t.toUpperCase() === upper,
    );
    const next = has
      ? gs.coverageTags.filter((t) => t.toUpperCase() !== upper)
      : [...gs.coverageTags, tag];
    setLiveGameState({ coverageTags: next });
    const ctx = snapshotContext();
    await pushTimeline({
      ...ctx,
      coverageTags: next,
      playFormation: null,
      playName: null,
      markedUsed: false,
      quickNote: null,
      eventType: "coverage_tag",
    });
  };

  const submitQuickNote = async () => {
    const t = coverageNoteDraft.trim();
    if (!t) return;
    const ctx = snapshotContext();
    await pushTimeline({
      ...ctx,
      coverageTags: [...gs.coverageTags],
      playFormation: null,
      playName: null,
      markedUsed: false,
      quickNote: t,
      eventType: "note",
    });
    setCoverageNoteDraft("");
    setCoverageOpen(false);
  };

  if (!sheet) {
    return (
      <div className="min-h-screen px-4 py-16">
        <p className="font-mono text-sm text-[var(--chalk-muted)]">
          Loading…
        </p>
      </div>
    );
  }

  const matchup = `${scheme?.name ?? "Scheme"} vs ${sheet.defensive_scheme}`;

  return (
    <div className="flex min-h-screen flex-col bg-[var(--bg)]">
      <header className="shrink-0 border-b border-white/10 bg-black/40 px-3 py-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Link
            href={`/scheme/${schemeId}/playsheet/${sheetId}`}
            className="font-mono text-[10px] text-[var(--accent-soft)]"
          >
            ← Sheet
          </Link>
          <button
            type="button"
            onClick={() =>
              router.push(
                `/scheme/${schemeId}/playsheet/${sheetId}/postgame?s=${encodeURIComponent(sessionId ?? "")}`,
              )
            }
            className="rounded border border-white/20 px-2 py-1 font-mono text-[10px] uppercase text-[var(--chalk-muted)]"
          >
            End game
          </button>
        </div>
        <h1 className="mt-2 font-display text-xl text-[var(--chalk)]">
          In-game
        </h1>
        <p className="mt-1 font-mono text-[11px] text-[var(--chalk-muted)]">
          {matchup}
        </p>
      </header>

      <div className="shrink-0">
        <GameStateBar
          gs={gs}
          onOpenField={() => setFieldOpen(true)}
          onOpenScore={() => setScoreOpen(true)}
          onOpenCoverage={() => setCoverageOpen(true)}
          onCycleDown={cycleDown}
          onCycleDistance={cycleDistance}
          onCycleQuarter={cycleQuarter}
          onToggleTwoMinute={() =>
            setLiveGameState({ twoMinuteDrill: !gs.twoMinuteDrill })
          }
        />
        <LiveRecommendationCard
          rec={rec}
          gs={gs}
          sheetId={sheetId}
          defensiveScheme={sheet.defensive_scheme}
          playbook={playbook}
          onMarkUsed={(p) => void onMarkUsed(p)}
          onSwapPlay={onSwapPlay}
        />
      </div>

      <div className="flex min-h-0 flex-1 flex-col border-t border-white/10">
        <div className="flex shrink-0 gap-1 border-b border-white/10 bg-black/30 px-2 py-2">
          {(
            [
              ["calls", "Call sheet"],
              ["mysheet", "My sheet"],
              ["timeline", "Timeline"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setGamePlanInGameTab(id)}
              className={`rounded px-3 py-2 font-mono text-[10px] uppercase tracking-wider ${
                gamePlanInGameTab === id
                  ? "bg-[var(--amber)]/20 text-[var(--chalk)]"
                  : "text-[var(--chalk-muted)]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <SituationQuickNav
            activeSituation={activeSituationKey}
            onSelect={setActiveSituationKey}
          />
          {gamePlanInGameTab === "calls" && gamePlanBundle ? (
            <InGameCallSheet
              calls={gamePlanBundle.adjustedCalls}
              activeSituation={activeSituationKey}
              onSelectSituation={setActiveSituationKey}
            />
          ) : null}
          {gamePlanInGameTab === "mysheet" ? (
            <InGameSheet
              rows={rows}
              activeSituation={activeSituationKey}
              sheetId={sheetId}
              defensiveScheme={sheet.defensive_scheme}
              playbook={playbook}
              onRowsChange={setRows}
              onMarkPlayUsed={(row) => {
                void pushTimeline({
                  ...snapshotContext(),
                  playFormation: row.formation,
                  playName: row.play_name,
                  markedUsed: true,
                  quickNote: null,
                  eventType: "play_used",
                });
              }}
            />
          ) : null}
          {gamePlanInGameTab === "timeline" ? (
            <GameTimeline events={localTimelineEvents} />
          ) : null}
          {gamePlanInGameTab === "calls" && !gamePlanBundle ? (
            <p className="px-4 py-8 font-mono text-sm text-[var(--chalk-muted)]">
              Game plan data not available for this matchup.
            </p>
          ) : null}
        </div>
      </div>

      <div className="shrink-0 border-t border-white/10 bg-black/50 px-3 py-4">
        <PreGameNotesForm
          draftStorageKey={draftKey}
          sessionId={sessionId}
        />
      </div>

      <FieldStripSelector
        open={fieldOpen}
        current={gs.fieldZone}
        onClose={() => setFieldOpen(false)}
        onSelect={(z: FieldZone) => setLiveGameState({ fieldZone: z })}
      />
      <ScoreContextDrawer
        open={scoreOpen}
        current={gs.scoreContext}
        onClose={() => setScoreOpen(false)}
        onSelect={(c) => setLiveGameState({ scoreContext: c })}
      />
      <CoverageQuickTagDrawer
        open={coverageOpen}
        activeTags={gs.coverageTags}
        onClose={() => setCoverageOpen(false)}
        onToggleTag={(t) => void toggleCoverageTag(t)}
        quickNote={coverageNoteDraft}
        onQuickNote={setCoverageNoteDraft}
        onSubmitNote={() => void submitQuickNote()}
      />
    </div>
  );
}
