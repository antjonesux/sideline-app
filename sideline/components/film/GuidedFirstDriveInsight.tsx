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
import { modalCtaFooterClass, modalDialogTitleClass } from "@/lib/constants/designTokens";
import { cn } from "@/lib/utils";

type GuidedFirstDriveInsightProps = {
  open: boolean;
  readout: FirstDriveCoachingReadout;
  onCallAnotherDrive: () => void | Promise<void>;
  onGoToFilmRoom: () => void;
  anotherDriveBusy?: boolean;
};

export function GuidedFirstDriveInsight({
  open,
  readout,
  onCallAnotherDrive,
  onGoToFilmRoom,
  anotherDriveBusy = false,
}: GuidedFirstDriveInsightProps) {
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
              <div className="rounded-xl border border-slate-700 bg-slate-900/90 p-4">
                <p className="font-body text-base font-medium leading-snug text-slate-100">{readout.primaryInsight}</p>
              </div>

              <div className="space-y-3">
                {readout.supportingStats.map((row) => (
                  <div key={row.label} className="rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2.5">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="font-mono text-xs uppercase tracking-wider text-slate-500">{row.label}</span>
                      <span className="font-mono text-sm font-semibold tabular-nums text-slate-100">{row.value}</span>
                    </div>
                    {row.barFraction != null ? (
                      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-800" aria-hidden>
                        <div
                          className="h-full rounded-full bg-emerald-500/90 transition-[width] duration-300"
                          style={{ width: `${Math.min(100, Math.max(0, row.barFraction * 100))}%` }}
                        />
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>

              <div className="rounded-xl border border-amber-900/40 bg-amber-950/25 p-4">
                <p className="font-body text-sm leading-relaxed text-amber-50/95">{readout.coachingNudge}</p>
              </div>
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
