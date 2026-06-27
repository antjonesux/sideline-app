/** Short, human strings for toasts and alerts — no API/DB details. */
export const COULDNT_SAVE = "Couldn't save. Check connection and try again.";
export const COULDNT_LOAD = "Couldn't load that. Check connection and try again.";
/** Team catalog lists (Film new game / import tag game) — never surface vendor or DB errors. */
export const COULDNT_LOAD_TEAM_LIST = "Couldn't load team lists. Check connection and try again.";
/** Generic auth/session operation fallback — `mapAuthError` covers sign-in, sign-up, reset, password update, OAuth, sign-out. */
export const AUTH_COULDNT_COMPLETE = "Couldn't complete that. Try again.";
/** API routes — never expose Postgres or vendor error text to clients. */
export const COULDNT_FINISH_THAT = "Couldn't finish that. Try again.";
/** Authenticated fetch when a row is missing or not owned. */
export const COULDNT_FIND_THAT = "Couldn't find that.";
/** Unverified email — soft gate (banner); pair with `RESEND_VERIFICATION_EMAIL_CTA`. */
export const VERIFY_EMAIL_BANNER =
  "Verify your email to keep your account secure and save your work.";
export const RESEND_VERIFICATION_EMAIL_CTA = "Resend verification email";
/** If a future hard-gate is added for unverified users. */
export const VERIFY_EMAIL_BEFORE_SAVE = "Check your inbox to verify your account before saving more data.";
export const COULDNT_DELETE = "Couldn't remove that. Try again.";
export const IMPORT_PARTIAL = "Some rows didn't import. Check the file and try again.";
export const IMPORT_FAILED = "Couldn't import that file. Try again.";

/** Onboarding game rows — not shown as a picker; satisfies game setup without team selection. */
export const ONBOARDING_OPPONENT_TEAM = "Scout opponent";
export const ONBOARDING_OPPONENT_SCHEME = "Multiple";

/** Default name for the first guided play sheet (coach does not type a name in onboarding). */
export const ONBOARDING_DEFAULT_SHEET_NAME = "My First Play Sheet";

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

export const ONBOARDING_CAROUSEL_CTA = "Build your first play sheet";
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
  "Call plays → log results → open Tendencies → tighten your next play sheet. That loop is how the app earns a spot on your sideline.";
export const ONBOARDING_PLAYBOOK_STEP_TITLE = "Choose your offensive playbook";
export const ONBOARDING_PLAYBOOK_STEP_BODY =
  "We match formations and play types to CFB26. Pick the book you want to coach from; you can change it later.";

import { GO_TO_PLAYS_SCENARIO } from "@/lib/constants";

/** Single situation used in guided onboarding play sheet editor and logger My Sheet preselect. */
export const GUIDED_ONBOARDING_EDITOR_SCENARIO = GO_TO_PLAYS_SCENARIO;

export const GO_TO_PLAY_ADDED = "Added to Go-To.";
export const GO_TO_PLAY_REMOVED = "Removed from Go-To.";
export const GO_TO_PLAY_ALREADY = "Already on your Go-To list.";
export const GO_TO_PLAYS_FULL = (max: number) => `Go-To is full (${max}/${max} slots).`;
export const GO_TO_PLAYS_EMPTY_HEADLINE = "No Go-To plays yet.";
export const GO_TO_PLAYS_EMPTY_BODY = "Favorite plays from other situations to build your Go-To list.";

/** Onboarding-only helper on the yardage / ball-spot step. */
export const ONBOARDING_BALL_SPOT_HELPER =
  "Spot the ball where the play ended. We'll use that to update the next down, distance, and field position.";
export const ONBOARDING_EDITOR_BANNER =
  "Add a handful of calls you would actually dial up (three is enough). They power YOUR CALLS in the logger.";
export const ONBOARDING_START_LOGS = "Take the field";
export const ONBOARDING_SHEET_PLAY_COUNT = (n: number, min: number) =>
  `${n} call${n === 1 ? "" : "s"} on sheet · need at least ${min} to continue`;

export const GUIDED_LOGGER_TITLE = "Getting started";
export const GUIDED_LOGGER_HINT = (remaining: number) =>
  remaining > 0
    ? `Log ${remaining} more call${remaining === 1 ? "" : "s"} for your first drive breakdown.`
    : "First drive breakdown ready — close the logger to see it.";
/** Subtitle under the logger shell title during guided onboarding (coach-first, momentum). */
export const GUIDED_LOGGER_HEADER_SUBLINE = (remaining: number) =>
  remaining > 0
    ? `Log ${remaining} more call${remaining === 1 ? "" : "s"} to see what your first drive says.`
    : "You're set — close the logger when you're ready for your first drive readout.";
export const GUIDED_FINISH_CTA = "Finish and go to Film Room";
export const GUIDED_INSIGHT_CTA_ANOTHER_DRIVE = "Call another drive";
export const GUIDED_INSIGHT_CTA_FILM_ROOM = "Go to Film Room";

