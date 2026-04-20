# Changelog

All notable changes to **The Sideline** (CFB play-calling / film logging assistant) are recorded here. The deployable Next.js app lives in `sideline/`.

---

## 2026-04-20 — Film YardageSheet TD follow-up (yards, chip, no field lock)

### What

- **TD** stays available whenever a valid ball spot is entered (same outcome gating pattern as Turnover / Penalty); the OWN/OPP row is never locked for touchdowns, and submit uses the coach’s spotted field position instead of forcing the end zone.
- **Touchdown yards** use a dedicated helper so the 1–99 field grid matches real scoring: forward TDs spotted at **OPP 1** (abs 99) add the extra goal-plane yard; same-line goal-line TDs inside **OPP 4** credit `100 − startFP`; same-spot TDs farther out stay **0** yards (e.g. OPP 15).
- **Selected TD chip** uses the same emerald active styling as **FG Made**.
- **Spot vs tag:** `spotDelta` still drives gain/loss/no-gain availability; TD logging and preview use the adjusted touchdown yardage.

### Why

- Coaches tag TD from any field position and expect logged yards to match the end zone (grid stops at 99; the goal is 100); removing the TD field lock matches how long scores are spotted.

### Status after this push

- Production build is clean. See `sideline/CHANGELOG.md` for file-level notes (`YardageSheet.tsx`).

---

## 2026-04-20 — Film YardageSheet outcome gating, log-on-spot, and UI QA

### What

- **YardageSheet** ties special-result availability to field-position delta (gain / loss / no gain), keeps Punt and FG outcomes available whenever a valid spot is entered, dims blocked chips instead of hiding them, supports tap-to-deselect, and enables logging from the ball spot alone (result optional).
- **QA:** Single bold yard input beside OWN/OPP with spinners suppressed on that control; result grid uses uniform `text-xs` mono chips with `whitespace-nowrap`; section labels (LOGGING PLAY, BALL SPOTTED AT, RESULT) share one typography preset.

### Why

- Sideline entry should match how coaches think about spot-then-tag, without impossible result combinations active; polish removes spinner clutter and label inconsistency in the yardage pane.

### Status after this push

- Production build is clean. See `sideline/CHANGELOG.md` for file-level notes (`YardageSheet.tsx`).

---

## 2026-04-20 — Play type resolution parity, logged-play backfill, and dedupe migration

### What

- Added shared play-type resolution helpers so Film and Playbook use the same matching ladder as Tendencies (`cfb26_plays` lookup by normalized keys, then stored value, then safe fallback).
- Updated affected Film, Playbook, Import, and Tendencies surfaces to consistently render canonical `RUN` / `PASS` / `RPO` badges from the unified resolver.
- Added Supabase migrations to populate and constrain `logged_plays.play_type`, map granular CFB labels into badge categories, apply numbered-call run overrides, and deduplicate normalized `play_sheet_plays.play_name` entries.

### Why

- Play-type values drifted across features because different routes and components used different lookup and fallback paths; historical logged plays also lacked a consistent canonical type.

### Status after this push

- App and DB now share one play-type normalization contract. Run the new 2026-04-20 migrations on staging before production.

---

## 2026-04-19 — Film QA22, Play Logger modal width, Game Plan add play, drive setup

### What

- **Film QA22:** `PlayLoggerV2` content width aligned to the sticky drive header (`px-4` system); yardage entry is a full-pane view under that header instead of a bottom sheet; `YardageSheet` outer positioning/rounded sheet chrome removed; `+20` chip renders without a stray trailing plus. `PlayBrowser` uses consistent `px-4` for sticky header and scroll regions; formation group titles are non-sticky and background-free. Game details Play Logger modal drops the inner `p-3` so the logger matches the “Play Logger” title bar width.
- **Game Plan:** `AddPlayDrawer` reuses the film modal pattern and embeds `PlayBrowser` (same browse/select as film) instead of the stacked `FormationPlaySearch` drawer.
- **Drive setup:** `DriveSetupForm` gains quarter preset chips (`Quarter` type), tighter score/field grouping, and exports types used by the film new-drive flow.

### Why

- Coaches saw misaligned edges and sheet-style yardage in film; Game Plan add play should feel identical to film browse; new-drive setup should mirror the quarter UX on the drive card.

### Status after this push

- Production build is clean. See `sideline/CHANGELOG.md` for file-level notes.

---

## 2026-04-19 — Film Room QA18 + QA19 (logger header, PlayBrowser, play types)

### What

