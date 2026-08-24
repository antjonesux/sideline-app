"use client";

import { DriveSetupForm } from "@/components/film/DriveSetupForm";
import { quarterFromDriveForSetup } from "@/lib/filmGameDetailHelpers";
import { modalDialogTitleClass, responsiveOverlayBottomShellPositionClass } from "@/lib/constants/designTokens";
import { cn } from "@/lib/utils";
import type { Drive } from "@/lib/types";

type FilmDriveSetupOverlayProps = {
  open: boolean;
  drives: Drive[];
  onClose: () => void;
  onSubmit: (values: {
    side_of_ball: "offense" | "defense";
    quarter: number;
    score_mine: number;
    score_opponent: number;
    starting_side: "OWN" | "OPP";
    starting_yard_line: number;
    starting_down: number;
    starting_distance: number;
  }) => Promise<void>;
};

export function FilmDriveSetupOverlay({ open, drives, onClose, onSubmit }: FilmDriveSetupOverlayProps) {
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
            onSubmit={async (values) => {
              await onSubmit({
                side_of_ball: values.side_of_ball,
                quarter: values.quarter === "OT" ? 5 : Number(values.quarter),
                score_mine: values.score_mine,
                score_opponent: values.score_opponent,
                starting_side: values.starting_side,
                starting_yard_line: values.starting_yard_line,
                starting_down: values.starting_down,
                starting_distance: values.starting_distance,
              });
            }}
          />
        </div>
      </div>
    </div>
  );
}
