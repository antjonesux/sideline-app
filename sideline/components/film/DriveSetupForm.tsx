"use client";
// QA26: Design system enforcement pass — replaced inline styles, unified icons, enforced card/typography tokens

import { Button } from "@/components/ui/button";
import { DriveMissingSidePlaybookPicker } from "@/components/film/DriveMissingSidePlaybookPicker";
import { modalCtaFooterClass } from "@/lib/constants/designTokens";
import { CATALOG_SIDES_OF_BALL, CATALOG_SIDE_OF_BALL_LABELS, type CatalogSideOfBall } from "@/lib/constants";
import { gameSideMissingPlaybook } from "@/lib/filmGameDetailHelpers";
import type { DriveSideOfBall, GameSession } from "@/lib/types";
import { useEffect, useState } from "react";

export type Quarter = "1" | "2" | "3" | "4" | "OT";

export type DriveSetupValues = {
  side_of_ball: DriveSideOfBall;
  quarter: Quarter;
  score_mine: number;
  score_opponent: number;
  starting_side: "OWN" | "OPP";
  starting_yard_line: number;
  starting_down: 1 | 2 | 3 | 4;
  starting_distance: number;
};

export type DriveSetupSubmitPayload = DriveSetupValues & {
  /** When the selected side had no playbook on the game session, persist this first. */
  persist_playbook?: { side: DriveSideOfBall; playbook: string };
};

const QUARTER_PRESETS = ["1", "2", "3", "4", "OT"] as const satisfies readonly Quarter[];

const sideToggleOn = "border-emerald-500 bg-emerald-500/15 text-emerald-300";
const sideToggleOff = "border-slate-700 bg-slate-900 text-slate-400";

