"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  FILM_END_GAME_CONFIRM_CTA,
  FILM_END_GAME_SCORE_BODY,
  FILM_END_GAME_SCORE_TITLE,
} from "@/lib/coachCopy";
import { modalCtaFooterClass, modalDialogTitleClass, responsiveOverlayDialogContentClass } from "@/lib/constants/designTokens";
import { cn } from "@/lib/utils";

type FilmEndGameScoreDialogProps = {
  open: boolean;
  endingGame: boolean;
  scoreMine: string;
  scoreOpp: string;
  onOpenChange: (open: boolean) => void;
  onScoreMineChange: (value: string) => void;
  onScoreOppChange: (value: string) => void;
  onConfirm: (scores: { my_score: number; opponent_score: number }) => void;
};

export function FilmEndGameScoreDialog({
  open,
  endingGame,
  scoreMine,
  scoreOpp,
  onOpenChange,
  onScoreMineChange,
  onScoreOppChange,
  onConfirm,
}: FilmEndGameScoreDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        overlayClassName="z-[189] bg-black/70"
        className={cn(
          responsiveOverlayDialogContentClass("md", "z-[190]"),
          "[&>button]:right-4 [&>button]:top-4 [&>button]:ring-offset-slate-900",
        )}
      >
        <DialogHeader className="space-y-0 border-b border-slate-800 px-4 py-3 text-left sm:px-6 sm:text-left">
          <DialogTitle className={cn("pr-10 text-left", modalDialogTitleClass)}>{FILM_END_GAME_SCORE_TITLE}</DialogTitle>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6">
          <DialogDescription asChild>
            <p className="font-body text-sm leading-relaxed text-slate-300">{FILM_END_GAME_SCORE_BODY}</p>
          </DialogDescription>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="film-end-score-mine" className="mb-1 block font-mono text-[10px] uppercase tracking-widest text-slate-500">
                Your score
              </label>
              <input
                id="film-end-score-mine"
                inputMode="numeric"
                className="min-h-11 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 font-mono tabular-nums text-white"
                value={scoreMine}
                onChange={(e) => onScoreMineChange(e.target.value.replace(/\D/g, ""))}
              />
            </div>
            <div>
              <label htmlFor="film-end-score-opp" className="mb-1 block font-mono text-[10px] uppercase tracking-widest text-slate-500">
                Their score
              </label>
              <input
                id="film-end-score-opp"
                inputMode="numeric"
                className="min-h-11 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 font-mono tabular-nums text-white"
                value={scoreOpp}
                onChange={(e) => onScoreOppChange(e.target.value.replace(/\D/g, ""))}
              />
            </div>
          </div>
        </div>
        <div className={modalCtaFooterClass}>
          <Button type="button" variant="secondary" className="flex-1 py-3" disabled={endingGame} onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            className="flex-1 py-3"
            disabled={endingGame}
            onClick={() => {
              const mine = Math.max(0, Number.parseInt(scoreMine.replace(/\D/g, "") || "0", 10) || 0);
              const opp = Math.max(0, Number.parseInt(scoreOpp.replace(/\D/g, "") || "0", 10) || 0);
              onConfirm({ my_score: mine, opponent_score: opp });
            }}
          >
            {FILM_END_GAME_CONFIRM_CTA}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
