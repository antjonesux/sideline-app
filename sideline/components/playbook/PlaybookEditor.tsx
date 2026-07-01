"use client";
// QA26: Design system enforcement pass — replaced inline styles, unified icons, enforced card/typography tokens

import type { SuggestionRow } from "@/lib/loggedPlayStats";
import { scenarioDisplayLabel, maxSlotsForSheetScenario, sortSheetScenariosByCanonicalOrder, isCallSheetPlaySheet, sheetPlayComboKey, callSheetScenarioDisplayName, callSheetScenarioHelperText, callSheetScenarioPlayCountLabel } from "@/lib/playbookUtils";
import { CALL_SHEET_SCENARIOS, GO_TO_PLAYS_SCENARIO } from "@/lib/constants";
import { defaultColorForNewSituation, MAX_SITUATIONS_PER_SHEET } from "@/lib/situationApiHelpers";
import { appShellHeaderActionButtonClass, appShellPageTitleClass, appShellSituationAddPlayButtonClass, modalCtaFooterClass, overlayZ, responsiveOverlayBottomShellPositionClass, responsiveOverlayDialogContentClass } from "@/lib/constants/designTokens";
import { cn, normalizePlayName } from "@/lib/utils";
import type { SheetPlayRow, SheetScenarioBlock } from "@/lib/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BackNavLink } from "@/components/shared/BackNavLink";
import { ConfirmDestructiveModal } from "@/components/shared/ConfirmDestructiveModal";
import { Breadcrumb } from "@/components/shared/Breadcrumb";
import { PlayTableHeader } from "@/components/game-plan/PlayTableHeader";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PlaybookEditorSkeleton } from "@/components/shared/AppSkeleton";
import {
  COULDNT_SAVE,
  BUILDER_ADD_PLAY,
  BUILDER_DELETE_SITUATION_BODY,
  BUILDER_DELETE_SITUATION_TITLE,
  BUILDER_PLAY_ADDED_TO_SITUATION,
  BUILDER_SITUATION_ADDED,
  BUILDER_SITUATION_DELETED,
  BUILDER_SITUATION_UPDATED,
  BUILDER_BROWSE_PLAYBOOK,
  BUILDER_BROWSE_SITUATION_PROMPT,
  BUILDER_SITUATION_AT_CAPACITY,
  GO_TO_PLAY_ADDED,
  GO_TO_PLAY_ALREADY,
  GO_TO_PLAY_REMOVED,
  GO_TO_PLAYS_EMPTY_BODY,
  GO_TO_PLAYS_EMPTY_HEADLINE,
  GO_TO_PLAYS_FULL,
  GUIDED_ONBOARDING_EDITOR_SCENARIO,
  ONBOARDING_GAME_READY,
  ONBOARDING_OPPONENT_SCHEME,
  ONBOARDING_OPPONENT_TEAM,
  ONBOARDING_START_LOGS,
} from "@/lib/coachCopy";
import { useLastGamePrefsStore } from "@/store/lastGamePrefsStore";
import { useToastStore } from "@/store/toastStore";
import { useScrollLock } from "@/lib/useScrollLock";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AddPlayDrawer } from "./AddPlayDrawer";
import { CallSheetBuilderDashboard } from "./CallSheetBuilderDashboard";
import { CallSheetBuilderSheetHeader } from "./CallSheetBuilderSheetHeader";
import { CallSheetBuilderSituationHeader } from "./CallSheetBuilderSituationHeader";
import { CallSheetBuilderSituationWorkspace } from "./CallSheetBuilderSituationWorkspace";
import { CallSheetBuilderWorkspaceChrome } from "./CallSheetBuilderWorkspaceChrome";
import { CallSheetCoachView } from "./CallSheetCoachView";
import { CallSheetEditorTabBar, type CallSheetEditorTab } from "./CallSheetEditorTabBar";
import { CallSheetSituationGrid } from "./CallSheetSituationGrid";
import { PlaySlot } from "./PlaySlot";
import { PlaySuggestions } from "./PlaySuggestions";
import { SituationFormModal, type SituationFormValues } from "./SituationFormModal";
import { SituationList } from "./SituationList";
import { CallSheetMetadataRow } from "@/components/playbook/CallSheetMetadataRow";
import { useCatalogPlaybookMeta } from "@/hooks/useCatalogPlaybooks";
import { callSheetDetailsMetadataLabels } from "@/lib/playbookUtils";

const STALE_SCENARIO_MS = 5 * 60 * 1000;

type SheetPayload = {
  id: string;
  name: string;
  playbook: string;
  cfb26_playbook?: string | null;
  scheme: string;
  cfb26_display?: string;
  scenarios: SheetScenarioBlock[];
};

type ScenarioPayload = {
  scenarioId: string;
  scenario: string;
  plays: SheetPlayRow[];
  scenarioStats: Record<string, { uses: number; avg_yards: number; success_rate: number }>;
  formationStats: Record<string, { uses: number; success_rate: number }>;
  suggestions: SuggestionRow[];
};

type SetupApi = {
  offensiveTeams: { team_name: string; playbook_name: string; scheme_style: string }[];
};

const MIN_ONBOARDING_SHEET_PLAYS = 3;

