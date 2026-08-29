"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { usePlaybookList } from "@/hooks/usePlaybookList";
import { useSchemeList } from "@/hooks/useSchemeList";
import {
  ADD_PLAY_NO_MATCHING_SHEETS,
  COULDNT_FINISH_THAT,
  COULDNT_LOAD,
} from "@/lib/coachCopy";
import {
  modalCompactFooterClass,
  responsiveOverlayCenteredDialogClass,
} from "@/lib/constants/designTokens";
import { catalogPlaybookNamesMatch } from "@/lib/playbookUtils";
import { useToastStore } from "@/store/toastStore";
import { cn } from "@/lib/utils";
import { ChevronLeft } from "lucide-react";

type SheetScenario = {
  id: string;
  scenario: string;
  play_count?: number;
};

type AddPlayToSheetModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** CFB catalog playbook the play was browsed from (must match the call sheet's linked playbook). */
  sourcePlaybook: string;
  formation: string;
  playName: string;
};

type Step =
  | { kind: "pick-target" }
  | { kind: "pick-scenario"; sheetId: string; sheetName: string };

async function fetchSheetScenarios(sheetId: string): Promise<SheetScenario[]> {
  const res = await fetch(`/api/playbook/${sheetId}`);
  const json = (await res.json()) as {
    scenarios?: SheetScenario[];
    error?: string;
  };
  if (!res.ok) throw new Error(json.error ?? COULDNT_LOAD);
  return json.scenarios ?? [];
}