- **QA18:** Implicit drive completion for the fast logger (no End Drive / no in-header dismiss); sticky header and `PlayBrowser` full-bleed `bg-slate-900` treatment; formation browser as one scroll with sticky group headers then formation rows (superseded by QA19 chip grid); chevron consistency; Supabase migration normalizing `cfb26_plays.play_type` to `RUN`/`PASS`/`RPO` with a check constraint; `PlayRow` / `inferPlayType` guard removing `OTHER`; film page dropped the empty-drive confirm modal.
- **QA19:** Single-row compressed `PlayLoggerV2` header (drive label, situation + field, call accordion); emerald flash on the full header bar; `PlayBrowser` flat header bar (Back + search), two-column formation chips, plays view with identical Back control and no search, no gap under headers.

### Why

- Less chrome and clearer full-width film surfaces; coaches browse formations faster; playbook types stay consistent in the database and in badges.

### Status after this push

- Apply `sideline/supabase/migrations/20260419120000_fix_play_types_qa18.sql` on staging before production. See `sideline/CHANGELOG.md` for full detail.

---

## 2026-04-19 — Film Room fast logging default flow

### What

- Replaced the legacy `PlayLogger` path with `PlayLoggerV2`, added `PlayBrowser`, `YardageSheet`, and shared `PlayRow`, and wired Add Drive through drive setup into the new fast logging flow.
- Added `useFormationGroups` and `usePlaySuggestions` hooks for grouped formation browsing, situation-based suggestions, and recent call dedupe.
- Tightened optimistic log/refresh behavior in the film game details screen. (QA18 later removed the separate empty-drive confirm tied to End Drive—see QA18 + QA19 entry.)

### Why

- The old multi-step logger slowed live entry; coaches need faster call logging with suggestions, quick browser drill-down, and immediate yard/result entry.

### Decisions

- Kept existing API routes, schema, query patterns, and game-state engine contracts unchanged; implemented the fast flow by reusing those pathways instead of introducing new persistence layers.
- Mapped FG miss behavior through existing result tags/engine semantics because `FG_MISS` is not a first-class schema tag.

### Status after this push

- Fast logging is now the default Film Room interaction path on game details, old logger references are removed, and production build remains clean.

---

## 2026-04-18 — Film game details QA16 (sticky menu, drives, actions, tendencies order)

### What

- Game log sticky header: drive kebab menu uses shared `DropdownMenu` with `z-[70]` and clamps open position below the sticky header; compact secondary action row (Add Drive, End/Resume Game, Upload CSV) under stats, matching Edit; drive cards use clearer padding and spacing; game tendencies tab sections reordered with display-font headers.

### Why

- QA16: menu vs. sticky chrome, visual hierarchy vs. tabs, coach-first tendencies scan order.

### Status after this push

- See `sideline/CHANGELOG.md` for detail; `npm run build` in `sideline/` passes.

## 2026-04-18 — Design system pass, coach-facing copy, and `.cursorrules` copy standards

### What

- Enforced typography (no generic font stacks), shared `DataTable`/`successRateTextClass`/`coachCopy` helpers, aligned tab strips (game log, tendencies, scouting), modal shells and destructive confirm styling, and nested surfaces (slate-800) across film drives, formation search, tendencies tables, and scouting cards.
- Rewrote user-facing strings to coach clipboard voice: **call/calls**, human empty states and CTAs, shared save/load/import toasts without API leakage, tighter film import and game log copy, and navigation label consistency.
- Added **# UX Copy & Terminology — Enforced Globally** to `.cursorrules`, with cross-links from existing Empty States, Error Handling, and Data Display sections.

### Why

- Post-restructure UI needed one consistent system (tabs, tables, modals, colors) so every screen matches the same bar as the game log and tendencies.
- Copy had drifted into developer-shaped language; product rules now live in-repo so future work stays on-voice and on-terminology.

### Decisions

- Centralized safe toast strings in `sideline/lib/coachCopy.ts` and success-rate color thresholds in `successRateTextClass.ts` rather than scattering magic strings.
- Game tendencies scenario breakdown uses `DataTable` like other tables; scouting sub-tabs match film game tab styling (equal width, `border-emerald-500` active indicator).

### Status after this push

- Film Room game log, play logger, import, tendencies (including in-game tendencies tab), scouting report, and playbook surfaces follow the tightened design tokens and coach copy rules documented in `.cursorrules`.
- `npm run build` is clean; agents and contributors should treat the new copy section as binding for any new UI text.

## 2026-04-17 — QA8 mobile fixes for film logger, drive cards, and playbook flows

### What

