# Changelog

All notable changes to The Sideline are documented here. Updated on every push.

---

## 2026-04-27 (Tendencies — tab strip to filters spacing, Film game detail parity)

**What:** `components/tendencies/TendenciesHome.tsx` wraps both sub-tab `TabsContent` regions in `<div className="pt-3">`, matching the spacing below `TabsList` on `app/film/[gameId]/page.tsx` so filters sit with the same visual rhythm as Film game details.

**Why:** Tendencies top tabs sat flush against the filter row; Film already uses this wrapper—reuse avoids a one-off spacing value and aligns cross-surface polish.

**Status after this push:** `npm run build` from `sideline/` passed; `TendenciesHome.tsx`, repo-root **`CHANGELOG.md`**, this file.

---

## 2026-04-27 (Modal/drawer mobile QA — combobox focus + flush bottom radius)

**What:** `EditGameDetailsModal` and `CreatePlaybookModal` set `onOpenAutoFocus` on `DialogContent` to prevent default focus, then focus the dialog title so the first combobox is not auto-focused. `TeamCombobox` with `openOnFocus={false}` now calls `setOpen(false)` on `onFocus` to keep the list closed on programmatic focus and clear stale `open` state. `CreatePlaybookModal` passes `openOnFocus={false}` to the CFB26 selector and adds `rounded-b-none` on mobile dialog chrome. `AddPlayDrawer`, Play Logger, and Drive setup shells on `app/film/[gameId]/page.tsx` use `rounded-t-xl rounded-b-none` on mobile (full rounding restored at `sm:`) for flush bottom edges.

**Why:** The default Radix first-field focus was the main driver for “Your Team” / playbook dropdowns feeling like they opened on modal open; bottom-aligned mobile overlays need square bottom corners when flush to the viewport.

**Status after this push:** `npm run build` from `sideline/` passed; `components/film/EditGameDetailsModal.tsx`, `components/film/TeamCombobox.tsx`, `components/playbook/CreatePlaybookModal.tsx`, `components/playbook/AddPlayDrawer.tsx`, `app/film/[gameId]/page.tsx`, repo-root **`CHANGELOG.md`**, this file.

---

## 2026-04-27 (mobile modal sheet polish + CFB26 key casing + formation diagnostics)

**What:** Updated settings/film/playbook/destructive modal shells to use consistent mobile bottom-sheet positioning, scroll-safe body regions, and safe-area aware action/footer spacing. Added `openOnFocus` to `components/film/TeamCombobox.tsx` and set `openOnFocus={false}` for setup selectors in `components/film/EditGameDetailsModal.tsx` to stop forced dropdown opens on focus. Updated `lib/constants.ts` so `CFB_CATALOG_GAME_VERSION` is lowercase `cfb26`. Added temporary runtime diagnostics in `hooks/useFormationGroups.ts` and `components/film/PlayBrowser.tsx` for formation-group payload/loading visibility.

**Why:** Mobile overlays needed a single reliable interaction pattern across flows; setup combobox focus transitions were opening menus too aggressively; catalog version casing needed to match current lookups; and recent formation-browser debugging required direct runtime logs.

**Status after this push:** Modal behavior is more consistent across mobile/desktop surfaces, setup comboboxes no longer auto-open on focus where not desired, the CFB26 version key matches lowercase usage, and diagnostics are available for formation-browser tracing.

---

## 2026-04-27 (Film logger/browser — add runtime playbook fetch diagnostics)

**What:** Added temporary client logs in `components/film/PlayLoggerV2.tsx` and `hooks/useFormationGroups.ts` to print the exact `playbook` prop/value and the exact `/api/cfb26-plays?...` request URL used by the formation browser path.

**Why:** Existing games were still rendering empty formations/plays despite confirmed DB/API data, so we needed precise runtime values (including JSON-stringified strings) to verify whether the client is passing or encoding a mismatched playbook key.

**Status after this push:** Diagnostic-only instrumentation is in place (no behavior changes) for live capture and root-cause confirmation.

---

## 2026-04-27 (Film logger — remove team-name fallback for playbook lookup)

