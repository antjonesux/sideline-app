"use client";

import { ResponsiveOverlay } from "@/components/shared/ResponsiveOverlay";
import {
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useSchemeList } from "@/hooks/useSchemeList";
import {
  ADD_TO_SCHEME_ALREADY_ADDED,
  ADD_TO_SCHEME_EMPTY_BODY,
  ADD_TO_SCHEME_EMPTY_CTA,
  ADD_TO_SCHEME_EMPTY_HEADLINE,
  ADD_TO_SCHEME_MODAL_BODY,
  ADD_TO_SCHEME_MODAL_TITLE,
  ADD_TO_SCHEME_REPLACE_CONFIRM,
  ADD_TO_SCHEME_REPLACE_SUCCESS,
  ADD_TO_SCHEME_REPLACE_TITLE,
  ADD_TO_SCHEME_SUCCESS,
  COULDNT_LOAD,
  COULDNT_SAVE,
  SCHEME_CARD_DEFENSE_LABEL,
  SCHEME_CARD_OFFENSE_LABEL,
  addToSchemeReplaceMessage,
} from "@/lib/coachCopy";
import { CATALOG_SIDE_OF_BALL_LABELS, type CatalogSideOfBall } from "@/lib/constants";
import { modalCtaFooterClass } from "@/lib/constants/designTokens";
import { schemeDetailQueryKey } from "@/lib/schemeDetailQuery";
import { schemeListQueryKey } from "@/lib/schemeListQuery";
import type { PlaybookSummary, SchemeSummary } from "@/lib/types";
import { useToastStore } from "@/store/toastStore";
import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";

type PendingReplace = {
  scheme: SchemeSummary;
  existingName: string;
};

function schemeSideSlot(scheme: SchemeSummary, side: CatalogSideOfBall) {
  if (side === "offense") {
    return {
      id: scheme.offense_call_sheet_id,
      name: scheme.offense_call_sheet_name,
    };
  }
  return {
    id: scheme.defense_call_sheet_id,
    name: scheme.defense_call_sheet_name,
  };
}

function isSheetAlreadyInScheme(scheme: SchemeSummary, callSheetId: string) {
  return scheme.offense_call_sheet_id === callSheetId || scheme.defense_call_sheet_id === callSheetId;
}

async function attachCallSheetToScheme(
  schemeId: string,
  callSheetId: string,
  sideOfBall: CatalogSideOfBall,
  replace: boolean,
) {
  const res = await fetch(`/api/schemes/${schemeId}/call-sheets`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      call_sheet_id: callSheetId,
      side_of_ball: sideOfBall,
      replace,
    }),
  });
  const j = (await res.json()) as { error?: string };
  if (!res.ok) {
    throw new Error(typeof j.error === "string" ? j.error : COULDNT_SAVE);
  }
}

