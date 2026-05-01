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
          "gap-0 border-slate-700 bg-slate-900 p-0 text-slate-100 dark:bg-slate-900",
          "fixed inset-x-0 bottom-0 left-0 top-auto max-h-[min(92dvh,100dvh)] w-full max-w-none translate-x-0 translate-y-0 overflow-hidden rounded-t-xl border shadow-lg",
          "data-[state=closed]:slide-out-to-bottom-0 data-[state=open]:slide-in-from-bottom-4",
          "sm:inset-auto sm:left-[50%] sm:top-[50%] sm:max-h-[90vh] sm:max-w-lg sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-xl sm:border sm:shadow-lg",
        )}
      >
        <div className="flex max-h-[min(92dvh,100dvh)] flex-col sm:max-h-[85vh]">
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6">
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