**What:** `app/film/[gameId]/page.tsx` now passes `game.offensive_playbook ?? ""` to `PlayLoggerV2` instead of `game.offensive_playbook ?? game.my_playbook`.

**Why:** `my_playbook` is the team name, not the CFB playbook identifier expected by `/api/cfb26-plays`, so the fallback could return an empty list without surfacing an error.

**Status after this push:** Film logger/browser catalog lookups no longer fall back to team names, and `npm run build` succeeds.

---

## 2026-04-27 (Seed script — tighten upsert constraint detection + probe error logging)

**What:** `scripts/seed-playbooks.ts` now treats the upsert-guard failure as a missing unique constraint only for the actual Postgres conflict-target error (`42P10` / matching message) instead of any generic `ON CONFLICT` text. Added a temporary probe log in `assertCfb26UpsertSupported` to print the raw upsert error object (`PROBE RESULT`) before cleanup.

**Why:** The guard was false-triggering despite an existing unique constraint, so the check needed to key off the exact database error semantics and expose the raw error payload for diagnosis.

**Status after this push:** Seeding guard remains in place, false positives from broad message matching are reduced, and temporary probe output is available for live debugging.

---

## 2026-04-27 (Supabase production migration history reconciliation)

**What:** Repaired remote migration-history entries that were present in production without matching local files, then pushed the generated baseline migration **`supabase/migrations/20260427141345_remote_schema.sql`** after history cleanup.

**Why:** The production schema was already correct, but migration-history drift blocked normal Supabase CLI flows.

**Status after this push:** `supabase migration list` is conflict-free and `npm run build` completed successfully with TypeScript checks.

---

## 2026-04-26 (Infrastructure — Vercel + Supabase production env)

**What:** **Repo root** `package.json`: **`engines.node` `>=20`**. **`.env.example`**: production env + Supabase Auth redirect allowlist notes (Vercel / custom domain).

**Why:** Document production wiring without new deployment architecture.

**Status after this push:** repo-root **`package.json`**, **`.env.example`**, repo-root **`CHANGELOG.md`**, this file.

---

## 2026-04-26 (Analytics — product funnel events: game, plays, full game, tendencies, return)

**What:** **`lib/productAnalytics.ts`**: `emitProductEvent`, `window.__sidelineProductEvents`, **`sideline:product`** (mirrors perf buffer pattern). **`lib/filmPlayCounting.ts`**: shared coach-call vs all-play counts. **`ReturnSessionTracker`** in **`AppProviders`**. Events: **`game_created`** (`film/new`, import save), **`first_play`** / **`ten_plays`** (logger + import; milestones via **localStorage**), **`full_game`** (End game **PUT** success), **`tendencies_viewed`** (**`TendenciesHome`** mount + dedupe), **`return_session`** (prior browser visit via **localStorage**).

**Why:** Launch-plan base measurement for core loop health without a third-party SDK or new APIs.

**Status after this push:** `lib/productAnalytics.ts`, `lib/filmPlayCounting.ts`, `components/providers/ReturnSessionTracker.tsx`, `components/providers/AppProviders.tsx`, `app/film/new/page.tsx`, `app/film/import/save/page.tsx`, `app/film/[gameId]/page.tsx`, `components/film/PlayLoggerV2.tsx`, `components/tendencies/TendenciesHome.tsx`, repo-root **`CHANGELOG.md`**, this file.

---

## 2026-04-26 (Film — client perf instrumentation: game load, logger+sheet, submit→next)

**What:** **`lib/perfInstrumentation.ts`**: `startCriticalFlow` / `endCriticalFlow` for **`film_game_detail_load`**, **`film_logger_open_with_sheet`**, **`film_submit_to_next_play`**; events via **`sideline:perf`**, buffer **`window.__sidelinePerfEvents`** capped at **300**. **`app/film/[gameId]/page.tsx`**: load timing; **`openForCreate`** supersedes prior logger-open with **`superseded_by_new_open`**. **`usePlaySuggestions`** ends logger-open on sheet fetch / skip / cleanup. **`PlayLoggerV2`** + **`YardageSheet`**: submit→refresh timing; **try/catch** on save path.