- Standardized mobile modal behavior for the play logger and add-play drawer, fixed hidden headers/close controls, and cleaned noisy edit-drive/logger UI actions.
- Reworked drive and tendencies accordion table rendering for overflow-safe horizontal scrolling, consistent nowrap cell formatting, and matching card radius/containment; also updated playbook editor details and add-play border styling.
- Updated play logging/edit-drive behavior with Ball At yardline calculations, clearable numeric text inputs, and added/propagated drive starting state fields (down, distance, field position) plus schema/API support.

### Why

- QA8 surfaced multiple mobile usability regressions (cut-off modal headers, overflowing table content, accidental visual clutter, and friction entering/editing yardline values) that slowed in-game usage.
- Logging gain/loss by yards required mental math and increased entry errors, so moving to Ball At input improves speed and correctness during live drives.

### Decisions

- Kept yards entry only for touchdown while using Ball At for gain/loss and deriving stored yards from absolute field-position delta.
- Added both server-side and client-side play-list normalization/deduping to guard against inconsistent seed naming variants in formation groups.

### Status after this push

- Film logging, drive editing, and add-play flows are now aligned with the app’s mobile bottom-sheet/table standards and pass TypeScript build checks.
- Database schema and live Supabase project now include the missing `situation_override` and drive-start context columns required for the updated logger/edit-drive workflows.

## 2026-04-17 — Mobile-first UI polish across film, import, playbook, and tendencies

### What

- Improved mobile responsiveness across key surfaces: film game controls, shared drive/play tables, modal and drawer shells, bottom tab nav sizing, and tendencies summaries.
- Simplified import interactions by removing sample-data shortcuts, broadening accepted CSV-compatible uploads (`.csv`, `.tsv`, `.txt`), and refining preview/table readability on smaller screens.

### Why

- Several high-traffic views were crowded or hard to scan on phones, especially in overlays and dense play rows, which slowed in-game logging and review workflows.
- Import and tendency views needed more predictable, touch-friendly behavior so coaches can move from upload to actionable insights without layout friction.

### Decisions

- Standardized overlay stacking and container behavior around a mobile bottom-sheet pattern (`z-[60]`, rounded top corners, sticky headers, max-height scrolling) with desktop fallbacks.
- Replaced the tendencies play-type chart with a lightweight, sortable bar-list view to improve readability and avoid cramped chart labels on narrow screens.

### Status after this push

- Core film, import, playbook, and tendencies screens now use more consistent mobile interaction patterns and table layouts, with clearer empty/error messaging and retry affordances.
- The app is in a stronger dark-mode-first, touch-optimized state for sideline usage.

## 2026-04-13 — CSV bulk import (spreadsheet → film session)

### Added

- **`/import`** — Multi-step wizard: template download, CSV upload, client-side parse with PapaParse, game metadata form (with last-used offensive playbook/scheme persisted via `lastGamePrefsStore`), preview of drives and plays, confirmation, and POST to execute import.
- **Import UI components** (`sideline/components/import/`) — Stepper, uploader, game setup form, preview tables/drives, template download, result badges, and confirmation flow.
- **`POST /api/import/validate`** — Validates parsed CSV row objects and returns `valid_rows`, `errors`, and counts.
- **`POST /api/import/execute`** — Re-validates server-side, creates a `game_sessions` row with `import_source: "csv"`, inserts drives and `logged_plays` mapped from the import model.
- **`GET /api/import/template`** — Downloads `sideline_game_template.csv` with headers and example rows.
- **`importCsv`**, **`csvImportPreview`**, **`importSamplePlays`** (`sideline/lib/`) — Column validation, yard-line parsing, result mapping to film `result_tag` values, and bundled sample rows for quick testing.
- **`importStore`** (`sideline/store/importStore.ts`) — Zustand store for wizard step and import payload state.

### Changed

- **`/film`** — Adds a prominent card linking to **Import from CSV** alongside “Start New Game.”
- **`/film/[gameId]`** — Copy and link nudging users toward CSV import for full play-by-play from spreadsheets.
- **`GameSession` type** (`sideline/lib/types.ts`) — Optional `import_source` aligned with the database column.

### Database / Supabase (`sideline/supabase/schema.sql`)

- **`game_sessions.import_source`** — `text` column defaulting to `'live'`; CSV imports set `'csv'` on insert.

### Dependencies (`sideline/package.json`)

- **`papaparse`** and **`@types/papaparse`** for CSV parsing in the browser.

---

## 2026-04-13 — Film logging UX, CFB26 playbook API, and database alignment

### Added

