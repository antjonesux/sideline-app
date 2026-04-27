import type { LoggedPlay } from "@/lib/types";

/** Short, human strings for toasts and alerts — no API/DB details. */
export const COULDNT_SAVE = "Couldn't save. Check connection and try again.";
export const COULDNT_LOAD = "Couldn't load that. Check connection and try again.";
/** Team catalog lists (Film new game / import tag game) — never surface vendor or DB errors. */
export const COULDNT_LOAD_TEAM_LIST = "Couldn't load team lists. Check connection and try again.";
/** Generic auth/session operation fallback — `mapAuthError` covers sign-in, sign-up, reset, password update, OAuth, sign-out. */
export const AUTH_COULDNT_COMPLETE = "Couldn't complete that. Try again.";
export const COULDNT_DELETE = "Couldn't remove that. Try again.";
export const IMPORT_PARTIAL = "Some rows didn't import. Check the file and try again.";
export const IMPORT_FAILED = "Couldn't import that file. Try again.";

/** Onboarding game rows — not shown as a picker; satisfies game setup without team selection. */
export const ONBOARDING_OPPONENT_TEAM = "Scout opponent";
export const ONBOARDING_OPPONENT_SCHEME = "Multiple";

export const ONBOARDING_HOME_TITLE = "How The Sideline helps you call";
export const ONBOARDING_HOME_INTRO =
  "The Sideline is a coaching loop: pick calls from your sheet, log what happened, then read tendencies so the next drive is sharper.";
export const ONBOARDING_GAME_DAY_TITLE = "Game Day Mode";
export const ONBOARDING_GAME_DAY_BODY =
  "Live logging with your play sheet in the logger. Situation, field, and YOUR CALLS stay in one place so you can trust the call under pressure.";
export const ONBOARDING_FILM_ROOM_TITLE = "Film Room Mode";
export const ONBOARDING_FILM_ROOM_BODY =
  "Review games drive by drive, edit details, and see what you leaned on when the game was on the line.";
export const ONBOARDING_LOOP_TITLE = "The coaching loop";
export const ONBOARDING_LOOP_BODY =
  "Call plays → log results → open Tendencies → tighten your next game plan. That loop is how the app earns a spot on your sideline.";
export const ONBOARDING_PLAYBOOK_STEP_TITLE = "Choose your offensive playbook";
export const ONBOARDING_PLAYBOOK_STEP_BODY =
  "We match formations and play types to CFB26. Pick the book you want to coach from; you can change it later.";
export const ONBOARDING_PLAYBOOK_CTA = "Create a starter play sheet";
export const ONBOARDING_EDITOR_BANNER =
  "Add a handful of calls you would actually dial up (three is enough). They power YOUR CALLS in the logger.";
export const ONBOARDING_START_LOGS = "Open logger and log 5 calls";
export const ONBOARDING_SHEET_PLAY_COUNT = (n: number, min: number) =>
  `${n} call${n === 1 ? "" : "s"} on sheet · need at least ${min} to continue`;

export const GUIDED_LOGGER_TITLE = "Getting started";
export const GUIDED_LOGGER_HINT = (remaining: number) =>
  remaining > 0 ? `Log ${remaining} more call${remaining === 1 ? "" : "s"} for your first readout.` : "Readout ready below.";
export const GUIDED_INSIGHT_TITLE = "Your first readout";
export const GUIDED_FINISH_CTA = "Finish and go to Film Room";

export const ONBOARDING_GAME_READY = "Practice game ready.";

function isNonPuntLoggedPlay(p: LoggedPlay): boolean {
  const playName = String(p.play_name ?? "").trim().toLowerCase();
  const resultTag = String(p.result_tag ?? "").trim().toLowerCase();
  return playName !== "punt" && resultTag !== "punt";
}

/** Coaching readout from the last five non-punt calls (uses server-resolved `play_type`). */
export function guidedInsightFromLoggedPlays(plays: LoggedPlay[]): string {
  const rows = plays.filter(isNonPuntLoggedPlay);
  const last5 = rows.slice(-5);
  if (last5.length < 5) return "";

  let run = 0;
  let pass = 0;
  let rpo = 0;
  let other = 0;
  for (const p of last5) {
    const t = String(p.play_type ?? "").toUpperCase();
    if (t === "RUN") run += 1;
    else if (t === "PASS") pass += 1;
    else if (t === "RPO") rpo += 1;
    else other += 1;
  }

  const dominant =
    run >= pass && run >= rpo && run >= other ? "RUN" : pass >= run && pass >= rpo && pass >= other ? "PASS" : rpo >= run && rpo >= pass && rpo >= other ? "RPO" : "mixed";
  const predictable = last5.length >= 5 && (run === 5 || pass === 5 || rpo === 5);

  if (predictable) {
    return `All five calls typed as ${dominant === "mixed" ? "one family" : dominant}. That is easy to scout — break it up next series with a change-up call.`;
  }

  if (dominant === "PASS" && pass >= 3) {
    return `Heavy pass tilt (${pass} pass, ${run} run, ${rpo} RPO). Fine on long down — just know you are living in space throws when you need a clock kill.`;
  }
  if (dominant === "RUN" && run >= 3) {
    return `Run-forward start (${run} run, ${pass} pass, ${rpo} RPO). Use the pass tree when the box loads — tendencies will show where you went next.`;
  }
  return `Mix on the board: ${run} run, ${pass} pass, ${rpo} RPO${other ? `, ${other} other` : ""}. Keep logging so Film Room can surface what worked by situation.`;
}

/** Film game detail — end game with final score before marking ended. */
export const FILM_END_GAME_SCORE_TITLE = "Confirm final score";
export const FILM_END_GAME_SCORE_BODY =
  "Adjust the score if needed, then mark the game ended. You can still edit game details later from Film Room.";
export const FILM_END_GAME_CONFIRM_CTA = "Mark Game Ended";
export const FILM_RESUME_GAME_CTA = "Resume Game";

export const filmLoggerYouveBeenCallingHint = (situationLine: string, fieldLine: string) =>
  `This game's calls in similar spots, then situation fits — ${situationLine} at ${fieldLine}`;
