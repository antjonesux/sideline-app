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
export const PLAY_SHEETS_HOME_TITLE = "My Call Sheets";
export const playSheetsHomeCountLabel = (count: number) =>
  `${count} call sheet${count === 1 ? "" : "s"}`;
export const PLAY_SHEET_CREATE_CTA = "Add sheet";
/** Desktop/tablet sidebar — create action under My Call Sheets submenu. */
export const APP_SHELL_NEW_CALL_SHEET_LABEL = "New Call Sheet";
export const APP_SHELL_CALL_SHEETS_EMPTY = "No call sheets yet";
export const APP_SHELL_CALL_SHEETS_LOAD_ERROR = "Couldn't load sheets";

/** Schemes list — page title and navigation label. */
export const SCHEMES_HOME_TITLE = "My Schemes";
export const APP_SHELL_SCHEMES_MENU_LABEL = SCHEMES_HOME_TITLE;
export const schemesHomeCountLabel = (count: number) =>
  `${count} scheme${count === 1 ? "" : "s"}`;
export const SCHEMES_CREATE_CTA = "Create Scheme";
export const APP_SHELL_NEW_SCHEME_LABEL = "New Scheme";
export const APP_SHELL_SCHEMES_EMPTY = "No schemes yet";
export const APP_SHELL_SCHEMES_LOAD_ERROR = "Couldn't load schemes";
export const SCHEMES_EMPTY_HEADLINE = "No schemes yet";
export const SCHEMES_EMPTY_BODY =
  "Create a scheme to group your offensive and defensive call sheets together for quick access on game day.";
export const SCHEME_CARD_OFFENSE_LABEL = "Offense";
export const SCHEME_CARD_DEFENSE_LABEL = "Defense";
export const SCHEME_CARD_SIDE_UNATTACHED = "Not attached";

export const SCHEME_FORM_CREATE_TITLE = "Create scheme";
export const SCHEME_FORM_EDIT_TITLE = "Edit scheme";
export const SCHEME_FORM_CREATE_SUBTITLE =
  "Group an offensive and defensive call sheet for game day.";
export const SCHEME_FORM_EDIT_SUBTITLE = "Update scheme details and attached call sheets.";
export const SCHEME_FORM_NAME_LABEL = "Scheme name";
export const SCHEME_FORM_NAME_PLACEHOLDER = "e.g. Base vs Spread";
export const SCHEME_FORM_DESCRIPTION_LABEL = "Description";
export const SCHEME_FORM_DESCRIPTION_PLACEHOLDER = "Optional — what this scheme is for";
export const SCHEME_FORM_NOTE_LABEL = "Note";
export const SCHEME_FORM_NOTE_PLACEHOLDER = "Optional coach note";
export const SCHEME_FORM_OFFENSE_SHEET_LABEL = "Offensive call sheet";
export const SCHEME_FORM_DEFENSE_SHEET_LABEL = "Defensive call sheet";
export const SCHEME_FORM_SHEET_NONE = "None";
export const SCHEME_FORM_SHEET_PLACEHOLDER = "Select a call sheet";
export const SCHEME_FORM_SHEETS_LOADING = "Loading call sheets…";
export const SCHEME_FORM_SHEETS_EMPTY = "No call sheets for this side yet.";
export const SCHEME_FORM_SHEETS_EMPTY_HINT = "Create one in My Call Sheets.";
export const SCHEME_FORM_VALIDATION_SHEET_REQUIRED = "Attach at least one call sheet.";
export const SCHEME_FORM_CREATE_CTA = "Create scheme";
export const SCHEME_FORM_SAVE_CTA = "Save changes";
export const SCHEME_FORM_DELETE_SCHEME_TITLE = "Delete scheme?";
export const SCHEME_FORM_DELETE_SCHEME_CONFIRM = "Delete scheme";
export const SCHEME_FORM_DELETE_SCHEME_MESSAGE =
  "A scheme needs at least one call sheet. Removing all sheets will delete this scheme. Your call sheets stay in My Call Sheets.";
export const SCHEME_DELETED_TOAST = "Scheme removed.";

export const SCHEME_DETAIL_EDIT_SCHEME = "Edit scheme";
export const SCHEME_DETAIL_EDIT_SHEET = "Edit sheet";
export const SCHEME_DETAIL_SIDE_TOGGLE_LABEL = "Side of ball";
export const SCHEME_DETAIL_LOADING_SHEET = "Loading call sheet…";
export const SCHEME_DETAIL_NO_SHEETS =
  "No call sheets attached. Edit this scheme to add offensive or defensive sheets.";

export const ADD_TO_SCHEME_MENU_LABEL = "Add to Scheme";
export const ADD_TO_SCHEME_MODAL_TITLE = "Add to Scheme";
export const ADD_TO_SCHEME_MODAL_BODY = "Choose a scheme for this call sheet.";
export const ADD_TO_SCHEME_EMPTY_HEADLINE = "No schemes yet.";
export const ADD_TO_SCHEME_EMPTY_BODY = "Create a scheme first, then attach call sheets from here.";
export const ADD_TO_SCHEME_EMPTY_CTA = "Create Scheme";
export const ADD_TO_SCHEME_ALREADY_ADDED = "Added";
export const ADD_TO_SCHEME_REPLACE_TITLE = "Replace call sheet?";
export const ADD_TO_SCHEME_REPLACE_CONFIRM = "Replace";
export const addToSchemeReplaceMessage = (
  sideLabel: string,
  existingName: string,
  nextName: string,
) =>
  `This scheme already has ${existingName} as its ${sideLabel.toLowerCase()} call sheet. Replace it with ${nextName}?`;