- **`GET /api/cfb26-plays`** — Queries `cfb26_plays` by playbook: list formations grouped by formation type, list plays for a formation, or search (≥2 chars) with grouped results; formation types ordered (Pistol, Gun, Goal Line, then alphabetical).
- **`PlayLogger` client component** (`sideline/components/film/PlayLogger.tsx`) — Dedicated film play-entry UI: formation/play pickers backed by the new API, result tags, down-and-distance carry logic (including drive-ending tags: touchdown, turnover, punt, field goal), and success toast.
- **`filmResultTags`** (`sideline/lib/filmResultTags.ts`) — Shared film result tag types and button config (no gain, gain, loss, touchdown, incomplete, turnover, punt, field goal).
- **`/film` loading UI** (`sideline/app/film/loading.tsx`) — Skeleton state for the film room route.

### Changed

- **`/film/[gameId]`** — Refactored to use `PlayLogger`, `React.use()` for async `params`, Supabase client usage where appropriate, drive-level result inference from the last logged play, and navigation patterns aligned with the App Router.
- **`/film` (index)** — Loads games via the Supabase client with nested `drives` → `logged_plays` for accurate drive/play counts; `force-dynamic`; redesigned layout (FILM ROOM header, score emphasis, W/L badges, empty state, partial-log hint when play count is under 10).
- **`/film/new`** — POST to `/api/games` sends `Content-Type: application/json`; handles missing `id` with an alert; score fields use text + `inputMode="numeric"` for friendlier mobile entry.
- **`POST /api/games`** — Uses a dedicated Supabase client with `persistSession: false`; inserts an explicit column list; improved error logging and 500 responses on insert failure.
- **`POST /api/games/[id]/drives`** — Assigns `drive_number` from current drive count + 1; validates and maps body fields (quarter, time, yard line, side, scores, note); richer Postgrest error JSON on failure.

### Database / Supabase (`sideline/supabase/schema.sql`)

- **`game_sessions`** — `ALTER TABLE … ADD COLUMN IF NOT EXISTS` for `quarter_started_logging` and `is_partial_log` so older databases pick up columns skipped by `CREATE TABLE IF NOT EXISTS`.
- **`logged_plays.result_tag`** — Check constraint extended for film-oriented tags: `LOSS`, `PUNT`, `FIELD_GOAL` (and idempotent constraint refresh for existing DBs).
- **RLS** — Row level security disabled on `game_sessions`, `drives`, and `logged_plays` so server routes using the anon key can read/write as intended (documented in schema comments).

---

## Earlier development (commit history)

Summary of merged work before the 2026-04-13 release above, newest first (short hash · subject).

| Commit   | Summary |
|----------|---------|
| `a561eda` | Film “new game”: load teams from Supabase with session-scoped caching. |
| `80bdf4c` | Film setup combobox fixes; add `@types/culori`. |
| `2a121ca` | Refactor public Supabase credentials usage; align `.env.example`. |
| `dc5da9f` | Vercel: copy `sideline/.next` to repo root after build (root-directory deploys). |
| `8028ab7` | Film setup: anon Supabase client, error UI, RLS read policies for reference data. |
| `a6dd4b6` | Film empty-state copy; seed-teams Supabase typing improvements. |
| `fe830b5` | Colocate Supabase seeds under `sideline/supabase`. |
| `163a6a6` | Team combobox for film flows; seed scripts; dependency updates. |
| `a1ab0e1` | Fix `/film` SSR: use `VERCEL_URL` for server-side API origin. |
| `2d4b260` | Pin Node engine to 20.x on Vercel (avoid open-ended major drift). |
| `dea2df3` | Fix Vercel builds when the project root is the repo root. |
| `8671315` | Add Vercel config and Node engine metadata for the sideline app. |
| `9446b83` | Expand film flows; add drive, film, and play-related API routes. |
| `fa0f970` | Restructure application into `sideline/` Next.js project layout. |
| `88ac570` | Live game workflow, tendencies routes, setup UI. |
| `ff667b6` | Recommendations endpoint; coverage affinity updates (MVP4). |
| `fbddb48` | Live call engine, game state bar, notes, sessions (MVP4). |
| `42771ef` | Dedupe migrations; scheme data updates. |
| `31b91a9` | Game plan and play sheets MVP; API routes; Supabase migrations. |
| `b17a7d3` | Initial commit: The Sideline CFB26 offensive coordinator assistant. |

---

## Notes

- Version tags are not used in this repository yet; this file uses **dates** for the latest bundle and a **commit table** for prior work.
- For environment variables and local setup, see `sideline/.env.example` and `sideline/README.md`.