export function AddToSchemeModal({
  open,
  onClose,
  callSheet,
  sideOfBall,
}: {
  open: boolean;
  onClose: () => void;
  callSheet: PlaybookSummary;
  sideOfBall: CatalogSideOfBall;
}) {
  const { data: schemes, isLoading, error } = useSchemeList();
  const queryClient = useQueryClient();
  const addToast = useToastStore((s) => s.addToast);
  const [busy, setBusy] = useState(false);
  const [pendingReplace, setPendingReplace] = useState<PendingReplace | null>(null);

  const sideLabel = CATALOG_SIDE_OF_BALL_LABELS[sideOfBall];
  const list = schemes ?? [];

  function handleClose() {
    if (busy) return;
    setPendingReplace(null);
    onClose();
  }

  async function completeAttach(scheme: SchemeSummary, replace: boolean) {
    setBusy(true);
    try {
      await attachCallSheetToScheme(scheme.id, callSheet.id, sideOfBall, replace);
      await queryClient.invalidateQueries({ queryKey: schemeListQueryKey });
      await queryClient.invalidateQueries({ queryKey: schemeDetailQueryKey(scheme.id) });
      addToast(replace ? ADD_TO_SCHEME_REPLACE_SUCCESS : ADD_TO_SCHEME_SUCCESS, "success");
      setPendingReplace(null);
      onClose();
    } catch (err) {
      addToast(err instanceof Error ? err.message : COULDNT_SAVE, "error");
    } finally {
      setBusy(false);
    }
  }

  function handleSchemeSelect(scheme: SchemeSummary) {
    if (isSheetAlreadyInScheme(scheme, callSheet.id)) return;

    const slot = schemeSideSlot(scheme, sideOfBall);
    if (slot.id && slot.id !== callSheet.id) {
      setPendingReplace({
        scheme,
        existingName: slot.name ?? "another call sheet",
      });
      return;
    }

    void completeAttach(scheme, false);
  }

  const schemeListBody = (
    <>
      {isLoading ? (
        <p className="font-body text-sm text-slate-500">Loading schemes…</p>
      ) : null}
      {error ? (
        <p className="font-body text-sm text-red-200" role="alert">
          {COULDNT_LOAD}
        </p>
      ) : null}
      {!isLoading && !error && list.length === 0 ? (
        <div className="rounded-lg border border-slate-800 bg-slate-950/60 px-4 py-6 text-center">
          <p className="font-sans text-sm font-medium text-white">{ADD_TO_SCHEME_EMPTY_HEADLINE}</p>
          <p className="mt-2 font-body text-sm text-slate-500">{ADD_TO_SCHEME_EMPTY_BODY}</p>
          <Button asChild className="mt-4 w-full sm:w-auto">
            <Link href="/schemes/new" onClick={() => handleClose()}>
              {ADD_TO_SCHEME_EMPTY_CTA}
            </Link>
          </Button>
        </div>
      ) : null}
      {!isLoading && !error && list.length > 0 ? (
        <ul className="divide-y divide-slate-800 rounded-xl border border-slate-800" role="listbox" aria-label="Schemes">
          {list.map((scheme) => {
            const added = isSheetAlreadyInScheme(scheme, callSheet.id);
            const slot = schemeSideSlot(scheme, sideOfBall);
            const occupied = Boolean(slot.id && slot.id !== callSheet.id);
            const meta =
              sideOfBall === "offense"
                ? scheme.offense_call_sheet_name
                  ? `${SCHEME_CARD_OFFENSE_LABEL}: ${scheme.offense_call_sheet_name}`
                  : null
                : scheme.defense_call_sheet_name
                  ? `${SCHEME_CARD_DEFENSE_LABEL}: ${scheme.defense_call_sheet_name}`
                  : null;

            return (
              <li key={scheme.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={added}
                  disabled={busy || added}
                  className="flex min-h-14 w-full flex-col items-start gap-1 px-4 py-3.5 text-start transition-colors enabled:hover:bg-slate-800/60 disabled:cursor-default disabled:opacity-60"
                  onClick={() => handleSchemeSelect(scheme)}
                >
                  <span className="flex w-full min-w-0 items-center justify-between gap-2">
                    <span className="min-w-0 truncate font-sans text-sm font-medium text-slate-200">{scheme.name}</span>
                    {added ? (
                      <span className="shrink-0 font-body text-xs text-emerald-400">{ADD_TO_SCHEME_ALREADY_ADDED}</span>
                    ) : occupied ? (
                      <span className="shrink-0 font-body text-xs text-slate-500">Replace</span>
                    ) : null}
                  </span>
                  {scheme.description ? (
                    <span className="line-clamp-1 font-body text-xs text-slate-500">{scheme.description}</span>
                  ) : null}
                  {meta ? <span className="font-body text-xs text-slate-600">{meta}</span> : null}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </>
  );

  return (
    <>
      <ResponsiveOverlay open={open && !pendingReplace} onClose={handleClose} busy={busy} maxWidth="md">
        <DialogHeader className="space-y-0 border-b border-slate-800 px-4 py-4 text-left md:px-6">
          <DialogTitle className="pr-10 text-left font-heading text-lg font-bold uppercase tracking-[0.1em] text-slate-100">
            {ADD_TO_SCHEME_MODAL_TITLE}
          </DialogTitle>
          <DialogDescription className="mt-1 text-left font-body text-sm text-slate-400">
            {ADD_TO_SCHEME_MODAL_BODY}
          </DialogDescription>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 md:px-6">
          <p className="mb-4 font-body text-sm text-slate-400">
            <span className="text-slate-300">{callSheet.name}</span>
            <span className="text-slate-600"> · </span>
            {sideLabel}
          </p>
          {schemeListBody}
        </div>
        <div className={modalCtaFooterClass}>
          <Button type="button" variant="secondary" className="flex-1 py-3" disabled={busy} onClick={handleClose}>
            Cancel
          </Button>
        </div>
      </ResponsiveOverlay>

      <ResponsiveOverlay
        open={Boolean(pendingReplace)}
        onClose={() => {
          if (!busy) setPendingReplace(null);
        }}
        busy={busy}
        maxWidth="md"
      >
        <DialogHeader className="space-y-0 border-b border-slate-800 px-4 py-3 text-left md:px-6">
          <DialogTitle className="pr-10 text-left font-heading text-lg font-bold uppercase tracking-[0.1em] text-slate-100">
            {ADD_TO_SCHEME_REPLACE_TITLE}
          </DialogTitle>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 md:px-6">
          <DialogDescription asChild>
            <p className="font-body text-sm leading-relaxed text-slate-300">
              {pendingReplace
                ? addToSchemeReplaceMessage(sideLabel, pendingReplace.existingName, callSheet.name)
                : null}
            </p>
          </DialogDescription>
        </div>
        <div className={modalCtaFooterClass}>
          <Button
            type="button"
            variant="secondary"
            className="flex-1 py-3"
            disabled={busy}
            onClick={() => setPendingReplace(null)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="default"
            className="flex-1 py-3"
            disabled={busy || !pendingReplace}
            onClick={() => {
              if (pendingReplace) void completeAttach(pendingReplace.scheme, true);
            }}
          >
            {busy ? "Working…" : ADD_TO_SCHEME_REPLACE_CONFIRM}
          </Button>
        </div>
      </ResponsiveOverlay>
    </>
  );
}