export const ADD_TO_SCHEME_SUCCESS = "Added to scheme.";
export const ADD_TO_SCHEME_REPLACE_SUCCESS = "Call sheet replaced in scheme.";

/** Play Sheet `/playbook/new` — card heading above the step line (same pattern as `FILM_NEW_GAME_TITLE` on Film.new). */
export const PLAYBOOK_NEW_SHEET_TITLE = "Build your play sheet";
/** Subtitle on create play sheet (non–guided flow). */
export const PLAYBOOK_NEW_SHEET_SUBTITLE =
  "Build your calls by situation so you know what you trust before kickoff.";
export const PLAYBOOK_NEW_SHEET_NAME_PLACEHOLDER = "Base vs 3–3–5, Short Yardage, Red Zone";
export const PLAYBOOK_CREATE_PLAYBOOK_SEARCH_PLACEHOLDER = "Search playbooks";
export const PLAYBOOK_SELECT_PLACEHOLDER = "Select a playbook";
export const PLAYBOOK_SELECT_LOADING = "Loading playbooks...";
export const PLAYBOOK_SELECT_EMPTY = "No playbooks available.";
/** Create play sheet — no catalog playbooks for the selected game version. */
export const PLAYBOOK_CREATE_NO_PLAYBOOKS_HEADLINE = "No playbooks available for this game yet.";
export const PLAYBOOK_CREATE_NO_PLAYBOOKS_BODY =
  "We're building the catalog for this game. Switch to another game above if you need an existing book.";
/** Primary CTA on Play Sheet create flow; same label as guided onboarding playbook step. */
export const PLAYBOOK_CREATE_CTA = "Start building your calls";
export const ONBOARDING_PLAYBOOK_CTA = PLAYBOOK_CREATE_CTA;

/** Call Sheet builder — opens the CFB26 play browser for the active situation. */
export const BUILDER_BROWSE_PLAYBOOK = "Browse Playbook";
export const BUILDER_ADD_PLAY = "Add play";
export const BUILDER_ADD_PLAY_FOR_SITUATION = (situationDisplay: string) =>
  `Add play: ${situationDisplay}`;
/** Browse playbook flow — pick which situation bucket receives the play. */
export const BUILDER_BROWSE_SITUATION_PROMPT = "What's this play for?";
export const BUILDER_PLAY_ADDED_TO_SITUATION = (situationDisplay: string) =>
  `Added to ${situationDisplay}`;
export const BUILDER_SITUATION_FULL = "Full";
export const BUILDER_SITUATION_AT_CAPACITY = (situationDisplay: string, max: number) =>
  `${situationDisplay} is full (${max}/${max})`;
export const BUILDER_ADD_SITUATION = "Add situation";
export const BUILDER_SITUATION_ADDED = (name: string) => `Added ${name}`;
export const BUILDER_SITUATION_UPDATED = (name: string) => `Updated ${name}`;
export const BUILDER_SITUATION_DELETED = (name: string) => `${name} deleted`;
export const BUILDER_DELETE_SITUATION_TITLE = (name: string) => `Delete ${name}?`;
export const BUILDER_DELETE_SITUATION_BODY =
  "This will remove this situation. This action cannot be undone.";
export const BUILDER_SITUATION_NAME_PLACEHOLDER = "e.g. Screen Game";
export const BUILDER_SITUATION_DESC_PLACEHOLDER = "e.g. Quick throws to the edges";
export const BUILDER_EDIT_SITUATION = "Edit situation";
export const BUILDER_DELETE_SITUATION = "Delete situation";
export const BUILDER_SITUATIONS_AT_CAPACITY = "16/16";

/** Call Sheet viewer — mobile reference surface for the active sheet. */
export const CALL_SHEET_VIEWER_TAB_NEEDS = "Situations";
export const CALL_SHEET_VIEWER_TAB_FULL = "Coach View";
export const CALL_SHEET_VIEWER_TAB_HINT = "Pick what you're trying to do — not the down";
export const CALL_SHEET_VIEWER_EMPTY_HEADLINE = "No active play sheet";
export const CALL_SHEET_VIEWER_EMPTY_BODY =
  "Create a play sheet in the builder and set one as active. Once you have sheets, tap the name in the header to switch between them.";
export const CALL_SHEET_VIEWER_EMPTY_CTA = "Go to play sheet builder";
export const CALL_SHEET_VIEWER_SITUATION_EMPTY = "No plays added yet.";
export const CALL_SHEET_MENU_LABEL = PLAY_SHEETS_HOME_TITLE;
/** @deprecated Use CALL_SHEET_MENU_LABEL — kept for QA screenshot fixtures until refreshed. */
export const CALL_SHEET_VIEWER_MENU_BUILDER = CALL_SHEET_MENU_LABEL;
export const CALL_SHEET_COACH_VIEW_EMPTY =
  "No plays on your sheet yet. Edit the call sheet to add plays.";
export const CALL_SHEET_VIEWER_MENU_INSIGHTS = "Film & Tendencies";
export const CALL_SHEET_VIEWER_MENU_REVIEW = "Film Room";
export const CALL_SHEET_VIEWER_MENU_REVIEW_SOON = "Coming Soon";
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
