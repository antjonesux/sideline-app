# Changelog

All notable changes to The Sideline are documented here. Updated on every push.

---

## 2026-04-21 (per-game play sheet selection + logger sheet binding)

**What:** Added nullable `game_sessions.play_sheet_id` across migration/schema/types (`supabase/migrations/20260421120000_game_play_sheet_id.sql`, `supabase/schema.sql`, `lib/types.ts`). `app/api/games/route.ts` and `app/api/games/[id]/route.ts` now accept optional `play_sheet_id`, verify sheet existence, and validate sheet/playbook compatibility before insert/update. `app/film/new/page.tsx` and `components/film/EditGameDetailsModal.tsx` add a Game Plan picker filtered to the selected offensive playbook, with `None` support and no-sheet helper copy. `app/film/[gameId]/page.tsx` now passes `game.play_sheet_id` into `PlayLoggerV2`, and `hooks/usePlaySuggestions.ts` uses only parent-provided `sheetId` (no `is_active` fallback discovery). Existing `/api/playbook/[id]/plays` hot path remains optimized via `slim=1`.

**Why:** Logger sheet discovery based on `is_active` and playbook matching could miss valid sheets or select the wrong one; coaches need a stable game-specific plan reference so `YOUR CALLS` reflects the intended sheet at call time.

**Status after this push:** New/edit game flows persist a specific sheet choice (or none), edit-save no longer clears an existing sheet during hydration, and logger `YOUR CALLS` now binds to stored `game_sessions.play_sheet_id`.

---

## 2026-04-21 (film game card modal controls + turnover normalization + delete cascade fallback)

**What:** `app/api/games/[id]/route.ts` now performs a defensive manual delete cascade (`logged_plays` -> `drives` -> `game_sessions`) so game deletion still succeeds when FK cascades are missing/drifted. `FilmGameCard` now opens `EditGameDetailsModal` in controlled mode (`open` / `onOpenChange`) from a plain menu button instead of nesting the modal trigger in the dropdown item. `EditGameDetailsModal` adds controlled/open lifecycle props (`open`, `onOpenChange`, `hideTrigger`, optional `onOpen`) and renders through `createPortal` with higher overlay z-index to avoid nav/menu stacking collisions. `driveOutcome` now treats `INTERCEPTION` and `FUMBLE` as turnover tags everywhere turnover checks are used, and `PlayLoggerV2` keeps explicit `TURNOVER` mapping in drive outcome derivation. `BottomTabNav` z-index is lowered (`z-50` -> `z-40`) so overlays win layering consistently.

**Why:** Film game-card actions were vulnerable to dropdown/modal interaction and z-index issues, turnover-related tags were not fully normalized in outcome helpers, and delete behavior needed a safe fallback in environments where relational cascade assumptions are not guaranteed.

**Status after this push:** Film edit/delete interactions are more robust, turnover outcome handling is consistent across tags, and game delete no longer depends solely on FK cascade behavior.

---

## 2026-04-21 (film drive play table — SPOT, TD yards, mobile scroll, badges)

**What:** `YardageSheet` treats **TD** as ending past the goal plane: `effectiveEndFP` **100** so `yards_gained` and `onLog` ending position match coach intent (removes the old `touchdownYardsFromSpots` helper). `lib/fieldPosition.ts` adds **`formatBallSpot`**; `lib/gameStateEngine.ts` adds **`absoluteYardAfterLoggedPlay`** (engine-consistent ending yard, **100** → **EZ** for offensive **TD** / **FIELD_GOAL**). Drive play **`DataTable`** adds a **SPOT** column (`drivePlayTableColumns`); `film/[gameId]` maps rows with `ending_absolute_yard` until a persisted `ending_field_position` exists (`LoggedPlay` optional field). **`DataTable`**: `equalColumns` layout, scroll wrapper `min-w-0 overflow-x-auto overscroll-x-contain touch-pan-x`, table `min-w-[520px]` when equal / `min-w-full w-max` otherwise; parents (`drive` accordion, tendencies scenario card, formation nested panel, import previews) get **`min-w-0`** so horizontal scroll works on small screens. **`ResultBadge`**: **`whitespace-nowrap`** and **`shrink-0`** so labels do not wrap in table cells.

**Why:** Same-line TD spots logged **0** yards; coaches need post-play field readout; equal-width columns need a wider minimum table width plus scroll containers that can shrink inside `overflow-hidden` cards; result pills must stay single-line in narrow columns.

