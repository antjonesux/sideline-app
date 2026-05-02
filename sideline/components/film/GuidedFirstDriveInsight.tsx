"use client";

import type { FirstDriveCoachingReadout } from "@/lib/guidedOnboardingInsight";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { GUIDED_INSIGHT_CTA_ANOTHER_DRIVE, GUIDED_INSIGHT_CTA_FILM_ROOM } from "@/lib/coachCopy";
import {
  GUIDED_FIRST_DRIVE_DIALOG_DESCRIPTION,
  GUIDED_FIRST_DRIVE_EYEBROW,
} from "@/lib/guidedFirstDriveCopy";
import { PlayTypeDistribution } from "@/components/tendencies/PlayTypeDistribution";
import { modalCtaFooterClass, modalDialogTitleClass } from "@/lib/constants/designTokens";
import { cn } from "@/lib/utils";

type GuidedFirstDriveInsightProps = {
  open: boolean;
  readout: FirstDriveCoachingReadout;
  onCallAnotherDrive: () => void | Promise<void>;
  onGoToFilmRoom: () => void;
  anotherDriveBusy?: boolean;
};

const PLAY_TYPE_ROW_LABELS = new Set(["Run", "Pass", "RPO"]);

export function GuidedFirstDriveInsight({
  open,
  readout,
  onCallAnotherDrive,
  onGoToFilmRoom,
  anotherDriveBusy = false,
}: GuidedFirstDriveInsightProps) {
  const extraStats = readout.supportingStats.filter((row) => !PLAY_TYPE_ROW_LABELS.has(row.label));

  return (
    <Dialog
      open={open}
      onOpenChange={() => {
        /* Dismissal only via explicit CTAs — no backdrop / Esc exit. */
      }}
    >
      <DialogContent
        hideCloseButton
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        overlayClassName="z-[210] bg-black/80"
        className={cn(
          "gap-0 border-slate-800 bg-slate-950 p-0 text-slate-100 dark:bg-slate-950",
          // Full-viewport onboarding step (matches playbook team-select shell; tab bar hidden for guided=1)
          "fixed inset-0 left-0 top-0 flex h-[100dvh] max-h-[100dvh] w-full max-w-none translate-x-0 translate-y-0 flex-col overflow-hidden rounded-none border shadow-none",
          // Override centered-dialog motion from `DialogContent` defaults (full-bleed step)
          "data-[state=closed]:slide-out-to-bottom-2 data-[state=open]:slide-in-from-bottom-4",
          "data-[state=closed]:slide-out-to-left-0 data-[state=open]:slide-in-from-left-0",
          "data-[state=closed]:slide-out-to-top-0 data-[state=open]:slide-in-from-top-0",
        )}
      >
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-6 pt-[max(1.25rem,env(safe-area-inset-top,0px))] sm:px-6">
            <DialogHeader className="space-y-2 text-left sm:text-left">
              <p className="font-mono text-xs uppercase tracking-widest text-emerald-400/90">{GUIDED_FIRST_DRIVE_EYEBROW}</p>
              <DialogTitle className={cn("pr-2 text-left", modalDialogTitleClass, "text-xl tracking-[0.08em] sm:text-2xl")}>
                {readout.headline}
              </DialogTitle>
              <DialogDescription className="sr-only">{GUIDED_FIRST_DRIVE_DIALOG_DESCRIPTION}</DialogDescription>
            </DialogHeader>

            <div className="mt-4 space-y-4">
              <div className="rounded-xl border border-slate-700 bg-slate-900/90 p-4 space-y-3">
                <p className="font-body text-base font-medium leading-snug text-slate-100">{readout.primaryInsight}</p>
                <p className="border-t border-slate-700/80 pt-3 font-body text-sm leading-relaxed text-sky-100/95">
                  {readout.coachingNudge}
                </p>
              </div>

              <PlayTypeDistribution data={readout.playTypeDistribution} />

              {extraStats.length > 0 ? (
                <div className="space-y-2">
                  {extraStats.map((row) => (
                    <div key={row.label} className="rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2.5">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="font-mono text-xs uppercase tracking-wider text-slate-500">{row.label}</span>
                        <span className="font-mono text-sm font-semibold tabular-nums text-slate-100">{row.value}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </div>

          <div className={cn(modalCtaFooterClass, "flex-col sm:flex-row")}>
            <Button
              type="button"
              variant="default"
              className="min-h-11 w-full flex-1 text-sm sm:w-auto"
              disabled={anotherDriveBusy}
              onClick={() => void onCallAnotherDrive()}
            >
              {anotherDriveBusy ? "Starting…" : GUIDED_INSIGHT_CTA_ANOTHER_DRIVE}
            </Button>
            <Button type="button" variant="secondary" className="min-h-11 w-full flex-1 text-sm sm:w-auto" onClick={onGoToFilmRoom}>
              {GUIDED_INSIGHT_CTA_FILM_ROOM}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
