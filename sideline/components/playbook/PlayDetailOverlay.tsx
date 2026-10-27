"use client";

import { PlayArtImage } from "@/components/playbook/PlayArtImage";
import { PlaySetupEditor } from "@/components/playbook/PlaySetupEditor";
import { ConfirmDestructiveModal } from "@/components/shared/ConfirmDestructiveModal";
import { PlaySheetSituationChipScroll } from "@/components/shared/PlaySheetSituationChipScroll";
import { SituationSideRailOverlay } from "@/components/shared/SituationSideRailOverlay";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { usePlaySetupMutations, usePlaySetups } from "@/hooks/usePlaySetups";
import {
  COULDNT_FINISH_THAT,
  PLAY_SETUP_ADD,
  PLAY_SETUP_DELETE_CONFIRM_BODY,
  PLAY_SETUP_DELETE_CONFIRM_TITLE,
  PLAY_SETUP_DELETE_MENU,
  PLAY_SETUP_DELETED,
  PLAY_SETUP_EDIT_MENU,
  PLAY_SETUP_EMPTY_BODY,
  PLAY_SETUP_EMPTY_TITLE,
  PLAY_SETUP_LOAD_FAILED,
  PLAY_SETUP_MOVE_LEFT,
  PLAY_SETUP_MOVE_RIGHT,
  PLAY_SETUP_SECTION_LABEL,
  PLAY_SETUP_YOUR_IMAGE_LABEL,
} from "@/lib/coachCopy";
import { PLAY_SETUP_MAX_PER_PLAY } from "@/lib/playSetupKey";
import { deriveFormationGroup } from "@/lib/playbook";
import { resolvePlayArtUrl } from "@/lib/playArtUrl";
import type { PlayIdentity, PlaySetup } from "@/lib/types";
import { useMdUp } from "@/lib/useMdUp";
import { cn, normalizePlayName } from "@/lib/utils";
import { useToastStore } from "@/store/toastStore";
import { useEffect, useMemo, useState } from "react";

const menuItemClass =
  "cursor-pointer rounded-md px-2 py-2 font-body text-sm text-slate-200 focus:bg-slate-800 focus:text-white";

function SetupSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true">
      <div className="flex gap-2 overflow-hidden">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-8 w-24 shrink-0 animate-pulse rounded-full bg-slate-800" />
        ))}
      </div>
      <div className="space-y-3 rounded-xl border border-slate-700 bg-slate-950/50 p-4">
        <div className="h-5 w-1/2 animate-pulse rounded-md bg-slate-800" />
        <div className="h-3 w-full animate-pulse rounded-md bg-slate-800" />
        <div className="h-3 w-4/5 animate-pulse rounded-md bg-slate-800" />
        <div className="h-3 w-3/5 animate-pulse rounded-md bg-slate-800" />
      </div>
    </div>
  );
}