export const ONBOARDING_GAME_READY = "Practice game ready.";

/** Film Room list — empty state (real games only; onboarding sessions excluded in query). */
export const FILM_ROOM_EMPTY_HEADLINE = "You've got a plan. Now call the game.";
export const FILM_ROOM_EMPTY_BODY = "Log your first real game and see what actually works.";
export const FILM_ROOM_EMPTY_CTA = "Start your first game";

/** Film `/film/new` — first real game setup (required: your team, opponent, playbook). */
export const FILM_NEW_GAME_TITLE = "Start a game";
export const FILM_NEW_GAME_SUBTITLE =
  "Set the matchup and playbook so your calls are tracked correctly.";
export const FILM_NEW_GAME_CTA = "Start game";
export const FILM_NEW_GAME_YOUR_TEAM_LABEL = "Your team";
export const FILM_NEW_GAME_PLAYBOOK_LABEL = "Playbook";

/** Play Sheet list — empty state (no play sheets yet). */
export const GAME_PLAN_EMPTY_HEADLINE = "No play sheet built yet.";
export const GAME_PLAN_EMPTY_BODY =
  "Start with a CFB26 playbook and build the calls you trust by situation.";
export const PLAY_SHEETS_HOME_TITLE = "Build Your Sheet";
export const PLAY_SHEET_CREATE_CTA = "Create play sheet";
export const PLAY_SHEET_ACTIVE_BADGE = "Active";
export const PLAY_SHEET_SET_ACTIVE = "Set as Active";
export const PLAY_SHEET_SET_ACTIVE_DONE = "Active play sheet updated.";
export const PLAY_SHEET_ALREADY_ACTIVE = "This is already your active sheet.";

/** Play Sheet `/playbook/new` — card heading above the step line (same pattern as `FILM_NEW_GAME_TITLE` on Film.new). */
export const PLAYBOOK_NEW_SHEET_TITLE = "Build your play sheet";
/** Subtitle on create play sheet (non–guided flow). */
export const PLAYBOOK_NEW_SHEET_SUBTITLE =
  "Build your calls by situation so you know what you trust before kickoff.";
export const PLAYBOOK_NEW_SHEET_NAME_PLACEHOLDER = "Base vs 3–3–5, Short Yardage, Red Zone";
export const PLAYBOOK_CREATE_PLAYBOOK_SEARCH_PLACEHOLDER = "Search playbooks";
/** Primary CTA on Play Sheet create flow; same label as guided onboarding playbook step. */
export const PLAYBOOK_CREATE_CTA = "Start building your calls";
export const ONBOARDING_PLAYBOOK_CTA = PLAYBOOK_CREATE_CTA;

/** Call Sheet builder — opens the CFB26 play browser for the active situation. */
export const BUILDER_BROWSE_PLAYBOOK = "Browse Playbook";
export const BUILDER_ADD_PLAY = "Add play";

/** Call Sheet viewer — mobile reference surface for the active sheet. */
export const CALL_SHEET_VIEWER_TAB_NEEDS = "Situations";
export const CALL_SHEET_VIEWER_TAB_FULL = "Coach View";
export const CALL_SHEET_VIEWER_TAB_HINT = "Pick what you're trying to do — not the down";
export const CALL_SHEET_VIEWER_EMPTY_HEADLINE = "No active play sheet";
export const CALL_SHEET_VIEWER_EMPTY_BODY =
  "Create a play sheet in the builder and set one as active. Once you have sheets, tap the name in the header to switch between them.";
export const CALL_SHEET_VIEWER_EMPTY_CTA = "Go to play sheet builder";
export const CALL_SHEET_VIEWER_SITUATION_EMPTY = "No plays added yet.";
export const CALL_SHEET_VIEWER_MENU_BUILDER = "Build Your Sheet";
export const CALL_SHEET_VIEWER_MENU_VIEW = "Call Plays";
export const CALL_SHEET_VIEWER_MENU_INSIGHTS = "Film & Tendencies";
export const CALL_SHEET_VIEWER_MENU_SETTINGS = "Settings";
export const CALL_SHEET_VIEWER_SWITCHER_TITLE = "Select your play sheet";

/** Film game detail — end game with final score before marking ended. */
export const FILM_END_GAME_SCORE_TITLE = "Confirm final score";
export const FILM_END_GAME_SCORE_BODY =
  "Adjust the score if needed, then mark the game ended. You can still edit game details later from Film Room.";
export const FILM_END_GAME_CONFIRM_CTA = "Mark Game Ended";
export const FILM_RESUME_GAME_CTA = "Resume Game";

export const filmLoggerYouveBeenCallingHint = (situationLine: string, fieldLine: string) =>
  `Based on what you've called on ${situationLine} at ${fieldLine}`;

/** My Sheet tab — no rows for the selected sheet situation (scenario label from `scenarioDisplayLabel`). */
export const filmLoggerMySheetEmptyHint = (scenarioDisplay: string) =>
  `No calls have been added to your sheet for this situation — ${scenarioDisplay}.`;