export function PlaybookEditor({ sheetId }: { sheetId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const onboardingEditor = searchParams.get("onboarding") === "1";
  const situationParam = searchParams.get("situation")?.trim() ?? "";
  const setLastGame = useLastGamePrefsStore((s) => s.setLastGame);
  const queryClient = useQueryClient();
  const [legacyActiveScenario, setLegacyActiveScenario] = useState<string>("1st Down");
  const [dragId, setDragId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerAddedKeys, setDrawerAddedKeys] = useState<Set<string>>(() => new Set());
  const [drawerAddsThisSession, setDrawerAddsThisSession] = useState(0);
  const [browsePlaybookMode, setBrowsePlaybookMode] = useState(false);
  const [pendingBrowsePick, setPendingBrowsePick] = useState<{ formation: string; play_name: string } | null>(
    null,
  );
  const [browseSituationBusy, setBrowseSituationBusy] = useState(false);
  const [suggestBusy, setSuggestBusy] = useState<string | null>(null);
  const [replaceSuggest, setReplaceSuggest] = useState<SuggestionRow | null>(null);
  const [goToBusyId, setGoToBusyId] = useState<string | null>(null);
  const [goToBusyComboKey, setGoToBusyComboKey] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorTab, setEditorTab] = useState<CallSheetEditorTab>("situations");
  const [editName, setEditName] = useState("");
  const [editPlaybook, setEditPlaybook] = useState("");
  const [startGuidedBusy, setStartGuidedBusy] = useState(false);
  const [situationsEditMode, setSituationsEditMode] = useState(false);
  const [situationDragId, setSituationDragId] = useState<string | null>(null);
  const [editScenarios, setEditScenarios] = useState<SheetScenarioBlock[]>([]);
  const [createSituationOpen, setCreateSituationOpen] = useState(false);
  const [editSituationOpen, setEditSituationOpen] = useState(false);
  const [deleteSituationTarget, setDeleteSituationTarget] = useState<SheetScenarioBlock | null>(null);
  const [situationFormBusy, setSituationFormBusy] = useState(false);
  const [mdWorkspaceUp, setMdWorkspaceUp] = useState(false);
  const prevActiveScenarioRef = useRef<string | null>(null);
  const addToast = useToastStore((s) => s.addToast);
  useScrollLock(editorOpen);

  const sheetQuery = useQuery({
    queryKey: ["playbook", sheetId],
    queryFn: async () => {
      const res = await fetch(`/api/playbook/${sheetId}`);
      const j = (await res.json()) as SheetPayload & { error?: string };
      if (!res.ok) throw new Error(j.error ?? "Failed to load play sheet");
      return j;
    },
    retry: 2,
    staleTime: 5 * 60 * 1000,
  });

  const sheet = sheetQuery.data;
  const scenarios = useMemo(
    () => sortSheetScenariosByCanonicalOrder(sheet?.scenarios ?? []),
    [sheet?.scenarios],
  );
  const callSheetSheet = useMemo(() => isCallSheetPlaySheet(scenarios), [scenarios]);
  const useCallSheetBuilderLayout = callSheetSheet && !onboardingEditor;
  const isSituationEdit = useCallSheetBuilderLayout && Boolean(situationParam);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const sync = () => setMdWorkspaceUp(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  const activeScenario = useMemo(() => {
    if (situationParam) return situationParam;
    if (onboardingEditor) {
      const pick =
        scenarios.find((s) => s.scenario === GUIDED_ONBOARDING_EDITOR_SCENARIO)?.scenario ??
        scenarios[0]?.scenario ??
        CALL_SHEET_SCENARIOS[0];
      return pick;
    }
    if (useCallSheetBuilderLayout) return CALL_SHEET_SCENARIOS[0];
    if (scenarios.some((s) => s.scenario === legacyActiveScenario)) return legacyActiveScenario;
    return scenarios[0]?.scenario ?? "1st Down";
  }, [situationParam, onboardingEditor, useCallSheetBuilderLayout, scenarios, legacyActiveScenario]);

  const scenarioQuery = useQuery({
    queryKey: ["playbook-scenario", sheetId, activeScenario],
    queryFn: async () => {
      const q = new URLSearchParams({ scenario: activeScenario });
      const res = await fetch(`/api/playbook/${sheetId}/plays?${q.toString()}`);
      const j = (await res.json()) as ScenarioPayload & { error?: string };
      if (!res.ok) throw new Error(j.error ?? "Failed to load scenario");
      return j;
    },
    staleTime: STALE_SCENARIO_MS,
    enabled:
      Boolean(sheetId) &&
      Boolean(activeScenario) &&
      (onboardingEditor || !useCallSheetBuilderLayout || isSituationEdit),
  });
  const setupQuery = useQuery({
    queryKey: ["film-setup"],
    queryFn: async () => {
      const res = await fetch("/api/film/setup");
      if (!res.ok) throw new Error("Failed to load CFB26 playbooks");
      return res.json() as Promise<SetupApi>;
    },
    staleTime: 60 * 60 * 1000,
  });

  const totalSheetPlays = useMemo(
    () => scenarios.reduce((acc, s) => acc + (s.plays?.length ?? 0), 0),
    [scenarios],
  );
  const scenarioPayload = scenarioQuery.data;

  useEffect(() => {
    if (!scenarios.length || !useCallSheetBuilderLayout || !situationParam) return;
    if (!scenarios.some((s) => s.scenario === situationParam)) {
      router.replace(`/playbook/${sheetId}`);
    }
  }, [scenarios, situationParam, router, sheetId, useCallSheetBuilderLayout]);

  useEffect(() => {
    if (!scenarios.length || useCallSheetBuilderLayout || onboardingEditor) return;
    if (!scenarios.some((s) => s.scenario === legacyActiveScenario)) {
      setLegacyActiveScenario(scenarios[0]?.scenario ?? "1st Down");
    }
  }, [scenarios, legacyActiveScenario, useCallSheetBuilderLayout, onboardingEditor]);

  useEffect(() => {
    if (
      prevActiveScenarioRef.current !== null &&
      prevActiveScenarioRef.current !== activeScenario
    ) {
      setDrawerOpen(false);
      setBrowsePlaybookMode(false);
      setPendingBrowsePick(null);
      setDrawerAddedKeys(new Set());
      setDrawerAddsThisSession(0);
      setReplaceSuggest(null);
    }
    prevActiveScenarioRef.current = activeScenario;
  }, [activeScenario]);

  const activeBlock = useMemo(
    () => scenarios.find((s) => s.scenario === activeScenario),
    [scenarios, activeScenario],
  );

  const goToBlock = useMemo(
    () => scenarios.find((s) => s.is_locked || s.scenario === GO_TO_PLAYS_SCENARIO),
    [scenarios],
  );

  const goToPlayKeys = useMemo(() => {
    const keys = new Set<string>();
    for (const play of goToBlock?.plays ?? []) {
      keys.add(sheetPlayComboKey(play.formation, play.play_name));
    }
    return keys;
  }, [goToBlock?.plays]);

  const goToPlayByComboKey = useMemo(() => {
    const map = new Map<string, SheetPlayRow>();
    for (const play of goToBlock?.plays ?? []) {
      map.set(sheetPlayComboKey(play.formation, play.play_name), play);
    }
    return map;
  }, [goToBlock?.plays]);

  const isGoToSituation =
    callSheetSheet && !onboardingEditor && Boolean(activeBlock?.is_locked || activeScenario === GO_TO_PLAYS_SCENARIO);
  const useCallSheetPlayRows = callSheetSheet && !onboardingEditor && isSituationEdit;
  const showGoToStar = callSheetSheet && !onboardingEditor && Boolean(goToBlock?.id);
  const goToAtCapacity = (goToBlock?.plays.length ?? 0) >= maxSlotsForSheetScenario(GO_TO_PLAYS_SCENARIO);

  const sortedPlays = useMemo(() => {
    const plays = activeBlock?.plays ?? [];
    return [...plays].sort((a, b) => a.play_order - b.play_order);
  }, [activeBlock?.plays]);

  const maxSlots = maxSlotsForSheetScenario(activeScenario);
  const filled = sortedPlays.length;
  const atCapacity = filled >= maxSlots;

  const drawerDisplayedPlayKeys = useMemo(() => {
    const keys = new Set(drawerAddedKeys);
    if (!browsePlaybookMode && activeBlock) {
      for (const play of activeBlock.plays) {
        keys.add(sheetPlayComboKey(play.formation, play.play_name));
      }
    }
    return keys;
  }, [activeBlock, browsePlaybookMode, drawerAddedKeys]);

  const cfb26PlaybookOptions = useMemo(() => {
    const set = new Set<string>();
    for (const row of setupQuery.data?.offensiveTeams ?? []) {
      if (row.playbook_name?.trim()) set.add(row.playbook_name.trim());
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [setupQuery.data?.offensiveTeams]);
  const cfb26 = useMemo(() => {
    if (!sheet) return "";
    const optionByLower = new Map<string, string>();
    for (const option of cfb26PlaybookOptions) {
      optionByLower.set(option.toLowerCase(), option);
    }
    const explicitCfb26 = (sheet.cfb26_playbook ?? "").trim();
    if (explicitCfb26) {
      return optionByLower.get(explicitCfb26.toLowerCase()) ?? explicitCfb26;
    }
    const legacyValue = (sheet.playbook ?? "").trim();
    if (!legacyValue) return "";
    // If setup options are unavailable, do not over-block legacy rows; let PlayBrowser fetch and surface catalog errors.
    if (optionByLower.size === 0) return legacyValue;
    // Legacy rows can store a display label in `playbook`; pass through only when it maps to a known catalog entry.
    return optionByLower.get(legacyValue.toLowerCase()) ?? "";
  }, [sheet, cfb26PlaybookOptions]);

  const { data: catalogMeta } = useCatalogPlaybookMeta(cfb26);

  const invalidateSheet = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ["playbook", sheetId] });
    void queryClient.invalidateQueries({ queryKey: ["playbooks", "list"] });
  }, [queryClient, sheetId]);

  const invalidateScenario = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ["playbook-scenario", sheetId, activeScenario] });
    invalidateSheet();
  }, [queryClient, sheetId, activeScenario, invalidateSheet]);

  const reorderSituations = useMutation({
    mutationFn: async (situationIds: string[]) => {
      const res = await fetch(`/api/playbook/${sheetId}/situations/reorder`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ situationIds }),
      });
      const j = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(j.error ?? "Could not reorder");
      return j;
    },
    onSuccess: (_data, situationIds) => {
      queryClient.setQueryData<SheetPayload>(["playbook", sheetId], (old) => {
        if (!old) return old;
        const byId = new Map(old.scenarios.map((s) => [s.id, s]));
        const reordered = situationIds
          .map((id, index) => {
            const block = byId.get(id);
            if (!block) return null;
            return { ...block, scenario_order: index + 1 };
          })
          .filter((s): s is SheetScenarioBlock => Boolean(s));
        if (reordered.length !== old.scenarios.length) return old;
        return { ...old, scenarios: reordered };
      });
    },
  });

  const createSituation = useMutation({
    mutationFn: async (values: SituationFormValues) => {
      const res = await fetch(`/api/playbook/${sheetId}/situations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: values.name,
          description: values.description,
          icon: values.icon,
          color: values.color,
        }),
      });
      const j = (await res.json()) as { error?: string; data?: { situation: { scenario: string } } };
      if (!res.ok) throw new Error(j.error ?? "Could not create situation");
      return j;
    },
    onSuccess: () => invalidateSheet(),
  });

  const updateSituation = useMutation({
    mutationFn: async ({
      situationId,
      values,
    }: {
      situationId: string;
      values: SituationFormValues;
    }) => {
      const res = await fetch(`/api/playbook/${sheetId}/situations/${situationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: values.name,
          description: values.description,
          icon: values.icon,
          color: values.color,
        }),
      });
      const j = (await res.json()) as {
        error?: string;
        data?: { situation: { scenario: string } };
      };
      if (!res.ok) throw new Error(j.error ?? "Could not update situation");
      return j;
    },
    onSuccess: (_data, variables) => {
      invalidateSheet();
      if (variables.values.name !== activeScenario && activeScenario) {
        void queryClient.invalidateQueries({ queryKey: ["playbook-scenario", sheetId, activeScenario] });
      }
    },
  });

  const deleteSituation = useMutation({
    mutationFn: async (situationId: string) => {
      const res = await fetch(`/api/playbook/${sheetId}/situations/${situationId}`, { method: "DELETE" });
      const j = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(j.error ?? "Could not delete situation");
      return j;
    },
    onSuccess: () => invalidateSheet(),
  });

  const dashboardScenarios = situationsEditMode ? editScenarios : scenarios;

  const usedSituationColors = useMemo(
    () => scenarios.map((s) => s.color ?? "blue").filter(Boolean),
    [scenarios],
  );

  const toggleSituationsEditMode = useCallback(async () => {
    if (!situationsEditMode) {
      setEditScenarios([...scenarios]);
      setSituationsEditMode(true);
      return;
    }

    setSituationsEditMode(false);
    setSituationDragId(null);
  }, [situationsEditMode, scenarios]);

  const onReorderSituations = useCallback(
    (fromId: string, toIndex: number) => {
      setEditScenarios((prev) => {
        const snapshot = prev.length ? prev : scenarios;
        const ids = snapshot.map((s) => s.id);
        const without = ids.filter((id) => id !== fromId);
        const insertAt = Math.min(Math.max(0, toIndex), without.length);
        const nextIds = [...without.slice(0, insertAt), fromId, ...without.slice(insertAt)];
        const next = nextIds
          .map((id) => snapshot.find((s) => s.id === id))
          .filter((s): s is SheetScenarioBlock => Boolean(s));

        void reorderSituations.mutateAsync(next.map((s) => s.id)).catch(() => {
          addToast(COULDNT_SAVE, "error");
          setEditScenarios([...scenarios]);
        });

        return next;
      });
    },
    [addToast, reorderSituations, scenarios],
  );

  const onCreateSituation = useCallback(
    async (values: SituationFormValues) => {
      setSituationFormBusy(true);
      try {
        await createSituation.mutateAsync(values);
        addToast(BUILDER_SITUATION_ADDED(values.name), "success");
        setCreateSituationOpen(false);
      } catch {
        addToast(COULDNT_SAVE, "error");
      } finally {
        setSituationFormBusy(false);
      }
    },
    [addToast, createSituation],
  );

  const onUpdateSituation = useCallback(
    async (values: SituationFormValues) => {
      if (!activeBlock?.id) return;
      setSituationFormBusy(true);
      try {
        const result = await updateSituation.mutateAsync({ situationId: activeBlock.id, values });
        const updatedName = result.data?.situation?.scenario ?? values.name;
        addToast(BUILDER_SITUATION_UPDATED(updatedName), "success");
        setEditSituationOpen(false);
        if (updatedName !== activeScenario) {
          router.replace(`/playbook/${sheetId}?situation=${encodeURIComponent(updatedName)}`);
        }
      } catch {
        addToast(COULDNT_SAVE, "error");
      } finally {
        setSituationFormBusy(false);
      }
    },
    [activeBlock?.id, activeScenario, addToast, router, sheetId, updateSituation],
  );

  const confirmDeleteSituation = useCallback(async () => {
    if (!deleteSituationTarget) return;
    const target = deleteSituationTarget;
    setSituationFormBusy(true);
    try {
      await deleteSituation.mutateAsync(target.id);
      addToast(BUILDER_SITUATION_DELETED(callSheetScenarioDisplayName(target.scenario)), "success");
      setDeleteSituationTarget(null);
      setEditSituationOpen(false);
      if (isSituationEdit && target.scenario === activeScenario) {
        router.replace(`/playbook/${sheetId}`);
      }
      if (situationsEditMode) {
        setEditScenarios((prev) => prev.filter((s) => s.id !== target.id));
      }
    } catch {
      addToast(COULDNT_SAVE, "error");
    } finally {
      setSituationFormBusy(false);
    }
  }, [
    activeScenario,
    addToast,
    deleteSituation,
    deleteSituationTarget,
    isSituationEdit,
    router,
    sheetId,
    situationsEditMode,
  ]);

  const postPlay = useMutation({
    mutationFn: async (body: { scenarioId: string; formation: string; play_name: string }) => {
      const res = await fetch(`/api/playbook/${sheetId}/plays`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(j.error ?? "Could not add play");
      return j;
    },
    onSuccess: () => invalidateScenario(),
  });

  const deletePlay = useMutation({
    mutationFn: async (playId: string) => {
      const res = await fetch(`/api/playbook/${sheetId}/plays?playId=${encodeURIComponent(playId)}`, { method: "DELETE" });
      const j = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(j.error ?? "Could not remove");
      return j;
    },
    onSuccess: () => invalidateScenario(),
  });

  const reorderPlays = useMutation({
    mutationFn: async (payload: { scenarioId: string; orderedPlayIds: string[] }) => {
      const res = await fetch(`/api/playbook/${sheetId}/plays`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reorder", ...payload }),
      });
      const j = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(j.error ?? "Could not reorder");
      return j;
    },
    onSuccess: () => invalidateScenario(),
  });

  const swapPlay = useMutation({
    mutationFn: async (body: { playId: string; formation: string; play_name: string }) => {
      const res = await fetch(`/api/playbook/${sheetId}/plays`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "swap", ...body }),
      });
      const j = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(j.error ?? "Could not replace play");
      return j;
    },
    onSuccess: () => invalidateScenario(),
  });

  const updateSheet = useMutation({
    mutationFn: async (body: { name: string; cfb26_playbook: string }) => {
      const res = await fetch(`/api/playbook/${sheetId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(j.error ?? "Could not update play sheet");
      return j;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["playbook", sheetId] });
      await queryClient.invalidateQueries({ queryKey: ["playbook-scenario", sheetId] });
      await queryClient.invalidateQueries({ queryKey: ["playbooks", "list"] });
    },
  });

  const onAddToGoTo = useCallback(
    async (play: SheetPlayRow) => {
      const goToId = goToBlock?.id;
      if (!goToId) {
        addToast(COULDNT_SAVE, "error");
        return;
      }
      const comboKey = sheetPlayComboKey(play.formation, play.play_name);
      if (goToPlayKeys.has(comboKey)) {
        addToast(GO_TO_PLAY_ALREADY, "warning");
        return;
      }
      if (goToAtCapacity) {
        addToast(GO_TO_PLAYS_FULL(maxSlotsForSheetScenario(GO_TO_PLAYS_SCENARIO)), "warning");
        return;
      }
      setGoToBusyId(play.id);
      try {
        await postPlay.mutateAsync({
          scenarioId: goToId,
          formation: play.formation,
          play_name: play.play_name,
        });
        addToast(GO_TO_PLAY_ADDED, "success");
      } catch (e) {
        const msg = e instanceof Error && e.message.includes("already exists") ? GO_TO_PLAY_ALREADY : COULDNT_SAVE;
        addToast(msg, e instanceof Error && e.message.includes("already exists") ? "warning" : "error");
      } finally {
        setGoToBusyId(null);
      }
    },
    [addToast, goToAtCapacity, goToBlock?.id, goToPlayKeys, postPlay],
  );

  const onToggleGoToFavorite = useCallback(
    async (play: SheetPlayRow) => {
      const comboKey = sheetPlayComboKey(play.formation, play.play_name);
      const goToPlay = isGoToSituation ? play : goToPlayByComboKey.get(comboKey);
      if (goToPlayKeys.has(comboKey) && goToPlay) {
        setGoToBusyId(play.id);
        try {
          await deletePlay.mutateAsync(goToPlay.id);
          addToast(GO_TO_PLAY_REMOVED, "success");
        } catch {
          addToast(COULDNT_SAVE, "error");
        } finally {
          setGoToBusyId(null);
        }
        return;
      }
      await onAddToGoTo(play);
    },
    [deletePlay, goToPlayByComboKey, goToPlayKeys, isGoToSituation, onAddToGoTo, addToast],
  );

  const onBrowseToggleGoTo = useCallback(
    async (formation: string, play_name: string) => {
      const comboKey = sheetPlayComboKey(formation, play_name);
      const goToPlay = goToPlayByComboKey.get(comboKey);
      if (goToPlayKeys.has(comboKey) && goToPlay) {
        setGoToBusyComboKey(comboKey);
        try {
          await deletePlay.mutateAsync(goToPlay.id);
          addToast(GO_TO_PLAY_REMOVED, "success");
        } catch {
          addToast(COULDNT_SAVE, "error");
        } finally {
          setGoToBusyComboKey(null);
        }
        return;
      }
      const goToId = goToBlock?.id;
      if (!goToId) {
        addToast(COULDNT_SAVE, "error");
        return;
      }
      if (goToAtCapacity) {
        addToast(GO_TO_PLAYS_FULL(maxSlotsForSheetScenario(GO_TO_PLAYS_SCENARIO)), "warning");
        return;
      }
      setGoToBusyComboKey(comboKey);
      try {
        await postPlay.mutateAsync({
          scenarioId: goToId,
          formation,
          play_name,
        });
        addToast(GO_TO_PLAY_ADDED, "success");
      } catch (e) {
        const msg = e instanceof Error && e.message.includes("already exists") ? GO_TO_PLAY_ALREADY : COULDNT_SAVE;
        addToast(msg, e instanceof Error && e.message.includes("already exists") ? "warning" : "error");
      } finally {
        setGoToBusyComboKey(null);
      }
    },
    [addToast, deletePlay, goToAtCapacity, goToBlock?.id, goToPlayByComboKey, goToPlayKeys, postPlay],
  );

  const onReorder = useCallback(
    (fromId: string, toSlotIndex: number) => {
      const sid = activeBlock?.id;
      if (!sid) return;
      const ids = sortedPlays.map((p) => p.id);
      const without = ids.filter((id) => id !== fromId);
      const insertAt = Math.min(Math.max(0, toSlotIndex), without.length);
      const next = [...without.slice(0, insertAt), fromId, ...without.slice(insertAt)];
      reorderPlays.mutate({ scenarioId: sid, orderedPlayIds: next });
    },
    [sortedPlays, reorderPlays, activeBlock?.id],
  );

  const openAdd = useCallback(() => {
    if (atCapacity) {
      addToast(`Situation full (${maxSlots}/${maxSlots} slots).`, "warning");
      return;
    }
    setBrowsePlaybookMode(false);
    setDrawerOpen(true);
  }, [addToast, atCapacity, maxSlots]);

  const onDrawerPick = useCallback(
    async (formation: string, play_name: string) => {
      if (browsePlaybookMode) {
        setPendingBrowsePick({ formation, play_name });
        return;
      }
      const sid = activeBlock?.id;
      if (!sid) {
        addToast(COULDNT_SAVE, "error");
        throw new Error("missing scenario");
      }
      const comboKey = sheetPlayComboKey(formation, play_name);
      const nextCount = filled + drawerAddsThisSession + 1;
      if (nextCount > maxSlots) {
        addToast(
          BUILDER_SITUATION_AT_CAPACITY(callSheetScenarioDisplayName(activeScenario), maxSlots),
          "warning",
        );
        throw new Error("at capacity");
      }
      try {
        await postPlay.mutateAsync({ scenarioId: sid, formation, play_name });
        setDrawerAddedKeys((prev) => new Set(prev).add(comboKey));
        setDrawerAddsThisSession((count) => count + 1);
        addToast(BUILDER_PLAY_ADDED_TO_SITUATION(callSheetScenarioDisplayName(activeScenario)), "success");
        if (nextCount >= maxSlots) {
          addToast(
            BUILDER_SITUATION_AT_CAPACITY(callSheetScenarioDisplayName(activeScenario), maxSlots),
            "warning",
          );
        }
      } catch {
        addToast(COULDNT_SAVE, "error");
        throw new Error("add failed");
      }
    },
    [
      activeBlock?.id,
      activeScenario,
      addToast,
      browsePlaybookMode,
      drawerAddsThisSession,
      filled,
      maxSlots,
      postPlay,
    ],
  );

  const onBrowseSituationPick = useCallback(
    async (scenario: string) => {
      const pick = pendingBrowsePick;
      if (!pick || browseSituationBusy) return;
      const block = scenarios.find((s) => s.scenario === scenario);
      if (!block?.id) {
        addToast(COULDNT_SAVE, "error");
        return;
      }
      const max = maxSlotsForSheetScenario(scenario);
      if (block.plays.length >= max) {
        addToast(`Situation full (${max}/${max} slots).`, "warning");
        return;
      }
      setBrowseSituationBusy(true);
      try {
        await postPlay.mutateAsync({
          scenarioId: block.id,
          formation: pick.formation,
          play_name: pick.play_name,
        });
        void queryClient.invalidateQueries({ queryKey: ["playbook-scenario", sheetId, scenario] });
        addToast(BUILDER_PLAY_ADDED_TO_SITUATION(callSheetScenarioDisplayName(scenario)), "success");
        const nextCount = block.plays.length + 1;
        if (nextCount >= max) {
          addToast(BUILDER_SITUATION_AT_CAPACITY(callSheetScenarioDisplayName(scenario), max), "warning");
        }
        setPendingBrowsePick(null);
      } catch {
        addToast(COULDNT_SAVE, "error");
      } finally {
        setBrowseSituationBusy(false);
      }
    },
    [addToast, browseSituationBusy, pendingBrowsePick, postPlay, queryClient, scenarios, sheetId],
  );

  const onSuggestAdd = useCallback(
    async (s: SuggestionRow) => {
      if (atCapacity) {
        setReplaceSuggest(s);
        return;
      }
      const sid = activeBlock?.id;
      if (!sid) {
        addToast(COULDNT_SAVE, "error");
        return;
      }
      const busyKey = `${s.formation}\t${s.play_name}`;
      setSuggestBusy(busyKey);
      try {
        await postPlay.mutateAsync({
          scenarioId: sid,
          formation: s.formation,
          play_name: s.play_name,
        });
        addToast("Added to sheet.", "success");
      } catch (e) {
        addToast(COULDNT_SAVE, "error");
      } finally {
        setSuggestBusy(null);
      }
    },
    [activeBlock?.id, postPlay, atCapacity, addToast],
  );

  const startGuidedGame = useCallback(async () => {
    const sh = sheetQuery.data;
    if (!sh) return;
    const name = sh.name.trim();
    const scheme = sh.scheme?.trim() || "Multiple";
    const offBook = cfb26.trim();
    if (!name || !offBook) {
      addToast(COULDNT_SAVE, "error");
      return;
    }
    setStartGuidedBusy(true);
    try {
      const res = await fetch("/api/games", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          my_playbook: name,
          my_scheme: scheme,
          offensive_playbook: offBook,
          opponent_team: ONBOARDING_OPPONENT_TEAM,
          opponent_scheme: ONBOARDING_OPPONENT_SCHEME,
          game_date: new Date().toISOString().slice(0, 10),
          my_score: 0,
          opponent_score: 0,
          result: "W",
          play_sheet_id: sheetId,
          guided_onboarding_session: true,
        }),
      });
      const game = (await res.json()) as { id?: string };
      if (!game.id) {
        addToast(COULDNT_SAVE, "error");
        return;
      }
      setLastGame({ my_playbook: name, my_scheme: scheme });
      addToast(ONBOARDING_GAME_READY, "success");
      const scenarioParam = encodeURIComponent(activeScenario);
      router.push(`/film/${game.id}?guided=1&sheetScenario=${scenarioParam}`);
    } finally {
      setStartGuidedBusy(false);
    }
  }, [activeScenario, addToast, cfb26, router, setLastGame, sheetQuery.data, sheetId]);

  const navigateToSituation = useCallback(
    (scenario: string) => {
      router.push(`/playbook/${sheetId}?situation=${encodeURIComponent(scenario)}`);
    },
    [router, sheetId],
  );

  const navigateToDashboardBrowse = useCallback(() => {
    setBrowsePlaybookMode(true);
    setDrawerOpen(true);
  }, []);

  const closePlayBrowser = useCallback(() => {
    setDrawerOpen(false);
    setBrowsePlaybookMode(false);
    setPendingBrowsePick(null);
    setDrawerAddedKeys(new Set());
    setDrawerAddsThisSession(0);
  }, []);

  if (sheetQuery.isLoading) {
    return <PlaybookEditorSkeleton />;
  }

  if (sheetQuery.error || !sheet) {
    return (
      <div className="space-y-3">
        <p className="font-body text-red-300">{(sheetQuery.error as Error)?.message ?? "Play sheet not found"}</p>
        <BackNavLink href="/playbook" />
      </div>
    );
  }

  const saveSheetEdits = async () => {
    const trimmedName = editName.trim();
    const trimmedPlaybook = editPlaybook.trim();
    if (!trimmedName || !trimmedPlaybook) {
      addToast(COULDNT_SAVE, "error");
      return;
    }
    try {
      await updateSheet.mutateAsync({ name: trimmedName, cfb26_playbook: trimmedPlaybook });
      addToast("Play sheet saved.", "success");
      setEditorOpen(false);
    } catch (error) {
      addToast(COULDNT_SAVE, "error");
    }
  };

  const suggestions = scenarioPayload?.suggestions ?? [];
  const situationPlaysForSummary = scenarioPayload?.plays ?? sortedPlays;
  const usePlayBrowserPanel = drawerOpen && mdWorkspaceUp && useCallSheetBuilderLayout;
  const playBrowserPanelProps = usePlayBrowserPanel
    ? {
        open: true as const,
        onClose: closePlayBrowser,
        cfb26Playbook: cfb26,
        scenarioName: browsePlaybookMode ? "" : activeScenario,
        panelTitle: browsePlaybookMode ? BUILDER_BROWSE_PLAYBOOK : BUILDER_ADD_PLAY,
        panelSubtitle: browsePlaybookMode
          ? "Tap + to add to a situation"
          : `Adds to ${callSheetScenarioDisplayName(activeScenario)}`,
        onPick: onDrawerPick,
        showGoToStar,
        goToPlayKeys,
        goToBusyComboKey,
        onToggleGoTo: onBrowseToggleGoTo,
        addedPlayKeys: drawerDisplayedPlayKeys,
        addDisabled: !browsePlaybookMode && filled + drawerAddsThisSession >= maxSlots,
      }
    : null;

  const playSlotProps = {
    onAdd: openAdd,
    onRemove: (id: string) => {
      deletePlay
        .mutateAsync(id)
        .then(() => addToast("Removed from sheet.", "success"))
        .catch(() => addToast(COULDNT_SAVE, "error"));
    },
    dragId,
    setDragId,
    onReorder,
    onToggleGoTo: showGoToStar ? onToggleGoToFavorite : undefined,
    showGoToStar,
    goToBusy: goToBusyId !== null,
    stackFormation: useCallSheetPlayRows,
    hideRemove: isGoToSituation,
  } as const;

  const canTakeField =
    onboardingEditor && totalSheetPlays >= MIN_ONBOARDING_SHEET_PLAYS && !startGuidedBusy;
  const playsStillNeeded = Math.max(0, MIN_ONBOARDING_SHEET_PLAYS - totalSheetPlays);

  const renderScenarioPlaysSection = (workspace = false) => (
    <section className={cn("min-w-0", workspace ? "space-y-3" : "space-y-4")}>
      {!(useCallSheetBuilderLayout && isSituationEdit) ? (
        <h2 className="font-heading text-base font-bold uppercase tracking-wide text-slate-300">
          Calls for: <span className="text-white">{scenarioDisplayLabel(activeScenario)}</span>
        </h2>
      ) : null}

      {scenarioQuery.isError ? (
        <p className="font-body text-sm text-red-300">{(scenarioQuery.error as Error).message}</p>
      ) : scenarioQuery.isLoading ? (
        <div className="space-y-2" aria-busy="true">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex gap-3 rounded-xl border border-slate-700 bg-slate-900 p-4">
              <div className="h-10 w-10 shrink-0 animate-pulse rounded-md bg-slate-700/55" />
              <div className="min-w-0 flex-1 space-y-2 py-0.5">
                <div className="h-3 w-[75%] max-w-xs animate-pulse rounded-md bg-slate-700/55" />
                <div className="h-3 w-[50%] max-w-[180px] animate-pulse rounded-md bg-slate-700/55" />
              </div>
            </div>
          ))}
        </div>
      ) : filled === 0 ? (
        <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 text-center">
          <p className="font-body text-base font-medium text-white">
            {isGoToSituation ? GO_TO_PLAYS_EMPTY_HEADLINE : "No calls for this situation yet."}
          </p>
          <p className="mt-1 font-body text-sm text-slate-400">
            {isGoToSituation ? GO_TO_PLAYS_EMPTY_BODY : "Add calls to build your call sheet."}
          </p>
          <Button
            type="button"
            variant="default"
            className="mt-4 text-sm"
            disabled={atCapacity}
            onClick={openAdd}
          >
            {BUILDER_ADD_PLAY}
          </Button>
        </div>
      ) : (
        <>
          <div
            className={cn(
              "overflow-hidden border border-slate-800 bg-slate-950/60",
              workspace ? "rounded-xl [&>div>div]:md:min-h-12" : "rounded-lg",
            )}
          >
            <PlayTableHeader
              showGoToColumn={showGoToStar}
              stackFormation={useCallSheetPlayRows}
              hideRemoveColumn={isGoToSituation}
            />
            <div>
              {sortedPlays.map((play, slotIndex) => (
                <PlaySlot
                  key={play.id}
                  play={play}
                  slotIndex={slotIndex}
                  {...playSlotProps}
                  inGoTo={isGoToSituation || goToPlayKeys.has(sheetPlayComboKey(play.formation, play.play_name))}
                  goToBusy={goToBusyId === play.id}
                  atCapacity={atCapacity && !play}
                />
              ))}
              {filled < maxSlots ? (
                <div className={workspace ? "md:hidden" : undefined}>
                  <PlaySlot
                    key="slot-add-next"
                    play={null}
                    slotIndex={filled}
                    {...playSlotProps}
                    atCapacity={atCapacity}
                  />
                </div>
              ) : null}
            </div>
          </div>
          {workspace && !isGoToSituation && filled < maxSlots ? (
            <button
              type="button"
              className={appShellSituationAddPlayButtonClass}
              disabled={atCapacity}
              onClick={openAdd}
            >
              {BUILDER_ADD_PLAY}
            </button>
          ) : null}
        </>
      )}

      {!onboardingEditor && !isGoToSituation ? (
        <PlaySuggestions
          scenarioLabel={activeScenario}
          suggestions={suggestions}
          busyId={suggestBusy}
          onAdd={onSuggestAdd}
          scenarioFull={atCapacity}
        />
      ) : null}
    </section>
  );

  return (
    <div
      className={cn(
        onboardingEditor &&
          "flex min-h-[calc(100dvh-5.5rem-env(safe-area-inset-bottom,0px))] flex-col",
      )}
    >
      <div className={cn("space-y-6", onboardingEditor && "min-h-0 flex-1 overflow-y-auto pb-[calc(9.5rem+env(safe-area-inset-bottom,0px))]")}>
        {useCallSheetBuilderLayout && isSituationEdit ? (
          <>
            <div className="space-y-6 md:hidden">
              <CallSheetBuilderSituationHeader
                backHref={`/playbook/${sheetId}`}
                title={callSheetScenarioDisplayName(activeScenario)}
                scenario={activeScenario}
                description={activeBlock?.description}
                colorKey={activeBlock?.color}
                icon={activeBlock?.icon}
                playCountLabel={callSheetScenarioPlayCountLabel(filled)}
                plays={situationPlaysForSummary}
                showEdit={!isGoToSituation}
                onEdit={() => setEditSituationOpen(true)}
              />
              {renderScenarioPlaysSection(false)}
            </div>

            <CallSheetBuilderSituationWorkspace
              header={{
                backHref: `/playbook/${sheetId}`,
                title: callSheetScenarioDisplayName(activeScenario),
                scenario: activeScenario,
                description: activeBlock?.description,
                colorKey: activeBlock?.color,
                icon: activeBlock?.icon,
                playCountLabel: callSheetScenarioPlayCountLabel(filled),
                plays: situationPlaysForSummary,
                showEdit: !isGoToSituation,
                onEdit: () => setEditSituationOpen(true),
              }}
              browseActive={drawerOpen && browsePlaybookMode}
              onBrowsePlaybook={navigateToDashboardBrowse}
              browsePanel={playBrowserPanelProps}
            >
              {renderScenarioPlaysSection(true)}
            </CallSheetBuilderSituationWorkspace>
          </>
        ) : useCallSheetBuilderLayout ? (
          <>
            <CallSheetBuilderWorkspaceChrome
              backHref="/playbook"
              sheetName={sheet.name}
              cfb26Playbook={cfb26}
              scheme={sheet.scheme}
              catalogMeta={catalogMeta}
              situationCount={scenarios.length}
              playCount={totalSheetPlays}
              activeTab={editorTab}
              onTabChange={setEditorTab}
              onBrowsePlaybook={navigateToDashboardBrowse}
              onAddSituation={() => setCreateSituationOpen(true)}
              addSituationDisabled={scenarios.length >= MAX_SITUATIONS_PER_SHEET || situationsEditMode}
              browseActive={drawerOpen && browsePlaybookMode}
              browsePanel={playBrowserPanelProps}
            >
              {editorTab === "situations" ? (
                <CallSheetBuilderDashboard
                  layout="desktop"
                  scenarios={dashboardScenarios}
                  onBrowsePlaybook={navigateToDashboardBrowse}
                  onSelectSituation={navigateToSituation}
                  editMode={situationsEditMode}
                  onToggleEditMode={() => void toggleSituationsEditMode()}
                  onAddSituation={() => setCreateSituationOpen(true)}
                  dragId={situationDragId}
                  setDragId={setSituationDragId}
                  onReorderSituations={onReorderSituations}
                  onDeleteSituation={(block) => setDeleteSituationTarget(block)}
                />
              ) : (
                <CallSheetCoachView scenarios={scenarios} />
              )}
            </CallSheetBuilderWorkspaceChrome>

            <div className="space-y-6 md:hidden">
              <CallSheetBuilderSheetHeader
                backHref="/playbook"
                sheetName={sheet.name}
                cfb26Playbook={cfb26}
                scheme={sheet.scheme}
                catalogMeta={catalogMeta}
              />
              <CallSheetEditorTabBar activeTab={editorTab} onTabChange={setEditorTab} className="w-full" />
              {editorTab === "situations" ? (
                <CallSheetBuilderDashboard
                  scenarios={dashboardScenarios}
                  onBrowsePlaybook={navigateToDashboardBrowse}
                  onSelectSituation={navigateToSituation}
                  editMode={situationsEditMode}
                  onToggleEditMode={() => void toggleSituationsEditMode()}
                  onAddSituation={() => setCreateSituationOpen(true)}
                  dragId={situationDragId}
                  setDragId={setSituationDragId}
                  onReorderSituations={onReorderSituations}
                  onDeleteSituation={(block) => setDeleteSituationTarget(block)}
                />
              ) : (
                <CallSheetCoachView scenarios={scenarios} />
              )}
            </div>
          </>
        ) : (
          <>
            {!onboardingEditor ? (
              <div className="space-y-3">
                <Breadcrumb segments={[{ label: "Play Sheet", href: "/playbook" }, { label: sheet.name }]} />
                <BackNavLink href="/playbook" />
              </div>
            ) : null}

            <div>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h1 className={`${appShellPageTitleClass} mt-0 min-w-0`}>{sheet.name}</h1>
                  {catalogMeta ? (
                    <CallSheetMetadataRow
                      labels={callSheetDetailsMetadataLabels(catalogMeta, sheet.scheme, cfb26)}
                      className="mt-1 font-body text-sm text-slate-400"
                    />
                  ) : (
                    <p className="mt-1 truncate font-body text-sm text-slate-400">Built from {cfb26} playbook</p>
                  )}
                </div>
                {!onboardingEditor ? (
                  <button
                    type="button"
                    className={appShellHeaderActionButtonClass}
                    onClick={() => {
                      setEditName(sheet.name);
                      setEditPlaybook(cfb26);
                      setEditorOpen(true);
                    }}
                  >
                    Edit
                  </button>
                ) : null}
              </div>
            </div>

            {!onboardingEditor ? (
              <SituationList
                scenarios={scenarios}
                activeScenario={activeScenario}
                onSelect={setLegacyActiveScenario}
                variant="mobile"
              />
            ) : null}

            <div className={cn("grid min-h-[50vh] gap-6", !onboardingEditor && "lg:grid-cols-[220px_1fr]")}>
              {!onboardingEditor ? (
                <aside className="hidden lg:block">
                  <p className="mb-1 font-sans text-xs font-normal uppercase tracking-widest text-slate-500">Situations</p>
                  <SituationList
                    scenarios={scenarios}
                    activeScenario={activeScenario}
                    onSelect={setLegacyActiveScenario}
                    variant="desktop"
                  />
                </aside>
              ) : null}

              {renderScenarioPlaysSection(false)}
            </div>
          </>
        )}
      </div>

      <AddPlayDrawer
        open={drawerOpen && !usePlayBrowserPanel}
        onClose={closePlayBrowser}
        cfb26Playbook={cfb26}
        scenarioName={browsePlaybookMode ? "" : activeScenario}
        onPick={onDrawerPick}
        addedPlayKeys={drawerDisplayedPlayKeys}
        addDisabled={!browsePlaybookMode && filled + drawerAddsThisSession >= maxSlots}
        showGoToStar={showGoToStar}
        goToPlayKeys={goToPlayKeys}
        goToBusyComboKey={goToBusyComboKey}
        onToggleGoTo={onBrowseToggleGoTo}
      />
      <Dialog
        open={Boolean(pendingBrowsePick)}
        onOpenChange={(next) => {
          if (!next && !browseSituationBusy) setPendingBrowsePick(null);
        }}
      >
        <DialogContent
          className={responsiveOverlayDialogContentClass("lg")}
          onPointerDownOutside={(e) => {
            if (browseSituationBusy) e.preventDefault();
          }}
          onEscapeKeyDown={(e) => {
            if (browseSituationBusy) e.preventDefault();
          }}
        >
          <DialogHeader className="space-y-0 border-b border-slate-800 px-4 py-3 text-left sm:text-left">
            <DialogTitle className="font-heading text-lg font-bold uppercase tracking-[0.12em] text-slate-100 pr-10 text-left">
              {BUILDER_BROWSE_SITUATION_PROMPT}
            </DialogTitle>
            {pendingBrowsePick ? (
              <DialogDescription className="mt-3 text-left font-body text-sm text-slate-400">
                Choose a situation for{" "}
                <span className="font-medium text-white">
                  {normalizePlayName(pendingBrowsePick.play_name)}
                </span>
                .
              </DialogDescription>
            ) : null}
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
            <CallSheetSituationGrid
              scenarios={scenarios}
              onSelect={(scenario) => {
                void onBrowseSituationPick(scenario);
              }}
            />
          </div>
          <div className={modalCtaFooterClass}>
            <Button
              type="button"
              variant="secondary"
              className="flex-1 py-3"
              disabled={browseSituationBusy}
              onClick={() => setPendingBrowsePick(null)}
            >
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      {editorOpen ? (
        <div
          className={cn("fixed inset-0 bg-black/70", overlayZ.radixDialog)}
          onClick={() => setEditorOpen(false)}
        >
          <div
            className={cn(responsiveOverlayBottomShellPositionClass("md"), overlayZ.sheetShell)}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex h-full max-h-[90vh] min-h-0 w-full flex-col overflow-hidden rounded-t-xl rounded-b-none border border-slate-700 bg-slate-900 md:max-h-[90vh] md:rounded-xl">
              <div className="flex shrink-0 items-center justify-between border-b border-slate-800 px-4 py-3">
                <h2 className="font-heading text-lg font-bold uppercase tracking-[0.1em] text-slate-100">Edit play sheet</h2>
                <button type="button" data-no-press className="p-2 -mr-2 text-slate-400 hover:text-white" onClick={() => setEditorOpen(false)}>
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
                    <path d="M6 6 18 18M18 6 6 18" />
                  </svg>
                  <span className="sr-only">Close</span>
                </button>
              </div>
              <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4 sm:px-6">
                <label className="space-y-1">
                  <span className="mb-1 font-sans text-xs font-normal uppercase tracking-widest text-slate-500">Play sheet name</span>
                  <input value={editName} onChange={(e) => setEditName(e.target.value)} className="block w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5 font-body text-sm text-slate-100 placeholder:text-slate-500 focus:border-emerald-600/60 focus:outline-none focus:ring-2 focus:ring-emerald-500/25" />
                </label>
                <label className="space-y-1">
                  <span className="mb-1 font-sans text-xs font-normal uppercase tracking-widest text-slate-500">Select CFB26 Playbook</span>
                  <input list="cfb26-playbook-options" value={editPlaybook} onChange={(e) => setEditPlaybook(e.target.value)} className="block w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5 font-body text-sm text-slate-100 placeholder:text-slate-500 focus:border-emerald-600/60 focus:outline-none focus:ring-2 focus:ring-emerald-500/25" />
                  <datalist id="cfb26-playbook-options">
                    {cfb26PlaybookOptions.map((opt) => (
                      <option key={opt} value={opt} />
                    ))}
                  </datalist>
                </label>
              </div>
              <div className={modalCtaFooterClass}>
                <Button type="button" variant="secondary" className="flex-1" onClick={() => setEditorOpen(false)}>
                  Cancel
                </Button>
                <Button type="button" variant="default" className="flex-1" onClick={() => void saveSheetEdits()}>
                  Save
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
      <Dialog
        open={Boolean(replaceSuggest)}
        onOpenChange={(next) => {
          if (!next && !swapPlay.isPending) setReplaceSuggest(null);
        }}
      >
        <DialogContent
          className={responsiveOverlayDialogContentClass("md")}
          onPointerDownOutside={(e) => {
            if (swapPlay.isPending) e.preventDefault();
          }}
          onEscapeKeyDown={(e) => {
            if (swapPlay.isPending) e.preventDefault();
          }}
        >
          <DialogHeader className="space-y-0 border-b border-slate-800 px-4 py-3 text-left sm:text-left">
            <DialogTitle className="font-heading text-xl font-bold uppercase tracking-[0.12em] text-slate-100 pr-10 text-left text-lg">Replace a play</DialogTitle>
            {replaceSuggest ? (
              <DialogDescription className="mt-3 text-left font-body text-sm text-slate-400">
                This situation is full. Choose a play to replace with{" "}
                <span className="font-medium text-white">{normalizePlayName(replaceSuggest.play_name)}</span>.
              </DialogDescription>
            ) : null}
          </DialogHeader>
          {replaceSuggest ? (
            <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-2 pt-1">
              <ul className="space-y-2">
                {sortedPlays.map((play) => (
                  <li key={play.id}>
                    <button
                      type="button"
                      disabled={swapPlay.isPending}
                      className="flex w-full items-center justify-between rounded-lg border border-slate-700 px-3 py-2.5 text-start transition-colors hover:border-emerald-600/50 hover:bg-emerald-500/10 disabled:opacity-50"
                      onClick={async () => {
                        try {
                          await swapPlay.mutateAsync({
                            playId: play.id,
                            formation: replaceSuggest.formation,
                            play_name: replaceSuggest.play_name,
                          });
                          addToast("Replaced on sheet.", "success");
                          setReplaceSuggest(null);
                          setSuggestBusy(null);
                        } catch (e) {
                          const msg = e instanceof Error && e.message.includes("already exists")
                            ? e.message
                            : COULDNT_SAVE;
                          addToast(msg, "error");
                        }
                      }}
                    >
                      <div className="min-w-0">
                        <p className="font-mono text-xs font-medium uppercase text-white">{normalizePlayName(play.play_name)}</p>
                        <p className="mt-0.5 font-mono text-[11px] text-slate-500">{play.formation}</p>
                      </div>
                      <span className="shrink-0 font-sans text-xs text-slate-500">Replace</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          <div className={modalCtaFooterClass}>
            <Button type="button" variant="secondary" className="flex-1 py-3" disabled={swapPlay.isPending} onClick={() => setReplaceSuggest(null)}>
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <SituationFormModal
        open={createSituationOpen}
        mode="create"
        presentation="responsive"
        initialValues={{
          name: "",
          description: "",
          icon: null,
          color: defaultColorForNewSituation(usedSituationColors),
        }}
        usedColors={usedSituationColors}
        busy={situationFormBusy}
        onClose={() => setCreateSituationOpen(false)}
        onSubmit={onCreateSituation}
      />

      {activeBlock && !isGoToSituation ? (
        <SituationFormModal
          open={editSituationOpen}
          mode="edit"
          presentation="page"
          initialValues={{
            name: activeBlock.scenario,
            description: activeBlock.description ?? callSheetScenarioHelperText(activeBlock.scenario),
            icon: activeBlock.icon ?? null,
            color: activeBlock.color ?? "blue",
          }}
          usedColors={usedSituationColors.filter((c) => c !== (activeBlock.color ?? "blue"))}
          busy={situationFormBusy}
          onClose={() => setEditSituationOpen(false)}
          onSubmit={onUpdateSituation}
          onDelete={() => setDeleteSituationTarget(activeBlock)}
        />
      ) : null}

      <ConfirmDestructiveModal
        open={Boolean(deleteSituationTarget)}
        onClose={() => {
          if (!situationFormBusy) setDeleteSituationTarget(null);
        }}
        title={
          deleteSituationTarget
            ? BUILDER_DELETE_SITUATION_TITLE(callSheetScenarioDisplayName(deleteSituationTarget.scenario))
            : ""
        }
        message={deleteSituationTarget ? BUILDER_DELETE_SITUATION_BODY : null}
        busy={situationFormBusy}
        onConfirm={() => void confirmDeleteSituation()}
      />

      {onboardingEditor ? (
        <footer className="fixed bottom-0 left-0 right-0 z-30 border-t border-slate-800 bg-slate-950/95 px-4 pt-3 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] backdrop-blur-sm">
          <p className="font-body text-sm font-medium text-slate-100">
            Add {MIN_ONBOARDING_SHEET_PLAYS} calls to take the field.
          </p>
          <p className="mt-0.5 font-body text-sm text-slate-400">
            {playsStillNeeded > 0
              ? `${playsStillNeeded} more needed.`
              : "You're ready when you are."}
          </p>
          <Button
            type="button"
            variant="default"
            className="mt-3 w-full text-sm"
            disabled={!canTakeField}
            onClick={() => void startGuidedGame()}
          >
            {startGuidedBusy ? "Starting…" : ONBOARDING_START_LOGS}
          </Button>
        </footer>
      ) : null}
    </div>
  );
}