export function PlayDetailOverlay({
  open,
  onClose,
  identity,
  /** `panel` embeds in `SituationSideRail` without modal chrome (desktop builder). */
  shell = "modal",
}: {
  open: boolean;
  onClose: () => void;
  identity: PlayIdentity;
  shell?: "modal" | "panel";
}) {
  const addToast = useToastStore((s) => s.addToast);
  const mdUp = useMdUp();
  const { data: setups = [], isLoading, isError, isFetching } = usePlaySetups(open ? identity : null);
  const { reorderSetups, deleteSetup } = usePlaySetupMutations();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingSetup, setEditingSetup] = useState<PlaySetup | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PlaySetup | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [reorderBusy, setReorderBusy] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const sorted = useMemo(
    () => [...setups].sort((a, b) => a.sort_order - b.sort_order),
    [setups],
  );

  useEffect(() => {
    if (!open) {
      setSelectedId(null);
      setEditorOpen(false);
      setEditingSetup(null);
      setDeleteTarget(null);
      setMenuOpen(false);
      return;
    }
    if (sorted.length === 0) {
      setSelectedId(null);
      return;
    }
    setSelectedId((prev) => {
      if (prev && sorted.some((s) => s.id === prev)) return prev;
      return sorted[0]?.id ?? null;
    });
  }, [open, sorted]);

  const selected = sorted.find((s) => s.id === selectedId) ?? null;
  const selectedIndex = selected ? sorted.findIndex((s) => s.id === selected.id) : -1;
  const atCap = sorted.length >= PLAY_SETUP_MAX_PER_PLAY;

  const playArt = useMemo(
    () =>
      resolvePlayArtUrl({
        playbook: identity.playbook,
        formation: identity.formation,
        formationType: deriveFormationGroup(identity.formation),
        playName: identity.play_name,
        gameVersion: identity.game_version,
        side: identity.side_of_ball,
      }),
    [identity],
  );

  function openCreate() {
    setEditingSetup(null);
    setEditorOpen(true);
  }

  function openEdit(setup: PlaySetup) {
    setMenuOpen(false);
    setEditingSetup(setup);
    setEditorOpen(true);
  }

  async function moveSetup(direction: -1 | 1) {
    if (!selected || selectedIndex < 0) return;
    const nextIndex = selectedIndex + direction;
    if (nextIndex < 0 || nextIndex >= sorted.length) return;
    const ordered = sorted.map((s) => s.id);
    const tmp = ordered[selectedIndex]!;
    ordered[selectedIndex] = ordered[nextIndex]!;
    ordered[nextIndex] = tmp;
    setReorderBusy(true);
    setMenuOpen(false);
    try {
      await reorderSetups.mutateAsync({ ...identity, ordered_ids: ordered });
    } catch (err) {
      addToast(err instanceof Error ? err.message : COULDNT_FINISH_THAT, "error");
    } finally {
      setReorderBusy(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    const deletedId = deleteTarget.id;
    const idx = sorted.findIndex((s) => s.id === deletedId);
    setDeleteBusy(true);
    try {
      await deleteSetup.mutateAsync({ id: deletedId, identity });
      addToast(PLAY_SETUP_DELETED, "success");
      const remaining = sorted.filter((s) => s.id !== deletedId);
      if (remaining.length === 0) setSelectedId(null);
      else if (idx <= 0) setSelectedId(remaining[0]?.id ?? null);
      else setSelectedId(remaining[idx - 1]?.id ?? remaining[0]?.id ?? null);
      setDeleteTarget(null);
      setEditorOpen(false);
      setEditingSetup(null);
    } catch {
      /* mutation toasts */
    } finally {
      setDeleteBusy(false);
    }
  }

  const chipEdgeToEdge = shell === "modal" && !mdUp;
  const playTitle = normalizePlayName(identity.play_name);
  const playSubtitle = `${identity.formation} · ${identity.playbook}`;

  const body = (
    <div className={cn("w-full space-y-5 px-4 py-4", shell === "panel" && "px-5")}>
      <PlayArtImage
        src={playArt?.src ?? null}
        source={playArt?.source}
        alt={`${playTitle} play art`}
      />

      <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <p className="font-mono text-[10px] uppercase tracking-wider text-slate-500">
              {PLAY_SETUP_SECTION_LABEL} {sorted.length}
            </p>
            {!atCap && sorted.length > 0 ? (
              <button
                type="button"
                onClick={openCreate}
                className="rounded-lg border border-emerald-600/50 px-3 py-1.5 font-sans text-xs font-medium text-emerald-400 transition-colors hover:border-emerald-500 hover:text-emerald-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500"
              >
                {PLAY_SETUP_ADD}
              </button>
            ) : null}
          </div>

          {isLoading || (isFetching && sorted.length === 0 && !isError) ? <SetupSkeleton /> : null}

          {isError ? (
            <p className="font-body text-sm text-red-300" role="alert">
              {PLAY_SETUP_LOAD_FAILED}
            </p>
          ) : null}

          {!isLoading && !isError && sorted.length === 0 ? (
            <div className="flex flex-col items-center px-2 py-8 text-center">
              <p className="font-heading text-base font-bold uppercase tracking-wide text-slate-100">
                {PLAY_SETUP_EMPTY_TITLE}
              </p>
              <p className="mt-2 max-w-sm font-body text-sm text-slate-400">{PLAY_SETUP_EMPTY_BODY}</p>
              <Button type="button" className="mt-5" onClick={openCreate}>
                {PLAY_SETUP_ADD}
              </Button>
            </div>
          ) : null}

          {!isError && sorted.length > 0 ? (
            <>
              <PlaySheetSituationChipScroll
                items={sorted.map((s) => ({ id: s.id, label: s.title }))}
                selectedItemId={selected?.id ?? sorted[0]!.id}
                onSelectItem={setSelectedId}
                navAriaLabel="Setups"
                edgeToEdge={chipEdgeToEdge}
              />

              {selected ? (
                <div className="relative rounded-xl border border-slate-700 bg-slate-950/60 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="min-w-0 pr-2 font-heading text-base font-bold uppercase tracking-wide text-white">
                      {selected.title}
                    </h3>
                    <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen} modal={false}>
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-white/[0.05] hover:text-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500"
                          aria-label="Setup actions"
                          disabled={reorderBusy}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                            <circle cx="12" cy="5" r="1.75" />
                            <circle cx="12" cy="12" r="1.75" />
                            <circle cx="12" cy="19" r="1.75" />
                          </svg>
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        side="bottom"
                        align="end"
                        className="min-w-[11rem] border-slate-700 bg-slate-950 p-1 text-slate-200 shadow-lg"
                      >
                        <DropdownMenuItem className={menuItemClass} onSelect={() => openEdit(selected)}>
                          {PLAY_SETUP_EDIT_MENU}
                        </DropdownMenuItem>
                        {sorted.length > 1 ? (
                          <>
                            <DropdownMenuItem
                              className={cn(menuItemClass, selectedIndex === 0 && "opacity-40")}
                              disabled={selectedIndex === 0 || reorderBusy}
                              onSelect={() => void moveSetup(-1)}
                            >
                              {PLAY_SETUP_MOVE_LEFT}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className={cn(
                                menuItemClass,
                                selectedIndex === sorted.length - 1 && "opacity-40",
                              )}
                              disabled={selectedIndex === sorted.length - 1 || reorderBusy}
                              onSelect={() => void moveSetup(1)}
                            >
                              {PLAY_SETUP_MOVE_RIGHT}
                            </DropdownMenuItem>
                          </>
                        ) : null}
                        <DropdownMenuItem
                          className={`${menuItemClass} text-red-300`}
                          onSelect={() => {
                            setMenuOpen(false);
                            setDeleteTarget(selected);
                          }}
                        >
                          {PLAY_SETUP_DELETE_MENU}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {selected.notes.trim() ? (
                    <p className="mt-3 whitespace-pre-wrap font-body text-sm leading-relaxed text-slate-300">
                      {selected.notes}
                    </p>
                  ) : null}

                  {selected.image_url ? (
                    <div className="mt-4 overflow-hidden rounded-lg border border-slate-700 bg-slate-900">
                      <div className="border-b border-slate-800 px-3 py-2">
                        <p className="font-mono text-[10px] uppercase tracking-wider text-slate-500">
                          {PLAY_SETUP_YOUR_IMAGE_LABEL}
                        </p>
                      </div>
                      {/* eslint-disable-next-line @next/next/no-img-element -- signed private setup URL */}
                      <img
                        src={selected.image_url}
                        alt=""
                        className="max-h-56 w-full object-contain"
                      />
                    </div>
                  ) : null}
                </div>
              ) : null}
            </>
          ) : null}
      </div>
    </div>
  );

  const nested = (
    <>
      <PlaySetupEditor
        open={editorOpen}
        onClose={() => {
          setEditorOpen(false);
          setEditingSetup(null);
        }}
        identity={identity}
        setup={editingSetup}
        onSaved={(saved, wasCreate) => {
          if (wasCreate) setSelectedId(saved.id);
        }}
        onDeleted={(id) => {
          const idx = sorted.findIndex((s) => s.id === id);
          const remaining = sorted.filter((s) => s.id !== id);
          if (remaining.length === 0) setSelectedId(null);
          else if (idx <= 0) setSelectedId(remaining[0]?.id ?? null);
          else setSelectedId(remaining[idx - 1]?.id ?? remaining[0]?.id ?? null);
        }}
      />

      <ConfirmDestructiveModal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title={PLAY_SETUP_DELETE_CONFIRM_TITLE}
        message={PLAY_SETUP_DELETE_CONFIRM_BODY}
        confirmLabel="Delete"
        busy={deleteBusy}
        onConfirm={confirmDelete}
      />
    </>
  );

  if (!open && shell === "panel") return null;

  if (shell === "panel") {
    return (
      <>
        {body}
        {nested}
      </>
    );
  }

  return (
    <>
      <SituationSideRailOverlay
        open={open}
        onClose={onClose}
        backAriaLabel="Back"
        title={playTitle}
        subtitle={playSubtitle}
        innerClassName="rounded-none border-0"
        contentClassName="border-0"
      >
        {body}
      </SituationSideRailOverlay>
      {nested}
    </>
  );
}