**Why:** Baseline metrics for launch-plan critical Film flows without new APIs or a telemetry platform.

**Status after this push:** `lib/perfInstrumentation.ts`, `app/film/[gameId]/page.tsx`, `components/film/PlayLoggerV2.tsx`, `components/film/YardageSheet.tsx`, `hooks/usePlaySuggestions.ts`, repo-root **`CHANGELOG.md`**, this file.

---

## 2026-04-26 (DB — composite indexes: logged_plays + drives aggregation paths)

**What:** Migration **`20260426120000_aggregation_path_indexes.sql`**: **`idx_logged_plays_user_game`** on **`logged_plays (user_id, game_session_id)`**, **`idx_logged_plays_user_drive`** on **`logged_plays (user_id, drive_id)`**, **`idx_drives_user_game`** on **`drives (user_id, game_session_id)`**. **`supabase/schema.sql`** mirrors the same indexes.

**Why:** Pre-launch perf: user-scoped filters used by Film, Tendencies, and Game Plan read paths; migration + `schema.sql` stay aligned.

**Status after this push:** `supabase/migrations/20260426120000_aggregation_path_indexes.sql`, `supabase/schema.sql`, repo-root **`CHANGELOG.md`**, this file.

---

## 2026-04-24 (UI — Preline out, shadcn in, drive menu clamp, contract docs)

**What:** Removed **Preline** (**`PrelineScript`** / **`PrelineScriptWrapper`** deleted); migrated interactive UI to **shadcn/ui** with tracked **`components/ui/*.tsx`** (**`button`**, **`dialog`**, **`dropdown-menu`**, **`select`**, **`tabs`**). **`shared/DropdownMenu`**: **`clampMenuBelowSelector`**, dynamic **`sideOffset`**, rAF-coalesced scroll/resize + passive capture scroll listener; **`app/film/[gameId]/page.tsx`** **`TabsList`** **`data-film-game-dropdown-clamp`**. **`ConfirmDestructiveModal`** title classes deduped. Repo-root **`BUILD_CONTRACT.md`** (**`/`** gate, **Dialog** vs **Film** legacy overlays, kebab patterns) and **`DECISIONS.md`** (2026-04-24 ADR + **Impact** carve-out).

**Why:** Close the migration with honest APIs, correct stacking vs game chrome, and docs that match running code.

**Status after this push:** Large **`sideline/`** surface + **`package-lock.json`**; **`components/ui/*.tsx`**, **`components/shared/DropdownMenu.tsx`**, **`components/shared/ConfirmDestructiveModal.tsx`**, **`app/layout.tsx`**, **`app/globals.css`**, **`app/film/[gameId]/page.tsx`**, **`BUILD_CONTRACT.md`**, **`DECISIONS.md`**, repo-root **`CHANGELOG.md`**, this file.

---

## 2026-04-24 (Playbook — guided onboarding handoff, film `[gameId]` layout)

**What:** **`CreatePlaybookModal`** **`guidedOnboardingFlow`** → **`/playbook/[id]?onboarding=1`**; **`PlaybookHome`** sets it from home onboarding; **`PlaybookEditor`** and **`app/playbook/[id]/page.tsx`** read **`onboarding=1`**; **`app/playbook/page.tsx`** threads search params. New **`app/film/[gameId]/layout.tsx`**; updates to **`app/film/[gameId]/page.tsx`** and **`PlayLoggerV2`**.

**Why:** Finish first-run flow from onboarding into sheet + logger with stable layout.

**Status after this push:** `app/film/[gameId]/layout.tsx`, `app/film/[gameId]/page.tsx`, `components/film/PlayLoggerV2.tsx`, `components/playbook/CreatePlaybookModal.tsx`, `PlaybookEditor.tsx`, `PlaybookHome.tsx`, `app/playbook/page.tsx`, `app/playbook/[id]/page.tsx`, repo-root **`CHANGELOG.md`**, this file.

---

## 2026-04-24 (Onboarding — home gate, tab chrome, auth default `/`)