**Status after this push:** `npm run build` is clean; `YardageSheet.tsx`, `fieldPosition.ts`, `gameStateEngine.ts`, `types.ts`, `drivePlayTableColumns.tsx`, `DataTable.tsx`, `ResultBadge.tsx`, `film/[gameId]/page.tsx`, `FilmGameTendenciesBody.tsx`, `GameFormationTable.tsx`, `ImportPreviewDrives.tsx`, `ImportPreviewTable.tsx`.

---

## 2026-04-21 (film Drive setup — starting yard input)

**What:** `DriveSetupForm` starting yard line uses controlled **text** (`inputMode="numeric"`) plus `startingYardStr` state so an empty field stays empty while typing; validation requires **1–50** before **Start Drive** enables. Submit merges the parsed yard into `DriveSetupValues`. Removed the old `Number(e.target.value) || 25` coercion and per-keystroke `min`/`max` clamp on that control.

**Why:** Clearing the yard field immediately refilled **25**, which made it hard to enter a different line from scratch.

**Status after this push:** `npm run build` is clean; `sideline/components/film/DriveSetupForm.tsx`.

---

## 2026-04-20 (film YardageSheet — TD yards, availability, chip color)

**What:** `YardageSheet` keeps `spotDelta` for gain/loss/no-gain gating; **TD** is available on any valid spot (same map pattern as Turnover/Penalty). TD no longer locks OWN/OPP or forces OPP 1; ending field on submit follows the spotted line. `touchdownYardsFromSpots` adjusts logged/preview yards for the goal plane (e.g. +1 when the spot is OPP 1 / abs 99; same-line short-field TDs inside OPP 4 use `100 − startFP`; same-spot TDs at OPP 15 stay 0). TD active chip styling matches **FG Made** (emerald). Prior QA polish unchanged: mono section labels, yard input without steppers, result grid chips.

**Why:** Touchdowns can happen from any field position; the internal 1–99 grid omits the goal line at 100, so TD yardage needs explicit rules; selected TD should read as a scoring state consistent with FG Made.

**Decisions:** `PlayResult` / `onLog` contracts unchanged; touchdown yards are computed in the sheet so `yards_gained` matches coach intent without changing `fieldPosition` helpers.

**Status after this push:** `npm run build` is clean; changes in `sideline/components/film/YardageSheet.tsx`.

---

## 2026-04-20 (film YardageSheet — outcome rules, log gate, QA polish)

**What:** `YardageSheet` derives gain / loss / no gain from start vs end field position (`absoluteYard` ↔ OWN/OPP yard), gates special-result chips with `RESULT_AVAILABILITY` plus drive-ender overrides (Punt, FG Made, FG Miss), auto-clears a blocked selection when the outcome changes, and enables **Log** from a valid ball spot with result optional. Result chips use fixed Tailwind active maps, toggle-off on second tap, and blocked states stay visible but disabled. QA pass: plain yard `input` in the OWN/OPP row (WebKit/Mozilla stepper appearance suppressed), `text-xs` + `whitespace-nowrap` + `w-full` grid chips, identical mono section labels for LOGGING PLAY / BALL SPOTTED AT / RESULT.

**Why:** Coaches spot the ball before tagging results; impossible combinations stay visible but disabled; logging must not require a result tag.

**Status after this push:** Superseded for TD field lock / ending-100 behavior by the TD follow-up entry above; build remains clean.

---

## 2026-04-20 (play type resolution parity + logged play backfill + dedupe migration)

**What:** Added shared play-type resolution utilities (`playTypeResolution`) so Film and Playbook paths use the same lookup and fallback ladder as Tendencies (`cfb26_plays` map first, then stored type, then name-based fallback). Updated APIs and UI surfaces to consume normalized `RUN`/`PASS`/`RPO` output consistently across play rows, suggestions, browser flows, import preview, and tendencies displays. Added Supabase migrations to (1) create and backfill `logged_plays.play_type` from `cfb26_plays` with canonical constraints, (2) map granular CFB labels to badge categories, (3) override numbered personnel calls that should render as run, and (4) deduplicate normalized play names in `play_sheet_plays`.

**Why:** Live logging, tendencies reports, and playbook browse showed drift when play-type data came from different paths or mixed-case playbook labels; historical logs also needed a canonical play-type value for reliable badges and filtering.