export function DriveSetupForm({
  defaultValues,
  game,
  onCancel,
  onSubmit,
}: {
  defaultValues: DriveSetupValues;
  game?: Pick<GameSession, "offensive_playbook" | "my_playbook" | "opponent_scheme" | "game_version"> | null;
  onCancel: () => void;
  onSubmit: (values: DriveSetupSubmitPayload) => Promise<void>;
}) {
  const [values, setValues] = useState<DriveSetupValues>(defaultValues);
  const [missingSidePlaybook, setMissingSidePlaybook] = useState<string | null>(null);
  const [startingYardStr, setStartingYardStr] = useState(() => String(defaultValues.starting_yard_line));
  const [scoreMineStr, setScoreMineStr] = useState(() => String(defaultValues.score_mine));
  const [scoreOppStr, setScoreOppStr] = useState(() => String(defaultValues.score_opponent));
  const [downStr, setDownStr] = useState(() => String(defaultValues.starting_down));
  const [distanceStr, setDistanceStr] = useState(() => String(defaultValues.starting_distance));
  const [busy, setBusy] = useState(false);

  const needsPlaybook =
    game != null && gameSideMissingPlaybook(game, values.side_of_ball);

  useEffect(() => {
    setMissingSidePlaybook(null);
  }, [values.side_of_ball]);

  const parsedStartingYard = Number.parseInt(startingYardStr.trim(), 10);
  const startingYardValid =
    !Number.isNaN(parsedStartingYard) && parsedStartingYard >= 1 && parsedStartingYard <= 50;
  const playbookReady = !needsPlaybook || Boolean(missingSidePlaybook?.trim());

  async function submit() {
    if (!startingYardValid || !playbookReady) return;
    setBusy(true);
    try {
      const scoreMine = Math.max(0, Number.parseInt(scoreMineStr.replace(/\D/g, ""), 10) || 0);
      const scoreOpp = Math.max(0, Number.parseInt(scoreOppStr.replace(/\D/g, ""), 10) || 0);
      const down = Math.max(1, Math.min(4, Number.parseInt(downStr.replace(/\D/g, ""), 10) || 1)) as 1 | 2 | 3 | 4;
      const distance = Math.max(1, Math.min(99, Number.parseInt(distanceStr.replace(/\D/g, ""), 10) || 10));
      const payload: DriveSetupSubmitPayload = {
        ...values,
        starting_yard_line: parsedStartingYard,
        score_mine: scoreMine,
        score_opponent: scoreOpp,
        starting_down: down,
        starting_distance: distance,
      };
      if (needsPlaybook && missingSidePlaybook?.trim()) {
        payload.persist_playbook = {
          side: values.side_of_ball,
          playbook: missingSidePlaybook.trim(),
        };
      }
      await onSubmit(payload);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
    <div className="space-y-3 px-4 pb-4 pt-4 sm:px-6">
      <p className="font-sans text-sm text-slate-300">Set the drive start situation.</p>

      <fieldset className="space-y-2">
        <legend className="mb-1 block font-mono text-xs font-semibold uppercase tracking-widest text-slate-500">
          Side of Ball
        </legend>
        <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label="Side of ball">
          {CATALOG_SIDES_OF_BALL.map((side) => (
            <button
              key={side}
              type="button"
              role="radio"
              aria-checked={values.side_of_ball === side}
              onClick={() => setValues((v) => ({ ...v, side_of_ball: side as CatalogSideOfBall }))}
              className={`min-h-11 rounded-lg border px-4 py-3 font-body text-sm font-semibold transition-colors ${
                values.side_of_ball === side ? sideToggleOn : sideToggleOff
              }`}
            >
              {CATALOG_SIDE_OF_BALL_LABELS[side]}
            </button>
          ))}
        </div>
      </fieldset>

      {needsPlaybook ? (
        <DriveMissingSidePlaybookPicker
          sideOfBall={values.side_of_ball as CatalogSideOfBall}
          gameVersion={game?.game_version}
          selectedPlaybook={missingSidePlaybook}
          onPlaybookChange={setMissingSidePlaybook}
        />
      ) : null}

      <div>
        <label className="mb-2 block font-mono text-xs font-semibold uppercase tracking-widest text-slate-500">
          Quarter
        </label>
        <div className="flex gap-2">
          {QUARTER_PRESETS.map((q) => {
            const selected = values.quarter === q;
            return (
              <button
                key={q}
                type="button"
                onClick={() => setValues((v) => ({ ...v, quarter: q }))}
              className={`min-h-[44px] flex-1 rounded-lg border px-4 py-2.5 text-sm font-semibold transition-colors ${
                  selected
                    ? "border-transparent bg-emerald-500 text-black"
                    : "border-slate-700 bg-transparent text-slate-300 hover:border-slate-500"
                }`}
              >
                {q}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <label className="mb-2 block font-mono text-xs font-semibold uppercase tracking-widest text-slate-500">Score</label>
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={scoreMineStr}
              onChange={(e) => setScoreMineStr(e.target.value.replace(/\D/g, ""))}
              placeholder="0"
              className="min-h-[44px] w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-center font-mono text-lg font-bold text-slate-100 focus:border-emerald-500 focus:outline-none"
            />
            <span className="mt-1 block text-center font-mono text-xs text-slate-500">MY SCORE</span>
          </div>
          <span className="shrink-0 text-lg font-bold text-slate-500">–</span>
          <div className="flex-1">
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={scoreOppStr}
              onChange={(e) => setScoreOppStr(e.target.value.replace(/\D/g, ""))}
              placeholder="0"
              className="min-h-[44px] w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-center font-mono text-lg font-bold text-slate-100 focus:border-emerald-500 focus:outline-none"
            />
            <span className="mt-1 block text-center font-mono text-xs text-slate-500">OPP SCORE</span>
          </div>
        </div>
      </div>

      <div>
        <label className="mb-2 block font-mono text-xs font-semibold uppercase tracking-widest text-slate-500">
          Starting field
        </label>
        <div className="flex gap-2">
          <button
            type="button"
            className={`min-h-11 flex-1 rounded-lg border px-4 py-2.5 ${values.starting_side === "OWN" ? "border-transparent bg-emerald-600 text-slate-100" : "border-slate-700 text-slate-300"}`}
            onClick={() => setValues((v) => ({ ...v, starting_side: "OWN" }))}
          >
            OWN
          </button>
          <button
            type="button"
            className={`min-h-11 flex-1 rounded-lg border px-4 py-2.5 ${values.starting_side === "OPP" ? "border-transparent bg-emerald-600 text-slate-100" : "border-slate-700 text-slate-300"}`}
            onClick={() => setValues((v) => ({ ...v, starting_side: "OPP" }))}
          >
            OPP
          </button>
          <input
            type="text"
            inputMode="numeric"
            autoComplete="off"
            aria-label="Yard line (1–50)"
            placeholder="1–50"
            className={`min-h-11 min-w-[4.5rem] flex-1 rounded-lg border bg-slate-800 px-3 text-center font-mono tabular-nums text-slate-100 focus:outline-none ${
              startingYardStr.trim() !== "" && !startingYardValid
                ? "border-amber-600/80 focus:border-amber-500"
                : "border-slate-700 focus:border-emerald-500"
            }`}
            value={startingYardStr}
            onChange={(e) => setStartingYardStr(e.target.value)}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <label className="text-xs text-slate-400">
          Down
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            className="mt-1 min-h-11 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 text-slate-100"
            value={downStr}
            onChange={(e) => setDownStr(e.target.value.replace(/\D/g, ""))}
          />
        </label>
        <label className="text-xs text-slate-400">
          Distance
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            className="mt-1 min-h-11 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 text-slate-100"
            value={distanceStr}
            onChange={(e) => setDistanceStr(e.target.value.replace(/\D/g, ""))}
          />
        </label>
      </div>
    </div>
    <div className={modalCtaFooterClass}>
      <Button type="button" variant="secondary" className="flex-1" onClick={onCancel}>
        Cancel
      </Button>
      <Button type="button" variant="default" className="flex-1" disabled={!startingYardValid || !playbookReady || busy} onClick={() => void submit()}>
        Start Drive
      </Button>
    </div>
    </>
  );
}