**What:** **`app/page.tsx`** server auth + **`HomeOnboardingGate`** (games **`play_count`**, **`/api/cfb26-playbooks`**, stepped copy from **`lib/coachCopy.ts`**). **`BottomTabNav`** hidden on **`/`** + **`data-onboarding-chrome`**. **`lastGamePrefsStore`** version **`1`** with **`guidedOnboardingDone`** and migrate from legacy. OAuth / login / callback default **`next`** to **`/`** instead of **`/film`**.

**Why:** Coaches with no logged plays see product onboarding before Film.

**Status after this push:** `app/page.tsx`, `components/shared/HomeOnboardingGate.tsx`, `components/shared/BottomTabNav.tsx`, `lib/coachCopy.ts`, `store/lastGamePrefsStore.ts`, `app/auth/callback/route.ts`, `app/login/LoginForm.tsx`, `components/providers/AuthProvider.tsx`, repo-root **`CHANGELOG.md`**, this file.

---

## 2026-04-24 (Tooling — shadcn/ui init, Tailwind v4)

**What:** **`components.json`** (default, slate, CSS variables, **`app/globals.css`**, **`@/components/ui`**). Deps **`clsx`**, **`tailwind-merge`**, **`shadcn`**, **`tw-animate-css`**. **`components/ui/.gitkeep`**. **`lib/utils.ts`** **`cn()`** plus existing play-name helpers. **`globals.css`** shadcn imports and theme tokens; app-specific CSS layers preserved.

**Why:** shadcn component installs and token mapping can follow without redoing init.

**Status after this push:** `components.json`, `components/ui/.gitkeep`, `package.json`, `package-lock.json`, `lib/utils.ts`, `app/globals.css`, repo-root **`CHANGELOG.md`**, this file.

---

## 2026-04-23 (Settings — `/settings`, hub settings link, account delete API, shared auth/password)

**What:** **`app/settings/page.tsx`** (server **`getUser`** gate) and **`SettingsPageClient.tsx`**: grouped rows, **`activeDrawer`** for email / password / sign-out sheets and delete **`ConfirmDestructiveModal`**, **`PasswordInput`**, **`mapAuthError`**, toasts on password update and account delete. **`SettingsLink`** in **`components/shared/AppTopBar.tsx`** sits in the **`app-page-title`** flex row on **Film**, **Game Plan**, and **Tendencies**; removed **`SignOutButton`** from Film. **`lib/authErrors.ts`**, **`lib/passwordValidation.ts`**, **`AuthProvider`** maps all errors including **Google** and **`signOut`**. **`DELETE /api/account`** + **`lib/supabase/admin.ts`** delete **`game_sessions`**, **`play_sheets`**, **`user_profiles`** then **`auth.admin.deleteUser`**. **`globals.css`**: **`app-page-title`** uses **`leading-none`**. **`LoginForm`** / **`ResetPasswordForm`** use shared validation and show/hide.

**Why:** Central account/session UX, consistent password and friendly auth errors, safe account teardown with service role.

**Status after this push:** `app/settings/`, `app/api/account/route.ts`, `lib/supabase/admin.ts`, `lib/authErrors.ts`, `lib/passwordValidation.ts`, `components/shared/AppTopBar.tsx`, `components/shared/PasswordInput.tsx`, `components/providers/AuthProvider.tsx`, `app/login/LoginForm.tsx`, `app/reset-password/ResetPasswordForm.tsx`, `app/film/page.tsx`, `components/playbook/PlaybookHome.tsx`, `components/tendencies/TendenciesHome.tsx`, `app/globals.css`, deleted `SignOutButton.tsx`, repo-root **`CHANGELOG.md`**, this file.

---

## 2026-04-23 (Database — Row Level Security on user-owned tables)

