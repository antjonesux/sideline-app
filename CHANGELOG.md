# Changelog

All notable changes to **The Sideline** (CFB play-calling / film logging assistant) are recorded here. The deployable Next.js app lives in `sideline/`.

---

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
