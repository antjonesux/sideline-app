# Changelog

All notable changes to The Sideline are documented here. Updated on every push.

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