**What:** Migration **`20260423110000_user_facing_rls.sql`** enables RLS and **`Owner access`** policies on **`user_profiles`**, **`game_sessions`**, **`drives`**, **`logged_plays`**, **`play_sheets`**, **`play_sheet_scenarios`**, **`play_sheet_plays`**, and **`dismissed_suggestions`** for **`authenticated`** with **`USING` / `WITH CHECK`** aligned: child tables require parent rows owned by **`auth.uid()`** (including drive vs session alignment on **`logged_plays`** and **`play_sheet_id`** ownership on **`game_sessions`** **`WITH CHECK`**). Public read-only **`SELECT`** policies for **`cfb26_plays`**, **`team_offensive_playbooks`**, **`team_defensive_schemes`**, and **`scheme_play_weights`**. **`supabase/schema.sql`** updated for the same RLS definitions.

**Why:** DB-level enforcement for launch security; **`SELECT`** / **`DELETE`** cannot expose inconsistent child rows that only matched **`user_id`**.

**Status after this push:** `supabase/migrations/20260423110000_user_facing_rls.sql`, `supabase/schema.sql`, repo-root **`CHANGELOG.md`**, this file.

---

## 2026-04-23 (Auth — Supabase Google + email, proxy session, safe `next`, user ownership)

**What:** **`@supabase/ssr`** with **`lib/supabase/client.ts`**, **`lib/supabase/server.ts`**, **`lib/supabase/proxy.ts`**, and root **`proxy.ts`** for session refresh and unauthenticated redirects to **`/login`** with **`next`** holding **pathname + search** only (no stray query on **`/login`**). Unauthenticated **`/api/*`** returns **`401`** JSON instead of an HTML login redirect so API consumers keep a stable error shape. **`AuthProvider`** / **`useAuth`**, **`/login`**, **`/auth/callback`**, **`/auth/confirm`**, **`/reset-password`**, Google OAuth + email flows, friendly signup-disabled copy, **`SignOutButton`** only navigates after successful sign-out, **`BottomTabNav`** hidden on auth routes. **`next`** validation rejects **`//`** in login, Google redirect, proxy, and callback. Failed OAuth callback preserves **`next`** on **`/login`**. Film / tendencies / playbook clients use session-aware browser client where needed. Migration **`20260423100000_add_user_id_ownership.sql`** + **`schema.sql`** add **`user_id`** ownership; API routes updated for scoped access (including nested playbook reads and import paths). **`app/film/page.tsx`**: list scoped by user; drive counts from owned **`drives`**; top **New game** card only when the user has games. **`app/film/[gameId]/page.tsx`**: **`res.ok`** on initial loads, **Game not found** fallback, **`loadError`** reset on **`gameId`** change, drives via **`POST /api/games/[id]/drives`**, safe **`refresh()`**. **`PlaybookHome`** / **`TendenciesHome`**: empty-state CTA trim (no header create sheet / no CSV import when empty). **`hooks/usePlaySuggestions.ts`**: suggestions from **`GET /api/games/[id]/drives`**, not direct **`logged_plays`**. **`.env.example`** and **`package.json`** for site URL docs and **`@supabase/ssr`**.

**Why:** Production auth, correct post-login return including query-heavy deep links, no open redirects, and data scoped to the signed-in user.

**Status after this push:** `proxy.ts`, `lib/supabase/*`, `app/login/*`, `app/auth/*`, `app/reset-password/*`, `components/providers/AuthProvider.tsx`, `AppProviders.tsx`, `SignOutButton.tsx`, `BottomTabNav.tsx`, affected `app/api/**`, `supabase/migrations/20260423100000_add_user_id_ownership.sql`, `supabase/schema.sql`, `app/film/page.tsx`, `app/film/[gameId]/page.tsx`, `hooks/usePlaySuggestions.ts`, `components/playbook/PlaybookHome.tsx`, `components/tendencies/TendenciesHome.tsx`, film/tendencies/playbook client updates, `.env.example`, `package.json`, `package-lock.json`, repo-root **`CHANGELOG.md`** and this file.

---

## 2026-04-22 (Film & Game Plan — mobile scores, drive-ended guard, formation_type grouping, scenario labels)

