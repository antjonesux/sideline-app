"use client";

import { DriveSetupForm, type DriveSetupSubmitPayload } from "@/components/film/DriveSetupForm";
import { quarterFromDriveForSetup } from "@/lib/filmGameDetailHelpers";
import { modalDialogTitleClass, responsiveOverlayBottomShellPositionClass } from "@/lib/constants/designTokens";
import { cn } from "@/lib/utils";
import type { Drive, GameSession } from "@/lib/types";

type FilmDriveSetupOverlayProps = {
  open: boolean;
  game: Pick<GameSession, "offensive_playbook" | "my_playbook" | "opponent_scheme" | "game_version"> | null;
  drives: Drive[];
  onClose: () => void;
  onSubmit: (values: DriveSetupSubmitPayload) => Promise<void>;
};

export function FilmDriveSetupOverlay({ open, game, drives, onClose, onSubmit }: FilmDriveSetupOverlayProps) {
  if (!open) return null;

  const lastDrive = drives[drives.length - 1];

  return (
    <div className="fixed inset-0 z-[195] bg-black/60" onClick={onClose}>
      <div className={cn("z-[196]", responsiveOverlayBottomShellPositionClass("lg"))} onClick={(e) => e.stopPropagation()}>
        <div className="overflow-hidden rounded-t-xl rounded-b-none border border-slate-700 bg-slate-900 md:rounded-xl">
          <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3 sm:px-6">
            <h2 className={modalDialogTitleClass}>Drive Setup</h2>
            <button type="button" className="p-2 text-slate-400 hover:text-white" onClick={onClose}>
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
                <path d="M6 6 18 18M18 6 6 18" />
              </svg>
              <span className="sr-only">Close</span>
            </button>
          </div>
          <DriveSetupForm
            game={game}
            defaultValues={{
              side_of_ball: "offense",
              quarter: quarterFromDriveForSetup(lastDrive?.quarter),
              score_mine: Math.max(0, Number(lastDrive?.score_mine ?? 0)),
              score_opponent: Math.max(0, Number(lastDrive?.score_opponent ?? 0)),
              starting_side: "OWN",
              starting_yard_line: 25,
              starting_down: 1,
              starting_distance: 10,
            }}
            onCancel={onClose}
            onSubmit={onSubmit}
          />
        </div>
      </div>
    </div>
  );
}
