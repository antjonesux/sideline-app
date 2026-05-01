import { buildGuidedOnboardingInsight } from "@/lib/guidedOnboardingInsight";
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

/** Default name for the first guided play sheet (coach does not type a name in onboarding). */
export const ONBOARDING_DEFAULT_SHEET_NAME = "My First Game Plan";

export const ONBOARDING_CAROUSEL_SLIDES = [
  {
    title: "Plan",
    body: "Build your calls by situation so you know what you trust before the game starts.",
    imageSrc: "/onboarding/slide-1-plan.png",
  },
  {
    title: "Call",
    body: "Call plays with your sheet in the loop — situation and YOUR CALLS in one place.",
    imageSrc: "/onboarding/slide-2-call.png",
  },
  {
    title: "Improve",
    body: "Turn every drive into reads — see what worked and where you got predictable.",
    imageSrc: "/onboarding/slide-3-improve.png",
  },
] as const;

export const ONBOARDING_CAROUSEL_CTA = "Build your first game plan";
export const ONBOARDING_EXPLORE_APP = "Explore app";

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
export const ONBOARDING_PLAYBOOK_CTA = "Start building your calls";
export const ONBOARDING_EDITOR_BANNER =
  "Add a handful of calls you would actually dial up (three is enough). They power YOUR CALLS in the logger.";
export const ONBOARDING_START_LOGS = "Take it to the field";
export const ONBOARDING_SHEET_PLAY_COUNT = (n: number, min: number) =>
  `${n} call${n === 1 ? "" : "s"} on sheet · need at least ${min} to continue`;

export const GUIDED_LOGGER_TITLE = "Getting started";
export const GUIDED_LOGGER_HINT = (remaining: number) =>
  remaining > 0 ? `Log ${remaining} more call${remaining === 1 ? "" : "s"} for your first readout.` : "Readout ready below.";
export const GUIDED_INSIGHT_TITLE = "Your first readout";
export const GUIDED_FINISH_CTA = "Finish and go to Film Room";
export const GUIDED_INSIGHT_CTA_FULL_BREAKDOWN = "View full breakdown";
export const GUIDED_INSIGHT_CTA_FILM_ROOM = "Go to Film Room";

export const ONBOARDING_GAME_READY = "Practice game ready.";

/** Coaching readout from the last five non-punt calls (uses server-resolved `play_type`). */
export function guidedInsightFromLoggedPlays(plays: LoggedPlay[]): string {
  return buildGuidedOnboardingInsight(plays)?.tendencyParagraph ?? "";
}

/** Film game detail — end game with final score before marking ended. */
export const FILM_END_GAME_SCORE_TITLE = "Confirm final score";
export const FILM_END_GAME_SCORE_BODY =
  "Adjust the score if needed, then mark the game ended. You can still edit game details later from Film Room.";
export const FILM_END_GAME_CONFIRM_CTA = "Mark Game Ended";
export const FILM_RESUME_GAME_CTA = "Resume Game";

export const filmLoggerYouveBeenCallingHint = (situationLine: string, fieldLine: string) =>
  `Based on what you've called on ${situationLine} at ${fieldLine}`;