**What:** Film **new game**, **edit game details**, and **import save** keep score inputs as digit strings and parse to integers on submit. **`DriveSetupForm`** uses text + **`inputMode="numeric"`** for score, down, and distance with clamped parse on submit. **`YardageSheet`** ending yard uses text + digit filter. Game log drive cards hide **Add Play** when the drive is no longer **`ACTIVE`** / **`NO_PLAYS`**. **`useFormationGroups`** groups the Play Browser by **`formation_type`** from **`GET /api/cfb26-plays?list=all`** via **`resolveFormationSection`**, with more **`deriveFormationGroup`** fallbacks and **`sortFormationTypes`**. **`scenarioDisplayLabel`** in **`playbookUtils`** shows yard bands on **`PlaybookEditor`**, **`SituationList`**, and **`AddPlayDrawer`**. **`PlaybookEditor`** closes the add drawer on situation change and posts new plays using **`activeBlock.id`**.

**Why:** Better mobile numeric editing and **clear-and-type** behavior aligned with **`DECISIONS.md`** (avoid `Number("")` / per-keystroke default coercion while editing, same string-buffer pattern as **`DriveInlineScores`** and drive-setup starting yard). Also: avoid logging on finished drives; catalog-aligned formation sections; clearer situation copy; reliable scenario targeting when adding plays.

**Status after this push:** `app/film/[gameId]/page.tsx`, `app/film/import/save/page.tsx`, `app/film/new/page.tsx`, `components/film/DriveSetupForm.tsx`, `EditGameDetailsModal.tsx`, `YardageSheet.tsx`, `components/playbook/AddPlayDrawer.tsx`, `PlaybookEditor.tsx`, `SituationList.tsx`, `hooks/useFormationGroups.ts`, `lib/playbook.ts`, `lib/playbookUtils.ts`, both changelogs.

---

## 2026-04-22 (Game Plan — new play sheet opens as modal)

**What:** **`components/playbook/PlaybookHome.tsx`** opens **`CreatePlaybookModal`** with **`variant="modal"`** from **Create play sheet** buttons; renders the modal alongside **loading** and **error** UI so **`?create=1`** works before **`GET /api/playbook`** finishes. **`app/playbook/page.tsx`** awaits **`searchParams`** and passes **`initialCreateOpen`** when **`create=1`**; **`app/playbook/new/page.tsx`** **`redirect("/playbook?create=1")`**. **`CreatePlaybookModal.tsx`** resets step/name/CFB26 selection whenever the modal opens; mobile modal shell is **full height** without inner scroll; desktop uses **`sm:overflow-visible`** so the CFB26 combobox list is not clipped.

**Why:** New play sheet creation should stay in Game Plan context like other overlays, not as a separate route.

**Status after this push:** `PlaybookHome.tsx`, `CreatePlaybookModal.tsx`, `app/playbook/page.tsx`, `app/playbook/new/page.tsx`, repo-root **`CHANGELOG.md`**.

---

## 2026-04-22 (Tendencies — portaled filter dropdowns + formation column truncation)

**What:** Added **`hooks/usePortalDropdown.ts`** (fixed menu position from trigger, capture-phase outside mousedown, close on scroll / Escape / resize). **`components/tendencies/TendenciesFilters.tsx`** and **`PlaybookFilter.tsx`** render listbox panels with **`createPortal`** to **`document.body`** at **`z-[70]`** so menus sit above formation content inside animated tab panels. **`formationAggTableColumns.tsx`** wraps formation text in **`block max-w-[10rem] truncate`** to cap table width without forcing **`equalColumns`** on **`GameFormationTable`**. Repo-root **`DECISIONS.md`** logs the Tendencies-only portal decision.

**Why:** **`.tab-content`** fade creates a stacking context that trapped inline absolutely positioned dropdowns; long formation names inflated horizontal scroll when truncation had no width constraint.

**Status after this push:** `usePortalDropdown.ts`, `TendenciesFilters.tsx`, `PlaybookFilter.tsx`, `formationAggTableColumns.tsx`, `DECISIONS.md`, both changelogs.

---

## 2026-04-22 (Game Plan — suggestions only from games linked to this sheet)