**Decisions:** Keep the canonical badge domain strict (`RUN`/`PASS`/`RPO`) and force safe `RUN` fallback for null/unknown values; preserve numbered-call run semantics even when source metadata labels a call as pass-family.

**Status after this push:** App code and database migrations are aligned on one play-type resolution path; apply the 2026-04-19/2026-04-20 Supabase migrations on staging before production.

---

## 2026-04-19 (film QA22 + Play Logger modal + Game Plan add play + drive setup)

**What:** Film `PlayLoggerV2`: single horizontal system (`w-full`, `px-4` wrappers, no `mx-*`); removed sticky header `-mx-3` so drive chrome aligns with body; `LoggerView` toggles suggestions vs inline `YardageSheet` (no bottom sheet / overlay); sticky drive row stays visible in yardage view; `+20` yard chip label fixed. `PlayBrowser`: scroll content and headers share `px-4`; section labels no longer use `bg-slate-950` or sticky (avoids transparent overlap). Film game details: Play Logger modal body uses full width under the title row (`overflow-hidden` wrapper, no extra `p-3`). `DriveSetupForm`: quarter as `Quarter` union with preset chip row (1–4, OT), grouped score and field labels, clearer layout for new-drive setup. Game Plan `AddPlayDrawer`: same modal shell as film Play Logger (`bg-black/60`, `z-[200]`/`[201]`, full-height mobile, `sm:max-w-4xl`), embeds shared `PlayBrowser` for pick flow; `PlaybookEditor` stops passing stats props into the drawer.

**Why:** QA22 removed visible width mismatch between logger header and suggestions; yardage behaves as a second logger screen; browser group headers no longer read as heavy bars; coaches asked Game Plan add/swap play to mirror film browse; drive setup matches the quarter control pattern used on expanded drives.

**Decisions:** Add play no longer shows scenario or formation aggregate stats inside the picker (browse matches film; suggestions on the sheet editor still surface tendencies).

**Status after this push:** `npm run build` is clean; film and playbook flows share the same browser component and modal framing.

---

## 2026-04-19 (film QA18 + QA19 — logger, browser, play types)

**What:** `PlayLoggerV2` drive chrome: removed in-header close and End Drive (drive completion is implicit via modal back; unmount refreshes data, with a TODO for a future persisted drive outcome when the schema supports it); single compressed sticky situation row (QA19) with amber `DRIVE {N}`, inline down/distance + field, call-count accordion chevron, full-width `bg-slate-900` header and emerald flash on the whole bar; accordion stream below with shared chevron rotation. `PlayBrowser`: single scroll with sticky formation-group headers; two-column formation chips (no play-count rows or chevrons); shared full-width slate header for Back + search; plays drill-down hides search and matches Back styling with centered formation title; removed top gaps under headers. `PlayRow` + `inferPlayType`: dropped `OTHER` badge path, dev warn + `RUN` fallback, migration `cfb26_plays_play_type_check` plus data cleanup for `RUN`/`PASS`/`RPO`. Film game details: removed empty-drive confirm modal tied to the old End Drive control.

**Why:** QA18 removed redundant drive actions, aligned icons and full-bleed headers, simplified browse (no group drill-down), and normalized playbook play types so badges never show `OTHER`. QA19 reclaimed vertical space in the logger and tightened browser density to match coach expectations.

**Decisions:** No `drives.result` column in the current schema, so drive outcome is not written on close—refresh only until a column and API exist. Migration targets `cfb26_plays` (not a separate `playbook_plays` table).

**Status after this push:** Film fast logger and browser match QA18/QA19; run the new Supabase migration on staging before production.

---

## 2026-04-19 (film fast logging default flow)

**What:** Replaced legacy `PlayLogger` with `PlayLoggerV2` and added `PlayBrowser`, `YardageSheet`, shared `PlayRow`, plus `useFormationGroups`/`usePlaySuggestions` for grouped browse, context suggestions, and recent-call dedupe. Drive setup now opens before new drive logging. (Follow-up QA18 removed separate End Drive / empty-drive confirm—see the QA18 + QA19 changelog entry above.)

**Why:** The multi-step logger slowed live sideline entry; fast suggestions + quick browse + immediate yard/result capture are the default path now.

**Decisions:** Kept existing API routes, mutation flow, schema, and game-state engine contracts unchanged; implemented behavior through existing persistence paths. FG miss continues through existing result-tag semantics because there is no dedicated `FG_MISS` schema tag.

**Status after this push:** Film game details now defaults to the fast logger flow; old logger file and references are removed; build is clean.