export function AddPlayToSheetModal({
  open,
  onOpenChange,
  sourcePlaybook,
  formation,
  playName,
}: AddPlayToSheetModalProps) {
  const toast = useToastStore((s) => s.addToast);
  const sheetsQuery = usePlaybookList();
  const schemesQuery = useSchemeList();
  const [step, setStep] = useState<Step>({ kind: "pick-target" });
  const [tab, setTab] = useState<"sheets" | "schemes">("sheets");
  const [busy, setBusy] = useState(false);

  const scenariosQuery = useQuery({
    queryKey: ["public-add-play", "scenarios", step.kind === "pick-scenario" ? step.sheetId : ""],
    queryFn: () =>
      step.kind === "pick-scenario" ? fetchSheetScenarios(step.sheetId) : Promise.resolve([]),
    enabled: open && step.kind === "pick-scenario",
  });

  const sheets = sheetsQuery.data?.playbooks ?? [];
  const schemes = schemesQuery.data ?? [];

  const matchingSheets = useMemo(
    () => sheets.filter((sheet) => catalogPlaybookNamesMatch(sheet.playbook, sourcePlaybook)),
    [sheets, sourcePlaybook],
  );

  const sheetPlaybookById = useMemo(() => {
    const map = new Map<string, string>();
    for (const sheet of sheets) map.set(sheet.id, sheet.playbook);
    return map;
  }, [sheets]);

  const matchingSchemes = useMemo(() => {
    return schemes
      .map((scheme) => {
        const offensePlaybook = scheme.offense_call_sheet_id
          ? sheetPlaybookById.get(scheme.offense_call_sheet_id)
          : undefined;
        const defensePlaybook = scheme.defense_call_sheet_id
          ? sheetPlaybookById.get(scheme.defense_call_sheet_id)
          : undefined;
        const offenseMatches =
          scheme.offense_call_sheet_id &&
          scheme.offense_call_sheet_name &&
          offensePlaybook &&
          catalogPlaybookNamesMatch(offensePlaybook, sourcePlaybook);
        const defenseMatches =
          scheme.defense_call_sheet_id &&
          scheme.defense_call_sheet_name &&
          defensePlaybook &&
          catalogPlaybookNamesMatch(defensePlaybook, sourcePlaybook);
        if (!offenseMatches && !defenseMatches) return null;
        return { scheme, offenseMatches: Boolean(offenseMatches), defenseMatches: Boolean(defenseMatches) };
      })
      .filter((entry): entry is NonNullable<typeof entry> => entry !== null);
  }, [schemes, sheetPlaybookById, sourcePlaybook]);

  const title = useMemo(() => {
    if (step.kind === "pick-scenario") return `Add ${playName} to ${step.sheetName}`;
    return `Add ${playName} to…`;
  }, [playName, step]);

  function resetAndClose(nextOpen: boolean) {
    if (!nextOpen) {
      setStep({ kind: "pick-target" });
      setTab("sheets");
      setBusy(false);
    }
    onOpenChange(nextOpen);
  }

  async function addToScenario(sheetId: string, scenarioId: string, sheetName: string) {
    setBusy(true);
    try {
      const res = await fetch(`/api/playbook/${sheetId}/plays`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenarioId, formation, play_name: playName }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        toast(json.error ?? COULDNT_FINISH_THAT, "error");
        setBusy(false);
        return;
      }
      toast(`Added to ${sheetName}`, "success");
      resetAndClose(false);
    } catch {
      toast(COULDNT_FINISH_THAT, "error");
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={resetAndClose}>
      <DialogContent className={responsiveOverlayCenteredDialogClass("md")}>
        <DialogHeader className="shrink-0 space-y-0 border-b border-slate-800 px-4 py-3 text-left md:px-6">
          <DialogTitle className="font-heading text-lg font-bold uppercase tracking-[0.08em] text-white">
            {title}
          </DialogTitle>
          <DialogDescription className="sr-only">
            Choose a call sheet and situation to add this play.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[min(24rem,50dvh)] shrink-0 overflow-y-auto px-4 py-3 md:px-6">
          {step.kind === "pick-target" ? (
            <>
              <div className="mb-3 flex gap-2">
                <button
                  type="button"
                  className={cn(
                    "rounded-lg border px-3 py-1.5 font-sans text-sm",
                    tab === "sheets"
                      ? "border-emerald-600/60 bg-emerald-500/15 text-emerald-200"
                      : "border-slate-700 bg-slate-900 text-slate-400",
                  )}
                  onClick={() => setTab("sheets")}
                >
                  Call Sheets
                </button>
                <button
                  type="button"
                  className={cn(
                    "rounded-lg border px-3 py-1.5 font-sans text-sm",
                    tab === "schemes"
                      ? "border-emerald-600/60 bg-emerald-500/15 text-emerald-200"
                      : "border-slate-700 bg-slate-900 text-slate-400",
                  )}
                  onClick={() => setTab("schemes")}
                >
                  Schemes
                </button>
              </div>

              {tab === "sheets" ? (
                sheetsQuery.isPending ? (
                  <p className="font-body text-sm text-slate-500">Loading call sheets…</p>
                ) : matchingSheets.length === 0 ? (
                  <p className="font-body text-sm text-slate-400">
                    {sheets.length === 0
                      ? "No call sheets yet. Create one from the sidebar to add plays here."
                      : ADD_PLAY_NO_MATCHING_SHEETS}
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {matchingSheets.map((sheet) => (
                      <li key={sheet.id}>
                        <button
                          type="button"
                          className="flex w-full items-center justify-between rounded-lg border border-slate-700 bg-slate-900 px-3 py-3 text-left hover:border-emerald-600/50"
                          onClick={() =>
                            setStep({ kind: "pick-scenario", sheetId: sheet.id, sheetName: sheet.name })
                          }
                        >
                          <span className="font-body text-sm text-white">{sheet.name}</span>
                          <span className="font-mono text-xs text-slate-500">{sheet.play_count} plays</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )
              ) : schemesQuery.isPending ? (
                <p className="font-body text-sm text-slate-500">Loading schemes…</p>
              ) : matchingSchemes.length === 0 ? (
                <p className="font-body text-sm text-slate-400">
                  {schemes.length === 0
                    ? "No schemes yet. Create one from the sidebar to add plays here."
                    : ADD_PLAY_NO_MATCHING_SHEETS}
                </p>
              ) : (
                <ul className="space-y-3">
                  {matchingSchemes.map(({ scheme, offenseMatches, defenseMatches }) => (
                    <li key={scheme.id} className="rounded-lg border border-slate-800 bg-slate-950/60 p-3">
                      <p className="font-body text-sm font-medium text-white">{scheme.name}</p>
                      <div className="mt-2 space-y-2">
                        {offenseMatches && scheme.offense_call_sheet_id && scheme.offense_call_sheet_name ? (
                          <button
                            type="button"
                            className="flex w-full items-center justify-between rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-left text-sm hover:border-emerald-600/50"
                            onClick={() =>
                              setStep({
                                kind: "pick-scenario",
                                sheetId: scheme.offense_call_sheet_id!,
                                sheetName: scheme.offense_call_sheet_name!,
                              })
                            }
                          >
                            <span className="text-slate-200">Offense · {scheme.offense_call_sheet_name}</span>
                          </button>
                        ) : null}
                        {defenseMatches && scheme.defense_call_sheet_id && scheme.defense_call_sheet_name ? (
                          <button
                            type="button"
                            className="flex w-full items-center justify-between rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-left text-sm hover:border-emerald-600/50"
                            onClick={() =>
                              setStep({
                                kind: "pick-scenario",
                                sheetId: scheme.defense_call_sheet_id!,
                                sheetName: scheme.defense_call_sheet_name!,
                              })
                            }
                          >
                            <span className="text-slate-200">Defense · {scheme.defense_call_sheet_name}</span>
                          </button>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </>
          ) : (
            <>
              <button
                type="button"
                className="mb-3 inline-flex items-center gap-1 font-sans text-sm text-slate-400 hover:text-slate-200"
                onClick={() => setStep({ kind: "pick-target" })}
                disabled={busy}
              >
                <ChevronLeft className="h-4 w-4" aria-hidden />
                Back
              </button>
              {scenariosQuery.isPending ? (
                <p className="font-body text-sm text-slate-500">Loading situations…</p>
              ) : (scenariosQuery.data ?? []).length === 0 ? (
                <p className="font-body text-sm text-slate-400">No situations on this call sheet.</p>
              ) : (
                <ul className="space-y-2">
                  {(scenariosQuery.data ?? []).map((scenario) => (
                    <li key={scenario.id}>
                      <button
                        type="button"
                        disabled={busy}
                        className="flex w-full items-center justify-between rounded-lg border border-slate-700 bg-slate-900 px-3 py-3 text-left hover:border-emerald-600/50 disabled:opacity-60"
                        onClick={() => void addToScenario(step.sheetId, scenario.id, step.sheetName)}
                      >
                        <span className="font-body text-sm text-white">{scenario.scenario}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>

        <div className={modalCompactFooterClass}>
          <Button type="button" variant="secondary" className="w-full" onClick={() => resetAndClose(false)}>
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