**What:** **`GET /api/playbook/[id]/plays`** now resolves eligible **`game_sessions`** with **`play_sheet_id` = the current play sheet** only (no **`my_playbook` / `offensive_playbook`** name match). Logged stats and **`buildSuggestions`** inputs therefore come only from games explicitly bound to that sheet; empty suggestions when no linked sessions. **`PlaybookEditor.tsx`** **`updateSheet`** success now invalidates **`["playbook-scenario", sheetId]`** so scenario payloads (including suggestions) refetch after editing the sheet instead of staying stale for **`STALE_SCENARIO_MS`**. Removed unused **`playbookIlikeExactPattern`** import from the plays route.

**Why:** Suggestions could appear from logged plays tied to other sheets or unlinked legacy games sharing the same catalog playbook string, which undermined trust in the coaching loop; sheet edits could leave cached suggestions from the prior configuration.

**Status after this push:** `app/api/playbook/[id]/plays/route.ts`, `components/playbook/PlaybookEditor.tsx`.

---

## 2026-04-22 (Game Plan — Opening Script suggestions + full-sheet replace from suggestions)

**What:** `lib/playbookUtils.ts` adds **`loggedPlayScenarioLabels`** / **`loggedPlayScenarioLabelsForSuggestions`** so Game Plan tabs match film **`logged_plays.scenario`** strings (including alias and sparse-tab pools). **`app/api/playbook/[id]/plays/route.ts`** filters logged rows by those labels, scopes them to **`game_sessions`** whose **`my_playbook` / `offensive_playbook`** matches the sheet’s CFB26 book (empty suggestions if none), keeps **scenario** / **formation** stats on the exact-tab slice, and passes **`buildSuggestions`** the widened aggregate plus exact **`byCombo`** so each suggestion shows **exact-only** stats when the combo exists in that tab, **pooled-only** stats with **`pooled`** only when it does not, with success-first ranking from the same displayed numbers. **`PlaySuggestions.tsx`** shows **similar situations** only for pooled-only rows. **`DECISIONS.md`** documents scenario pools and logged-only suggestions. **Earlier same day:** Opening Script maps to **`1st Down`** logged rows; **`PlaybookEditor.tsx`** replace-from-suggestions flow, **`hs-overlay`** modal polish, swap pending/duplicate handling as shipped.

**Why:** Opening Script and other tabs had empty or misleading suggestions (label mismatch, sparse data, blended exact+pooled stats, or unrelated-session data); coaches need honest counts and clear disclosure when evidence comes from related situations only.

**Status after this push:** `lib/playbookUtils.ts`, `lib/loggedPlayStats.ts`, `app/api/playbook/[id]/plays/route.ts`, `components/playbook/PlaySuggestions.tsx`, repo-root **`DECISIONS.md`**; plus **`PlaybookEditor.tsx`** and replace-modal behavior from the same-day Game Plan entry above.

---

## 2026-04-22 (Tendencies — play type bar `rx` tweak)

**What:** `components/tendencies/PlayTypeDistribution.tsx` — progress bar `<rect>` corner radius **`rx` 4 → 2** for slightly squarer ends at small segment widths.

**Why:** Minor UI polish.

**Status after this push:** `PlayTypeDistribution.tsx`.

---

## 2026-04-21 (drive create `is_inches` fix + seed playbook expansion)

**What:** `app/api/games/[id]/drives/route.ts` now persists `is_inches` when payloads send either boolean `true` or string `"true"`, preventing loss of inch distance state on drive creation. Added new seed files under `lib/seed/playbooks/` for Auburn, Colorado, Colorado State, Indiana, Ohio, Oregon State, Texas Tech, and Western Kentucky. `scripts/seed-playbooks.ts` now preloads and validates all team seeds before DB writes, and fails fast on duplicate canonical `(formation, play_name)` rows per slug.

**Why:** Inch-based distance values could be silently dropped during drive inserts, and seeding needed stronger safety checks so invalid team files do not partially write before validation errors surface.

**Status after this push:** Drive creation keeps `is_inches` fidelity from client payloads, and seed runs stop early with explicit team-scoped duplicate/validation errors before touching playbook tables.

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