---

## 2026-04-18 (game details QA16)

**What:** Film game details page fixes: drive kebab `DropdownMenu` portals above the sticky header via `z-[70]` and optional below-header top clamp; drive summary cards get clearer row spacing and `gap-3` between cards; Add Drive / End or Resume Game / Upload CSV sit in a compact secondary row under the stats strip (aligned with Edit); Tendencies tab sections are reordered (game stats → play types → by situation → formations) with `font-display` section headers.

**Why:** The drive menu was fighting the sticky chrome and felt buried; drive rows read cramped; primary-styled actions competed with tabs; coaches want headline stats and play-type context before situation and formation detail.

**Status after this push:** `npm run build` is clean; game details layout matches the shared button tier and tendencies reading order from QA16.

## 2026-04-18 (design system + coach copy + cursorrules)

**What:** Design-system alignment (tabs, tables, modals, surfaces, fonts), coach-facing copy and `coachCopy`/`successRateTextClass` helpers, and **UX Copy & Terminology** added to repo root `.cursorrules`.

**Why:** One visual and verbal standard across film, tendencies, scouting, and playbook after the game-details and logger restructure.

**Status after this push:** See root `CHANGELOG.md` for full status; app builds clean with shared primitives and enforced copy rules.

## 2026-04-17 (play logger header card)

**What:** Snap editors (down, distance, short yardage, and first-play field position) now live inside the same card as the down/distance/field/drive summary; the summary row toggles that section with a chevron and starts collapsed. Removed the modal “+ New drive” and “Edit last play” actions and the `onStartNewDrive` prop—new drives stay on the game log screen.

**Why:** The logger felt crowded with duplicate cards and always-visible fields; coaches only need snap edits occasionally and should see the live line at a glance first.

**Decisions:** `CompactGameStateBar` remounts on `drive.id` plus edit target so each context opens with editors hidden again; the expandable region uses the shared `fade-in` and `accordion-chevron` patterns.

**Status after this push:** Film play logging opens with a compact state strip and optional tap-to-edit snap controls without extra chrome in the modal.

---

## 2026-04-17 (film play snap editing)

**What:** The play logger adds a “Snap for this play” / “Snap (this play)” panel so coaches can set down, distance, and “1 yd” vs “& inches” when editing any logged play or before logging the next play on a drive, and clears manual snap overrides only when the drive’s play chain changes (not on stray array re-renders).

**Why:** Down and distance were implied by replay or the first-drive panel only, so corrections for short yardage or a wrong chain required awkward workarounds and inches-to-go could not be set when revising plays.

**Decisions:** Overrides live in `manualGameState` with a fingerprint of drive id, play count, and last play id so pre-submit edits are not wiped unintentionally.

**Status after this push:** Film play edits and next-play logs can align with the real scoreboard situation including inches-to-go.

---

## 2026-04-17 (film starting spot in play logger)

**What:** Empty-drive replay now builds the next snap from the drive row’s `starting_*` fields via `snapStateFromDriveStarting`, and the play logger shows a “Spot at snap (first play)” panel (down, distance, inches, OWN/OPP, yard line) that debounces through the existing drive patch so opening field position is not stuck at own 25.

**Why:** New drives stopped saving starting field context in the simplified drive UI, while `replayGameStateFromPlays` always defaulted to own 25 when no plays existed, so coaches could not log drives that began elsewhere without a place to edit it.

**Decisions:** OWN and OPP toggles disable when that notation cannot represent the current absolute yard line, with tooltips pointing users to adjust the yard number first; yard line uses blur-to-save so multi-digit entry does not thrash the drive row on each keypress.

**Status after this push:** First-play field position and down-and-distance align with stored drive starts and remain editable from the logger until the first play is logged.

---

## 2026-04-17 (film drive sheet and play logger)

**What:** Reworked the game log drive accordion so quarter, score, and drive note edit inline with debounced silent saves, new drives inherit the prior drive’s quarter and score, and simplified the play logger chrome: read-only compact state bar, explicit “New drive” and “Edit last play” actions, OWN/OPP toggles instead of a select, and stricter submit locking so rapid taps cannot double-post plays.

**Why:** Drive metadata was buried behind a separate edit mode and full save toasts were noisy during quick adjustments; the logger bar duplicated drive actions already available on the drive list and play notes belonged on drives rather than every logged play.

