"use client";

import { DriveInlineScores } from "@/components/film/DriveInlineScores";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { modalCtaFooterClass, modalDialogTitleClass, responsiveOverlayDialogContentClass } from "@/lib/constants/designTokens";
import { cn } from "@/lib/utils";

type FilmUpdateScoreDialogProps = {
  open: boolean;
  driveId: string;
  scoreMine: number | null;
  scoreOpponent: number | null;
  onOpenChange: (open: boolean) => void;
  onSaveBoth: (mine: number, theirs: number) => void;
};

/** Post-possession score check — coach can confirm or override the running score. */
export function FilmUpdateScoreDialog({
  open,
  driveId,
  scoreMine,
  scoreOpponent,
  onOpenChange,
  onSaveBoth,
}: FilmUpdateScoreDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        overlayClassName="z-[205] bg-black/70"
        className={cn(
          responsiveOverlayDialogContentClass("md", "z-[206]"),
          "[&>button]:right-4 [&>button]:top-4 [&>button]:ring-offset-slate-900",
        )}
      >
        <DialogHeader className="space-y-0 border-b border-slate-800 px-4 py-3 text-left sm:px-6 sm:text-left">
          <DialogTitle className={cn("pr-10 text-left", modalDialogTitleClass)}>Update score</DialogTitle>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6">
          <DialogDescription asChild>
            <p className="font-body text-sm leading-relaxed text-slate-300">
              This drive ended. Adjust the drive score if it changed. Nothing is saved until you edit the fields
              below; you can always change scores later from the drive card.
            </p>
          </DialogDescription>
          <div className="mt-4">
            <DriveInlineScores
              key={driveId}
              driveId={driveId}
              scoreMine={scoreMine}
              scoreOpponent={scoreOpponent}
              onSaveBoth={onSaveBoth}
            />
          </div>
        </div>
        <div className={modalCtaFooterClass}>
          <Button type="button" variant="default" className="w-full py-3" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