**Decisions:** Drive field changes persist after a short debounce without a success toast, while explicit saves still toast; new play logs send a null play note and only edits retain the existing note.

**Status after this push:** Film logging stays faster on mobile, drive context stays visible in the collapsed header, and the play entry form focuses on formation, result, and field position without redundant controls.

---

## 2026-04-17 (shared tables and play normalization)

**What:** Added a reusable `DataTable` with column modules for drive plays and tendencies formation aggregation, centralized `DropdownMenu` with a small registry, moved formation/play search into `components/shared`, tightened film and playbook API routes (explicit selects and error handling), deduplicated CFB26 catalog responses with shared normalization helpers, and extended the Supabase schema plus seed tooling for consistent play naming.

**Why:** Film, import preview, playbook, and tendencies each reimplemented similar tables and pickers, while CFB26 rows and seed strings showed spacing and formation-prefix duplicates that made search noisy and mismatched runtime labels.

**Decisions:** Server-side CFB26 grouping uses a formation plus display-label key so redundant sheet rows collapse without losing `is_new_in_26` when either copy is flagged; catalog GETs send `Cache-Control: no-store` so clients never cache stale merged catalogs.

**Status after this push:** Shared primitives back the main tabular UIs, play matching aligns on normalized names, and the database includes supporting constraints or scripts for deduping CFB26 play rows during maintenance.

---

## 2026-04-17

**What:** Shipped a broad mobile QA and design-system consistency pass across film, playbook, import, and tendencies flows, including modal behavior, spacing alignment, scouting card updates, play logger overrides, and global scrollbar/background polish.

**Why:** Repeated 390px viewport QA found layout drift, inconsistent component patterns, and interaction friction that made key game-day workflows harder to scan and operate quickly on mobile.

**Decisions:** Centralized shared styling through existing global button/type utilities and page layout wrappers, kept legacy scenario aliases server-side for backward compatibility while preserving full labels in UI, and retained safe-area-aware bottom spacing as a stricter equivalent of fixed `pb-24`.

**Status after this push:** Mobile UX is now materially more consistent across pages and modals, edit/action patterns are standardized, tendencies/playbook scenario handling is aligned, and the app builds cleanly after the full audit pass.

---

## 2026-04-16 (evening)

**What:** Seeded 10 additional team playbooks, corrected scheme classifications for Duke/Georgia/Ohio State, added recommendation engine and playbook classification helpers.

**Why:** Only WSU and Texas A&M had playbook data. Needed more teams seeded so the playbook picker and tendencies filters have real data to work with. Scheme corrections came from cross-referencing cfb.fan with the in-game scheme tags.

**Decisions:** Duke is Spread (not Veer & Shoot) - cfb.fan classifies it differently than the community wiki. Went with cfb.fan since that matches the in-game data. Ohio State is Multiple O - the "Spread" label was from an older source.

**Status after this push:** 11 teams seeded. Tendencies playbook filter now only shows playbooks from logged games. Recommendation engine scaffolded but not yet connected to the Playbook UI.

---

## 2026-04-16 (afternoon)

**What:** Seeded Texas A&M playbook (29 formations, 403 plays), fixed tendencies filter to use logged game playbooks only.

**Why:** Needed a second fully-verified playbook beyond WSU to test multi-playbook flows. Tendencies dropdown was showing all 134 teams which made it unusable - restricted to only teams you've actually logged games against.

**Decisions:** Used `offensive_playbook` with fallback to `my_playbook` for playbook resolution. This handles both the new field name and legacy data from before the field was added.

**Status after this push:** Texas A&M fully seeded and verified (formation/play counts match cfb.fan). Tendencies filters working correctly with multi-playbook data.

---

## 2026-04-15

**What:** Design system enforcement (three-font rule), typography audit, UX feedback system (toasts, breadcrumbs), film workflow updates, tendencies/playbook API refinements.

**Why:** QA pass revealed inconsistent fonts (4+ different font families in use), no user feedback on actions (buttons clicked with no response), and several API routes returning inconsistent response shapes. This was a consistency pass to bring everything in line before adding new features.

**Decisions:** Locked to Barlow Condensed / Barlow / JetBrains Mono. Banned all other fonts. Added `.cursorrules` enforcement so Cursor follows the system on all future code. Toast system uses Zustand store so any component can trigger a notification.

**Status after this push:** Typography consistent across all pages. Toast system operational. Film cards enriched with inline stats. Two production hotfixes applied for TypeScript strict mode failures.
