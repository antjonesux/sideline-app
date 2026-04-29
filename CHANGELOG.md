# Changelog

All notable changes to **The Sideline** (CFB play-calling / film logging assistant) are recorded here. The deployable Next.js app lives in `sideline/`.

---

## 2026-04-29 — Primary buttons: normal case; bottom nav icons (lucide)

### What

- [`sideline/components/ui/button.tsx`](sideline/components/ui/button.tsx): Removed Tailwind **`uppercase`** from the **`default`** (primary) variant and from **`size.lg`** so labels render in natural casing without changing font weight, tracking, colors, padding, or radius.
- [`sideline/components/shared/BottomTabNav.tsx`](sideline/components/shared/BottomTabNav.tsx): Replaced inline tab SVGs with **`lucide-react`** — **Film Room** **`Video`**, **Game Plan** **`ClipboardList`**, **Tendencies** **`ChartNoAxesCombined`** — same **`h-5 w-5`**, labels, **`href`s**, active styling, **`z-40`**, and marketing/onboarding chrome behavior unchanged.

### Why

- Uppercase primary CTAs read harsh for a coaching product; nav icons should read at a glance as film, call sheet, and analytics without adding a second icon library.

### Status after this push

- `npm run build` from `sideline/` passes.

---

## 2026-04-29 — Tendencies: play-type distribution accuracy (Screen, PA, Option, catalog misses)

### What

- [`sideline/app/api/tendencies/predictability/route.ts`](sideline/app/api/tendencies/predictability/route.ts): Play-type distribution counts **every** in-scope logged play (not only catalog-matched rows); percentage denominator is total plays; **`meta.classified_play_count`** matches that denominator for client cards. Server log labels distinguish **catalog-matched** vs **catalog-unmatched**.
- [`sideline/lib/tendenciesServer.ts`](sideline/lib/tendenciesServer.ts): **`attachPlayTypes`** prefers **`deriveCfbPlayTypeFromName`** over a catalog **`cfb26_plays.play_type`** hit when the derived raw is **Screen**, **Play Action**, **RPO** (`rpo_read`), or **Option** (`option_qb_run`), so generic sheet labels (e.g. quick pass) do not hide those tendency buckets; existing **`shouldOverrideCfbPassLabelToRun`** still runs after.
- [`sideline/lib/tendenciesPlayType.ts`](sideline/lib/tendenciesPlayType.ts): **`derivedRawOverridesCatalogForTendencies`** helper; **`deriveCfbPlayTypeFromName`** extended for **`play action`** text, **`PA`** token patterns (including **`MTN PA …`**), and option-family phrases (**speed / triple / load option**, **invert veer**).
- [`sideline/lib/playbook.ts`](sideline/lib/playbook.ts): **`nameHasExplicitPassOrRpoSignal`** includes **`screen`**, **`play action`**, and token **`PA`** so numbered-personnel pass-family overrides do not misclassify screens and play-action calls.
- [`sideline/lib/playTypeResolution.ts`](sideline/lib/playTypeResolution.ts): Header comment notes Tendencies may prefer name-derived Screen / PA / RPO / Option on catalog hits.
- [`sideline/components/tendencies/AmIPredictable.tsx`](sideline/components/tendencies/AmIPredictable.tsx): Comment aligned with API denominator (all in-scope plays).

### Why

- Coaches saw **Other** or wrong buckets for screens and play action, **0% play action** when names were right but the catalog was generic or unmatched, and dropped rows when the map missed; historical rows fix on refresh because tendencies aggregation does not depend on persisting granular type on **`logged_plays`** for this path.

### Status after this push

- `npm run build` from `sideline/` passes.

---

## 2026-04-29 — Landing onboarding carousel: image track vs copy crossfade + a11y

### What

- [`sideline/components/landing/OnboardingCarousel.tsx`](sideline/components/landing/OnboardingCarousel.tsx): Horizontally slides **images only** inside the rounded mockup panel; headline and supporting copy **crossfade in place** via `useCrossfadeIndex`. **`prefers-reduced-motion: reduce`** snaps copy (no fade timer, `0ms` opacity transition) and keeps existing instant slide jumps for the image track when motion is reduced. Restores **`line-clamp-4`** on supporting text for small-viewport layout stability. **`aria-live`** announcement uses **`displayedIndex`** so screen reader updates align with the visible headline after crossfade.

### Why

- Keeps marketing onboarding readable when image and copy advance together; avoids motion/accessibility mismatch between slides and text; prevents long copy from crowding CTAs on short screens.

### Status after this push

- `npm run build` from `sideline/` passes.

---

## 2026-04-28 — Marketing landing (`/landing`), unauth entry via `next`, BUILD_CONTRACT alignment

### What

- [`sideline/app/landing/`](sideline/app/landing/), [`sideline/components/landing/`](sideline/components/landing/), [`sideline/lib/landing/`](sideline/lib/landing/), [`sideline/lib/navigation/`](sideline/lib/navigation/), [`sideline/public/onboarding/`](sideline/public/onboarding/): Welcome carousel, CTAs, and assets; shared helpers for landing ↔ login URLs with **`next`** preservation.
- [`sideline/proxy.ts`](sideline/proxy.ts), [`sideline/app/page.tsx`](sideline/app/page.tsx), auth/settings/film touchpoints: Unauthenticated users land on **`/landing`** (with **`next`** where applicable); signed-in users hitting **`/landing`** redirect to **`next`** or **`/film`**; **`/signup`** redirects to **`/login?register=1`**.
- [`sideline/components/shared/BottomTabNav.tsx`](sideline/components/shared/BottomTabNav.tsx), [`sideline/app/globals.css`](sideline/app/globals.css): Marketing chrome hides bottom tabs and adjusts **`main`** padding so full-height landing does not leave a tab-bar gap.
- [`sideline/app/layout.tsx`](sideline/app/layout.tsx), [`sideline/app/login/LoginForm.tsx`](sideline/app/login/LoginForm.tsx): Tagline **“Study your game. Call it smarter.”** and title treatment aligned with landing; root metadata description updated.
- [`BUILD_CONTRACT.md`](BUILD_CONTRACT.md): Product intent, unauth routing, marketing padding exception, and repo map updated to match shipped behavior.

### Why

- Coaching-first marketing funnel before sign-in; **`next`** keeps deep links and settings-driven sign-out flows coherent; contract doc no longer contradicted **`/`** → **`/login`** when code shipped **`/landing`**.

### Status after this push

- `npm run build` from `sideline/` passes.

---

## 2026-04-28 — Game Plan Add Play playbook-source parity fix (Film-aligned) + non-silent missing state

### What

- [`sideline/components/playbook/AddPlayDrawer.tsx`](sideline/components/playbook/AddPlayDrawer.tsx): Uses `PlayBrowser` with `presentation="inline"` inside the Add Play modal shell so desktop/tablet layouts render the formations/plays browser as a flex child instead of an absolute overlay layer.
- [`sideline/components/playbook/PlaybookEditor.tsx`](sideline/components/playbook/PlaybookEditor.tsx): Normalizes the Game Plan Add Play catalog source to prefer `sheet.cfb26_playbook`, map case-insensitively to known CFB26 options when available, and safely fall back to legacy `sheet.playbook` when setup options are unavailable (instead of hard-empty blocking).
- [`sideline/components/film/PlayBrowser.tsx`](sideline/components/film/PlayBrowser.tsx): Adds an explicit formations-step empty state when no usable playbook value is passed, so Add Play no longer appears blank.

### Why

- Desktop/tablet Add Play used the overlay presentation path in a bounded modal container, which could hide/clamp browser content at non-mobile breakpoints. Inline presentation preserves the existing mobile UX while restoring visible, scrollable browser content on larger layouts.
- Film logger passed a canonical catalog playbook into `PlayBrowser`, while Game Plan could pass a legacy/non-canonical value or be over-blocked by option-list availability. This mismatch caused Game Plan Add Play to render no formations/plays even though Film worked.

### Status after this push

- `npm run build` from `sideline/` passes.

---

## 2026-04-28 — Game Plan Add Play production catalog fix (version-case mismatch + explicit browser states)

### What

- [`sideline/app/api/cfb26-plays/route.ts`](sideline/app/api/cfb26-plays/route.ts): Replaced strict `game_version` equality checks with case-insensitive matching (`.ilike("game_version", CFB_CATALOG_GAME_VERSION)`) across list/search/formation queries so production catalog rows load even when `cfb26_plays.game_version` casing is inconsistent.
- [`sideline/hooks/useFormationGroups.ts`](sideline/hooks/useFormationGroups.ts): Exposes catalog query state to callers with `error` and `hasAttemptedLoad`.
- [`sideline/components/film/PlayBrowser.tsx`](sideline/components/film/PlayBrowser.tsx): Adds explicit formation-level error and empty states instead of silently rendering an empty list; copy is shared-surface safe for both Film and Game Plan flows.

### Why

- Production had mixed catalog `game_version` casing, which caused Game Plan Add Play to show no formations/plays for affected playbooks despite valid rows. The browser also hid fetch failures as empty results.

### Status after this push

- `npm run build` from `sideline/` passes.

---

## 2026-04-27 — Film Play Logger: Browse / Situational / My Sheet tabs, inline PlayBrowser

### What

- [`sideline/components/film/PlayBrowser.tsx`](sideline/components/film/PlayBrowser.tsx): Optional **`presentation`** (`overlay` default, **`inline`** for embedding): inline mode skips browser **`history`** back-to-close, drops the full-bleed overlay shell, and hides the top-level **Back** control.
- [`sideline/components/film/PlayLoggerV2.tsx`](sideline/components/film/PlayLoggerV2.tsx): Replaces the browse CTA + full-screen browser with **shadcn `Tabs`** — **Browse** (inline formation browser), **Situational** (“You’ve been calling…” + suggestions), **My Sheet** when a sheet is linked (YOUR CALLS list + empty-state copy). Tab triggers mirror the Film game detail tab styling.

### Why

- One less overlay for common browse; clearer split between situation engine picks and sheet-based calls; visual parity with Drive Summary / Tendencies tabs.

### Status after this push

- `npm run build` from `sideline/` passes.

---

## 2026-04-27 — Film logger QA: cache, tendencies, end-game Dialog, perf cancel

### What

- Film game detail **`app/film/[gameId]/page.tsx`**: shared TanStack cache for catalog + sheet scenario (`lib/filmLoggerQueryKeys.ts`, `lib/filmLoggerCatalogFetch.ts`); prefetch; `refresh()` invalidates **`film-logger`** queries; final score confirmation uses **shadcn `Dialog`** (with optional **`overlayClassName`** on **`components/ui/dialog.tsx`**) instead of a hand-rolled overlay; **`useScrollLock`** applies only to the legacy full-screen logger; **Resume Game** / ended-state behavior unchanged in product terms.
- **`hooks/usePlaySuggestions.ts`**: **`endCriticalFlow(..., "cancelled")`** when the logger flow id changes or the hook unmounts before ok/error/skipped.
- **`lib/filmLoggerCallingSuggestions.ts`**: situation-weighted “You’ve been calling…” (from prior session work).
- **`coachCopy.ts`**: end-game strings; **`FILM_END_GAME_CONFIRM_CTA`** title case.

### Why

- Addresses full-game logging QA: faster repeat opens, tendency-weighted suggestions, score-at-end, clearer ended game, BUILD_CONTRACT alignment (Dialog on touched end-game surface, React Query invalidation, perf instrumentation parity).

### Status after this push

- `npm run build` from `sideline/` passes.

---

## 2026-04-27 — Film: hide CSV import entry point on game detail

### What

- [`sideline/app/film/[gameId]/page.tsx`](sideline/app/film/[gameId]/page.tsx): Removed the **Upload CSV** link from the secondary actions row (**Add Drive** / **End Game** unchanged). No changes to [`sideline/app/film/import/`](sideline/app/film/import/), [`sideline/app/api/import/`](sideline/app/api/import/), or [`sideline/components/import/`](sideline/components/import/).

### Why

- Keeps the game-detail surface focused on live logging before user feedback confirms batch CSV import; the import flow stays in the codebase for a future restoration pass.

### Status after this push

- `npm run build` from `sideline/` passes.

---

## 2026-04-27 — Coach-facing copy (P0 auth/team load, shared errors, selective “call” wording)

### What

- [`sideline/lib/coachCopy.ts`](sideline/lib/coachCopy.ts): Stronger **`COULDNT_LOAD`**; new **`COULDNT_LOAD_TEAM_LIST`** and **`AUTH_COULDNT_COMPLETE`**; **`ONBOARDING_START_LOGS`** aligned with call logging.
- [`sideline/lib/authErrors.ts`](sideline/lib/authErrors.ts): **`mapAuthError`** catch-all returns shared coach-safe copy (no raw Supabase messages).
- [`sideline/components/shared/HomeOnboardingGate.tsx`](sideline/components/shared/HomeOnboardingGate.tsx): Playbook list failures use **`COULDNT_LOAD`**.
- [`sideline/app/film/new/page.tsx`](sideline/app/film/new/page.tsx), [`sideline/app/film/import/save/page.tsx`](sideline/app/film/import/save/page.tsx), [`sideline/components/film/EditGameDetailsModal.tsx`](sideline/components/film/EditGameDetailsModal.tsx): Team catalog errors use **`COULDNT_LOAD_TEAM_LIST`** only.
- [`sideline/app/film/[gameId]/page.tsx`](sideline/app/film/[gameId]/page.tsx): Drive CTA **“Log a call”**.
- Film / import / Game Plan / Tendencies: selective terminology and empty-state copy in [`FilmGameTendenciesBody.tsx`](sideline/components/film/FilmGameTendenciesBody.tsx), [`PlayLogFeed.tsx`](sideline/components/film/play-logger/PlayLogFeed.tsx), [`ImportConfirmation.tsx`](sideline/components/import/ImportConfirmation.tsx), [`ImportPreview.tsx`](sideline/components/import/ImportPreview.tsx), [`PlaybookCard.tsx`](sideline/components/playbook/PlaybookCard.tsx), [`SituationList.tsx`](sideline/components/playbook/SituationList.tsx), [`PlaybookEditor.tsx`](sideline/components/playbook/PlaybookEditor.tsx), [`CreatePlaybookModal.tsx`](sideline/components/playbook/CreatePlaybookModal.tsx), [`AddPlayDrawer.tsx`](sideline/components/playbook/AddPlayDrawer.tsx), [`WhatsWorking.tsx`](sideline/components/tendencies/WhatsWorking.tsx).

### Why

- Removes vendor and raw auth error text from the coach UI, centralizes load/auth fallbacks in **`coachCopy`**, and aligns logger and sheet language with **calls** where it reflects coach actions.

### Status after this push

- `npm run build` from `sideline/` passes.

---

## 2026-04-27 — Film: drive-end logger close, score prompt, punt/FG logging, play sheet exclusions

### What

- [`sideline/components/film/PlayLoggerV2.tsx`](sideline/components/film/PlayLoggerV2.tsx): **Special teams** row (**Punt** / **Field goal**) opens the existing yardage flow with synthetic catalog rows; after save, parent is notified when the possession ended (`possessionEndedFromSnapAndTag`).
- [`sideline/app/film/[gameId]/page.tsx`](sideline/app/film/[gameId]/page.tsx): closes Play Logger on possession end, shows **Update score** modal reusing [`DriveInlineScores`](sideline/components/film/DriveInlineScores.tsx); scroll lock includes the score prompt; guided counts use shared coach-call rules.
- [`sideline/lib/filmPlayCounting.ts`](sideline/lib/filmPlayCounting.ts): `isCoachCallPlay` excludes ST-only field-goal rows; `isExcludedFromPlaySheetPlay` for exact **punt** / **field goal** play names.
- [`sideline/components/film/PlayBrowser.tsx`](sideline/components/film/PlayBrowser.tsx): optional `excludePlaySheetSpecialTeams` for search and formation play lists.
- [`sideline/components/playbook/AddPlayDrawer.tsx`](sideline/components/playbook/AddPlayDrawer.tsx): passes the filter so Game Plan add-play cannot select those catalog entries.

### Why

- Completed drives should close the logger and offer an immediate, user-confirmed score update; punt and field goal belong in Film logging but not on offensive play sheets.

### Status after this push

- `npm run build` from `sideline/` passes.

---

## 2026-04-27 — Tendencies: tab strip to filters spacing (Film game detail parity)

### What

- [`sideline/components/tendencies/TendenciesHome.tsx`](sideline/components/tendencies/TendenciesHome.tsx): wrap `TabsContent` for **What's Working** / **Am I Predictable?** in `<div className="pt-3">` so the gap below the top tabs matches the pattern used under the game-detail tab strip on [`sideline/app/film/[gameId]/page.tsx`](sideline/app/film/[gameId]/page.tsx).

### Why

- Global Tendencies felt visually tight against the filters; Film already establishes `pt-3` below `TabsList`—reusing it keeps rhythm consistent without new spacing rules.

### Status after this push

- `npm run build` from `sideline/` passes.

---

## 2026-04-27 — Modal and drawer mobile QA (dropdown focus, flush-bottom radius)

### What

- [`sideline/components/film/EditGameDetailsModal.tsx`](sideline/components/film/EditGameDetailsModal.tsx) and [`sideline/components/playbook/CreatePlaybookModal.tsx`](sideline/components/playbook/CreatePlaybookModal.tsx): `DialogContent` `onOpenAutoFocus` now prevents the default first-field focus, then focuses the visible dialog title (`tabIndex={-1}`) so the **Your Team** / CFB26 combobox is not the initial focus target.
- [`sideline/components/film/TeamCombobox.tsx`](sideline/components/film/TeamCombobox.tsx): when `openOnFocus={false}`, `onFocus` calls `setOpen(false)` so the list stays closed on programmatic focus and stale open state is cleared.
- [`sideline/components/playbook/CreatePlaybookModal.tsx`](sideline/components/playbook/CreatePlaybookModal.tsx): `openOnFocus={false}` on the CFB26 playbook combobox; mobile `DialogContent` uses explicit `rounded-b-none` (desktop `sm:rounded-lg` unchanged).
- Bottom-aligned mobile shells: `rounded-t-xl rounded-b-none` (and `sm:rounded-xl` / `sm:rounded-lg` where applicable) for [`sideline/components/playbook/AddPlayDrawer.tsx`](sideline/components/playbook/AddPlayDrawer.tsx), Play Logger and Drive setup wrappers in [`sideline/app/film/[gameId]/page.tsx`](sideline/app/film/[gameId]/page.tsx), matching other bottom sheets.

### Why

- Radix Dialog’s default is to move focus to the first tabbable control inside the content, which made the “Your Team” field receive focus and could pair poorly with combobox state; moving initial focus to the title keeps the dropdown closed until an explicit user action and matches the in-game speed UX goal.

### Status after this push

- `npm run build` from `sideline/` passes; no new modal system or dependencies.

---

## 2026-04-27 — Mobile modal sheet polish + CFB26 key casing + formation diagnostics

### What

- Updated shared modal/bottom-sheet surfaces across settings, film, playbook, and destructive confirms to use mobile-first bottom anchoring, safe-area aware action footers, and scroll-safe body containers.
- Added `openOnFocus` support to [`sideline/components/film/TeamCombobox.tsx`](sideline/components/film/TeamCombobox.tsx) and disabled auto-open for setup comboboxes in [`sideline/components/film/EditGameDetailsModal.tsx`](sideline/components/film/EditGameDetailsModal.tsx) so focus does not force dropdown expansion.
- Updated [`sideline/lib/constants.ts`](sideline/lib/constants.ts) so `CFB_CATALOG_GAME_VERSION` matches lowercase `cfb26`.
- Added temporary runtime diagnostics in [`sideline/hooks/useFormationGroups.ts`](sideline/hooks/useFormationGroups.ts) and [`sideline/components/film/PlayBrowser.tsx`](sideline/components/film/PlayBrowser.tsx) to log formation payload/loading state during browser rendering.

### Why

- Coaches using mobile bottom sheets needed consistent sticky headers, body scrolling, and submit/action footers that remain reachable above device safe areas.
- Film setup comboboxes were opening too aggressively on focus transitions.
- Catalog-version key casing needed to align with current lookup usage.
- Additional runtime logging was needed to validate formation grouping behavior during recent empty-browser investigations.

### Status after this push

- Modal surfaces now follow a consistent mobile/desktop pattern, setup combobox focus behavior is calmer, constants align with lowercase CFB26 catalog keys, and temporary diagnostics are in place for formation-browser tracing.

---

## 2026-04-27 — Film logger/browser runtime playbook diagnostics

### What

- Added temporary client-side diagnostics in [`sideline/components/film/PlayLoggerV2.tsx`](sideline/components/film/PlayLoggerV2.tsx) to log the exact `playbook` prop received on mount (including `JSON.stringify(...)` output).
- Added diagnostics in [`sideline/hooks/useFormationGroups.ts`](sideline/hooks/useFormationGroups.ts) to log both the exact incoming `playbook` value and the exact encoded request URL before fetching `/api/cfb26-plays`.

### Why

- Existing games were still showing empty formations/plays even when database rows and direct API requests were confirmed correct, so we needed exact runtime values to validate whether a subtle string mismatch/encoding issue exists on the client path.

### Status after this push

- Diagnosis-only logging is now in place with no logic changes, enabling exact-value capture during the failing flow.

---

## 2026-04-27 — Film logger playbook lookup fallback fix

### What

- Updated [`sideline/app/film/[gameId]/page.tsx`](sideline/app/film/[gameId]/page.tsx) so `PlayLoggerV2` now receives `game.offensive_playbook ?? ""` instead of falling back to `game.my_playbook`.

### Why

- `my_playbook` stores the team label, not the CFB playbook key used by `/api/cfb26-plays`; falling back to it could return 200 with empty `rows` and silently hide formations/plays.

### Status after this push

- Play logger/browser CFB lookup no longer uses the team-name fallback path, and `npm run build` passed.

---

## 2026-04-27 — Seed script constraint-guard false-positive fix

### What

- Updated [`sideline/scripts/seed-playbooks.ts`](sideline/scripts/seed-playbooks.ts) so `assertCfb26UpsertSupported` flags missing conflict-target constraints only for the real Postgres signature (`42P10` / matching message), instead of any error mentioning `ON CONFLICT`.
- Added a temporary probe log to print the raw upsert error object (`PROBE RESULT`) immediately after the probe upsert and before cleanup.

### Why

- The guard was incorrectly failing in environments where the unique constraint already exists, because the prior message match was too broad.

### Status after this push

- Seed safety guard remains intact with narrower detection and extra diagnostics for real-world error-object inspection.

---

## 2026-04-27 — Supabase production migration history reconciliation

### What

- Repaired remote Supabase migration history entries that existed only in production metadata so CLI history checks no longer blocked deploy commands.
- Added baseline migration file [`supabase/migrations/20260427141345_remote_schema.sql`](supabase/migrations/20260427141345_remote_schema.sql) from the reconciliation flow and pushed it to the linked production project.
- Verified `supabase migration list` is conflict-free and ran a full production build from `sideline/`.

### Why

- Production schema was already correct, but migration history metadata drift prevented normal migration operations.

### Status after this push

- Migration history is aligned for ongoing CLI use, one baseline migration is recorded, and `npm run build` passed including TypeScript.

---

## 2026-04-26 — Infrastructure: Vercel + Supabase production env hints

### What

- **Repo root `package.json`:** `engines.node` `>=20` for hosts that read the monorepo root.
- **[`sideline/.env.example`](sideline/.env.example):** notes for production env vars, Vercel, and Supabase Auth redirect allowlists (custom domain vs `*.vercel.app`).

### Why

- Keep production deployment (Vercel + Supabase production project) explicit without changing app architecture.

### Status after this push

- Root [`package.json`](package.json), [`sideline/.env.example`](sideline/.env.example), this file, [`sideline/CHANGELOG.md`](sideline/CHANGELOG.md).

---

## 2026-04-26 — Analytics: product funnel events (game, plays, full game, tendencies, return)

### What

- **[`sideline/lib/productAnalytics.ts`](sideline/lib/productAnalytics.ts):** `emitProductEvent`, `window.__sidelineProductEvents`, **`CustomEvent` `sideline:product`** (same buffer pattern as perf). **[`sideline/lib/filmPlayCounting.ts`](sideline/lib/filmPlayCounting.ts):** coach-call vs total play counts for Film stats alignment. **[`ReturnSessionTracker`](sideline/components/providers/ReturnSessionTracker.tsx)** in **[`AppProviders`](sideline/components/providers/AppProviders.tsx)**.
- Events: **`game_created`**, **`first_play`**, **`ten_plays`**, **`full_game`**, **`tendencies_viewed`**, **`return_session`** at the boundaries described in **`sideline/CHANGELOG.md`**.

### Why

- Launch-plan base measurement for core loop health without a third-party SDK or new APIs.

### Status after this push

- [`sideline/lib/productAnalytics.ts`](sideline/lib/productAnalytics.ts), [`sideline/lib/filmPlayCounting.ts`](sideline/lib/filmPlayCounting.ts), [`sideline/components/providers/ReturnSessionTracker.tsx`](sideline/components/providers/ReturnSessionTracker.tsx), [`sideline/components/providers/AppProviders.tsx`](sideline/components/providers/AppProviders.tsx), [`sideline/app/film/new/page.tsx`](sideline/app/film/new/page.tsx), [`sideline/app/film/import/save/page.tsx`](sideline/app/film/import/save/page.tsx), [`sideline/app/film/[gameId]/page.tsx`](sideline/app/film/[gameId]/page.tsx), [`sideline/components/film/PlayLoggerV2.tsx`](sideline/components/film/PlayLoggerV2.tsx), [`sideline/components/tendencies/TendenciesHome.tsx`](sideline/components/tendencies/TendenciesHome.tsx), both changelogs.

---

## 2026-04-26 — Film: client perf instrumentation for critical flows

### What

- **[`lib/perfInstrumentation.ts`](sideline/lib/perfInstrumentation.ts):** `startCriticalFlow` / `endCriticalFlow` for three Film flows: **`film_game_detail_load`**, **`film_logger_open_with_sheet`**, **`film_submit_to_next_play`**. Emits structured **`CustomEvent` `sideline:perf`**, appends to **`window.__sidelinePerfEvents`**, capped (last **300** events) to avoid unbounded memory.
- **Game detail** [`app/film/[gameId]/page.tsx`](sideline/app/film/[gameId]/page.tsx): times parallel **`GET /api/games/[id]`** + **`/drives`**, ends on **`pageReady`**; **`openForCreate`** starts logger-open flow and **cancels** any prior in-flight id (`superseded_by_new_open`) before starting a new one; passes **`loggerOpenFlowId`** into **`PlayLoggerV2`**.
- **`usePlaySuggestions`:** ends **`film_logger_open_with_sheet`** when sheet fetch completes, fails, is skipped (no sheet / scenario), or effect cleans up.
- **`PlayLoggerV2`** + **`YardageSheet`:** **`film_submit_to_next_play`** from submit tap through POST + **`onRefresh()`**; errors wrapped in **try/catch** so the perf flow always closes on failure.

### Why

- Launch-plan baseline: measure user-perceived Film load, logger+sheet, and submit→ready without adding an analytics platform or changing data architecture.

### Status after this push

- [`sideline/lib/perfInstrumentation.ts`](sideline/lib/perfInstrumentation.ts), [`sideline/app/film/[gameId]/page.tsx`](sideline/app/film/[gameId]/page.tsx), [`sideline/components/film/PlayLoggerV2.tsx`](sideline/components/film/PlayLoggerV2.tsx), [`sideline/components/film/YardageSheet.tsx`](sideline/components/film/YardageSheet.tsx), [`sideline/hooks/usePlaySuggestions.ts`](sideline/hooks/usePlaySuggestions.ts), both changelogs.

---

## 2026-04-26 — DB: composite indexes for game/drive aggregation paths

### What

- **Migration** [`20260426120000_aggregation_path_indexes.sql`](sideline/supabase/migrations/20260426120000_aggregation_path_indexes.sql): **`idx_logged_plays_user_game`** `(user_id, game_session_id)`, **`idx_logged_plays_user_drive`** `(user_id, drive_id)`, **`idx_drives_user_game`** `(user_id, game_session_id)`.
- **[`schema.sql`](sideline/supabase/schema.sql)** updated to match the same `create index if not exists` statements.

### Why

- Align indexes with real authenticated filter patterns (Film, Tendencies, Game Plan stats) and keep migration + snapshot schema in lockstep for deploys.

### Status after this push

- [`sideline/supabase/migrations/20260426120000_aggregation_path_indexes.sql`](sideline/supabase/migrations/20260426120000_aggregation_path_indexes.sql), [`sideline/supabase/schema.sql`](sideline/supabase/schema.sql), both changelogs.

---

## 2026-04-24 — UI: Preline removal, shadcn migration, docs alignment

### What

- **Preline removed** from the Next app (no Preline scripts or components under `sideline/`); **`PrelineScript`** / **`PrelineScriptWrapper`** deleted.
- **shadcn/ui** (Radix) primitives ship as tracked files under **`sideline/components/ui/`** (**`button`**, **`dialog`**, **`dropdown-menu`**, **`select`**, **`tabs`**) and drive dialogs, dropdowns, tabs, selects, and buttons across Film, Game Plan, Tendencies, auth, import, and shared shells.
- **Shared drive kebab** ([`DropdownMenu`](sideline/components/shared/DropdownMenu.tsx)): **`clampMenuBelowSelector`** uses dynamic **`sideOffset`**; scroll/resize updates are **rAF-coalesced** with a **passive** capture-phase scroll listener; Film game detail uses **`data-film-game-dropdown-clamp`** on the Drive Summary / Tendencies **TabsList** and **`[data-film-game-dropdown-clamp]`** on the drive kebab.
- **Docs:** [`BUILD_CONTRACT.md`](BUILD_CONTRACT.md) — authenticated **`/`** (**`HomeOnboardingGate`**, auto **`/film`** only when logged plays exist), **shadcn `Dialog`** vs **Film** legacy full-bleed **fixed** overlays, two kebab patterns. [`DECISIONS.md`](DECISIONS.md) — **2026-04-24** ADR (**by default** / **new and shared surfaces**; **Film** legacy overlays called out in **Impact**).

### Why

- Ship gate for the design-system migration: stable focus, stacking, and a single component path without reintroducing Preline.

### Status after this push

- Broad **`sideline/`** UI and **`package.json`** / lockfile; **`components/ui/*.tsx`** (new); **`BUILD_CONTRACT.md`**, **`DECISIONS.md`**, both changelogs; **`components/shared/DropdownMenu.tsx`**, **`ConfirmDestructiveModal.tsx`**, **`app/layout.tsx`**, **`app/film/[gameId]/page.tsx`**, **`app/globals.css`**.

---

## 2026-04-24 — Playbook: guided onboarding handoff and film game layout

### What

- **Guided first sheet:** [`CreatePlaybookModal`](sideline/components/playbook/CreatePlaybookModal.tsx) accepts **`guidedOnboardingFlow`**; on success can route to **`/playbook/[id]?onboarding=1`**. [`PlaybookHome`](sideline/components/playbook/PlaybookHome.tsx) passes the flag when arriving from home onboarding (**`onboardingFromHome`**). [`PlaybookEditor`](sideline/components/playbook/PlaybookEditor.tsx) and **[`app/playbook/[id]/page.tsx`](sideline/app/playbook/[id]/page.tsx)** handle **`?onboarding=1`** for first-run emphasis. **[`app/playbook/page.tsx`](sideline/app/playbook/page.tsx)** passes search-param context into Game Plan home.
- **Film game shell:** New **[`app/film/[gameId]/layout.tsx`](sideline/app/film/[gameId]/layout.tsx)**; **[`app/film/[gameId]/page.tsx`](sideline/app/film/[gameId]/page.tsx)** and **[`PlayLoggerV2`](sideline/components/film/PlayLoggerV2.tsx)** updates aligned with onboarding → logger handoff.

### Why

- Completes the coaching loop from home onboarding into a concrete play sheet and live logger without dropping navigation or first-run context.

### Status after this push

- **`app/film/[gameId]/layout.tsx`**, **`app/film/[gameId]/page.tsx`**, **`components/film/PlayLoggerV2.tsx`**, **`components/playbook/CreatePlaybookModal.tsx`**, **`PlaybookEditor.tsx`**, **`PlaybookHome.tsx`**, **`app/playbook/page.tsx`**, **`app/playbook/[id]/page.tsx`**, both changelogs.

---

## 2026-04-24 — Home onboarding before first logged play

### What

- **`/`** is **`force-dynamic`**: server **`getUser`**; unauthenticated → **`/login`**; authenticated → **[`HomeOnboardingGate`](sideline/components/shared/HomeOnboardingGate.tsx)** which loads games via **`GET /api/games`**, sums **`play_count`**, and redirects to **`/film`** once any plays exist; otherwise shows stepped onboarding (copy from **`lib/coachCopy.ts`**) and CFB26 playbook picker (**`GET /api/cfb26-playbooks`**).
- **[`BottomTabNav`](sideline/components/shared/BottomTabNav.tsx)** returns **`null`** on **`/`** and toggles **`data-onboarding-chrome`** on **`<html>`** for main bottom padding (pairs with existing **`globals.css`** rule).
- **[`lastGamePrefsStore`](sideline/store/lastGamePrefsStore.ts)** adds **`guidedOnboardingDone`**, **`setGuidedOnboardingDone`**, and a **persist `version` / `migrate`** path (legacy blobs default **`guidedOnboardingDone: true`**).
- **Default post-auth path** is **`/`** instead of **`/film`** in **[`app/auth/callback/route.ts`](sideline/app/auth/callback/route.ts)**, **[`LoginForm`](sideline/app/login/LoginForm.tsx)**, and **[`AuthProvider.signInWithGoogle`](sideline/components/providers/AuthProvider.tsx)** so new coaches hit the gate.

### Why

- Surfaces product value before sending coaches straight to Film; aligns DECISIONS coaching-loop positioning with first-session behavior.

### Status after this push

- **`app/page.tsx`**, **`components/shared/HomeOnboardingGate.tsx`**, **`components/shared/BottomTabNav.tsx`**, **`lib/coachCopy.ts`**, **`store/lastGamePrefsStore.ts`**, **`app/auth/callback/route.ts`**, **`app/login/LoginForm.tsx`**, **`components/providers/AuthProvider.tsx`**, both changelogs.

---

## 2026-04-24 — shadcn/ui toolchain initialization (Tailwind v4)

### What

- **`sideline/components.json`**: **default** style, **slate** `baseColor`, **CSS variables**, **`app/globals.css`**, aliases **`@/components/ui`** and **`@/lib/utils`**.
- **Dependencies:** **`clsx`**, **`tailwind-merge`**, **`shadcn`**, **`tw-animate-css`** (for **`@import "shadcn/tailwind.css"`** and animations). **`components/ui/`** scaffold (**.gitkeep**).
- **[`lib/utils.ts`](sideline/lib/utils.ts):** adds **`cn()`** via **`clsx` / `tailwind-merge`** while preserving **`normalizePlayName`** / **`withNormalizedPlayName`**.
- **[`app/globals.css`](sideline/app/globals.css):** **`@import` / `@theme inline` / `:root` / `.dark`** shadcn theme tokens appended; existing app **`@layer`** utilities preserved (Preline imports removed with the migration).

### Why

- Foundation for migrating shared UI to shadcn without blocking later component installs or token mapping work.

### Status after this push

- **`components.json`**, **`components/ui/.gitkeep`**, **`package.json`**, **`package-lock.json`**, **`lib/utils.ts`**, **`app/globals.css`**, both changelogs.

---

## 2026-04-23 — Settings page, account deletion API, and auth UX consolidation

### What

- **`/settings`**: Server-gated route ([`sideline/app/settings/page.tsx`](sideline/app/settings/page.tsx)) with [`SettingsPageClient`](sideline/app/settings/SettingsPageClient.tsx): grouped account/session rows, single **`activeDrawer`** for email (read-only sheet), password (progressive rules, confirm, **`PasswordInput`** show/hide), sign-out sheet, and delete-account via **`ConfirmDestructiveModal`**; bottom sheets at **`z-[50]`** / **`z-[51]`** below destructive **`z-[60]`**; backdrop dismiss, Escape, and scroll lock on drawer keys.
- **Settings entry**: **`SettingsLink`** in [`AppTopBar.tsx`](sideline/components/shared/AppTopBar.tsx) is rendered inside the **`<h1 class="app-page-title">`** row on **Film Room**, **Game Plan**, and **Tendencies** ([`app/film/page.tsx`](sideline/app/film/page.tsx), [`PlaybookHome.tsx`](sideline/components/playbook/PlaybookHome.tsx), [`TendenciesHome.tsx`](sideline/components/tendencies/TendenciesHome.tsx)) so the gear aligns with the page title; not shown on **`/settings`**, auth routes, or login/reset.
- **Film header**: Removed standalone **[`SignOutButton`](sideline/components/shared/SignOutButton.tsx)** (deleted); sign-out lives in settings.
- **Shared auth/password**: [`lib/authErrors.ts`](sideline/lib/authErrors.ts) **`mapAuthError`**, [`lib/passwordValidation.ts`](sideline/lib/passwordValidation.ts), [`PasswordInput`](sideline/components/shared/PasswordInput.tsx); **[`LoginForm`](sideline/app/login/LoginForm.tsx)** (create-account path) and **[`ResetPasswordForm`](sideline/app/reset-password/ResetPasswordForm.tsx)** use them; **[`AuthProvider`](sideline/components/providers/AuthProvider.tsx)** uses **`mapAuthError`** for all auth errors including **Google OAuth** and **`signOut`**.
- **Account deletion**: **`DELETE /api/account`** ([`app/api/account/route.ts`](sideline/app/api/account/route.ts)) authenticates with the cookie client, deletes user-owned **`game_sessions`**, **`play_sheets`**, **`user_profiles`** via **[`lib/supabase/admin.ts`](sideline/lib/supabase/admin.ts)** (**`SUPABASE_SERVICE_ROLE_KEY`**), then **`auth.admin.deleteUser`**; returns **`503`** when the service role key is missing.
- **Typography**: **`app-page-title`** in [`globals.css`](sideline/app/globals.css) adds **`leading-none`** so display titles and the inline settings control share a tighter line box.

### Why

- One utility surface for account/session actions without a bottom-nav tab; consistent password and auth messaging across login, reset, and settings; server-side account teardown with explicit row deletes before removing the auth user.

### Status after this push

- **`app/settings/*`**, **`app/api/account/route.ts`**, **`lib/supabase/admin.ts`**, **`lib/authErrors.ts`**, **`lib/passwordValidation.ts`**, **`components/shared/AppTopBar.tsx`**, **`components/shared/PasswordInput.tsx`**, **`components/providers/AuthProvider.tsx`**, **`app/login/LoginForm.tsx`**, **`app/reset-password/ResetPasswordForm.tsx`**, **`app/film/page.tsx`**, **`components/playbook/PlaybookHome.tsx`**, **`components/tendencies/TendenciesHome.tsx`**, **`app/globals.css`**, removal of **`SignOutButton.tsx`**, both changelogs.

---

## 2026-04-23 — Database: Row Level Security on user-owned and catalog tables

### What

- **Migration `20260423110000_user_facing_rls.sql`**: Enables RLS on **`user_profiles`**, **`game_sessions`**, **`drives`**, **`logged_plays`**, **`play_sheets`**, **`play_sheet_scenarios`**, **`play_sheet_plays`**, and **`dismissed_suggestions`** with **`FOR ALL`** policies for the **`authenticated`** role scoped to the signed-in user; child rows require a resolvable parent owned by the same user (including **`logged_plays`** drive vs session consistency and **`game_sessions.play_sheet_id`** ownership on insert/update).
- **Catalog / shared reads**: **`cfb26_plays`**, **`team_offensive_playbooks`**, **`team_defensive_schemes`**, and **`scheme_play_weights`** use **`SELECT`** policies with **`using (true)`** so anon reads used by setup and tendencies stay available; writes remain service-role only where applicable.
- **`supabase/schema.sql`**: Greenfield parity with the migration for the RLS block (replaces the prior “RLS disabled” film logging note for **`drives`**, **`logged_plays`**, and **`game_sessions`**).

### Why

- Enforce access at the database layer so authenticated users cannot read or mutate another coach’s rows even if a client bug or crafted request omits app-level filters; inconsistent legacy child rows are not visible on **`SELECT`** / **`DELETE`** when parent checks fail.

### Status after this push

- **`sideline/supabase/migrations/20260423110000_user_facing_rls.sql`**, **`sideline/supabase/schema.sql`**, both changelogs.

---

## 2026-04-23 — Auth: Supabase Google + email, session proxy, safe `next`, per-user ownership

### What

- **Supabase Auth** with **Google OAuth** and **email / password** (sign-in, register, forgot password), **`/login`**, **`/auth/callback`**, **`/auth/confirm`**, and **`/reset-password`** for completing a reset after the email link.
- **`@supabase/ssr`**: **`lib/supabase/client.ts`** (browser), **`lib/supabase/server.ts`** (route handlers / server), **`lib/supabase/proxy.ts`** (middleware session refresh); root **`proxy.ts`** refreshes the session and redirects unauthenticated users to **`/login`** with a single **`next`** param that preserves **pathname + search** without copying the protected page’s query onto **`/login`**.
- **`AuthProvider`** / **`useAuth`** in **`AppProviders`**; **`SignOutButton`** only navigates after successful **`signOut()`**; **`BottomTabNav`** hides on auth routes.
- **Return URL safety**: **`next`** is treated as an in-app path only (rejects protocol-relative **`//`** open redirects) in **`LoginForm`**, **`AuthProvider.signInWithGoogle`**, **`proxy.ts`**, and **`app/auth/callback/route.ts`**. OAuth **`redirectTo`** carries **`next`**; failed code exchange redirects to **`/login`** and keeps **`next`** when it is not the default **`/film`**.
- **Client film / tendencies / playbook code** that needs a persisted session now uses **`createClient()`** from **`lib/supabase/client.ts`** instead of the old non-persistent singleton where applicable.
- **Database**: migration **`20260423100000_add_user_id_ownership.sql`** adds **`user_id`** to user-owned tables with backfill and **`NOT NULL`**; **`supabase/schema.sql`** updated accordingly. **API routes** filter or scope reads/writes by the authenticated user where wired in this change set.
- **`.env.example`**: documents **`NEXT_PUBLIC_SITE_URL`** for Supabase redirect allowlists; **`package.json`** / lockfile include **`@supabase/ssr`**.
- **`proxy.ts`**: Unauthenticated requests to **`/api/*`** return **`401`** JSON (**`{ error: "Unauthorized" }`**) instead of redirecting to **`/login`**, so fetch callers keep a JSON error contract when the session is missing or expired.
- **Film Room list** (**`app/film/page.tsx`**): Games and aggregates are scoped by **`user_id`**; **drive counts** use owned **`drives`** rows (not inferred from **`logged_plays.drive_id`**) so started-but-empty drives still count. The top **New game** card shows only when the user has at least one game (empty state stays minimal).
- **Film game log** (**`app/film/[gameId]/page.tsx`**): Initial **`GET /api/games/[id]`** and **`GET /api/games/[id]/drives`** require **`res.ok`**; otherwise a **Game not found** fallback renders. **`loadError`** resets when **`gameId`** changes so client navigation recovers after a bad deep link. New drives use **`POST /api/games/[id]/drives`**. **`refresh()`** bails with a toast if the drives fetch fails instead of overwriting state with an error body.
- **Game Plan** (**`components/playbook/PlaybookHome.tsx`**): Header **Create play sheet** shows only when the user already has sheets (empty state has no duplicate top CTA).
- **Tendencies** (**`components/tendencies/TendenciesHome.tsx`**): Empty state drops **Import from CSV**; primary CTA remains **Log your first game**.
- **Play suggestions** (**`hooks/usePlaySuggestions.ts`**): Recent plays load via ownership-scoped **`GET /api/games/[id]/drives`** instead of direct browser reads on **`logged_plays`**.

### Why

- Launch-ready auth and session refresh without losing deep-link query state (e.g. tendencies filters) after login, and without open redirects or confusing post-OAuth landings.

### Status after this push

- **`proxy.ts`**, **`lib/supabase/*`**, **`app/login/*`**, **`app/auth/*`**, **`app/reset-password/*`**, **`components/providers/AuthProvider.tsx`**, **`AppProviders.tsx`**, **`SignOutButton.tsx`**, **`BottomTabNav.tsx`**, affected **`app/api/**`** routes, **`supabase/migrations/20260423100000_add_user_id_ownership.sql`**, **`supabase/schema.sql`**, **`app/film/page.tsx`**, **`app/film/[gameId]/page.tsx`**, **`hooks/usePlaySuggestions.ts`**, **`components/playbook/PlaybookHome.tsx`**, **`components/tendencies/TendenciesHome.tsx`**, film / tendencies / playbook client touchpoints, **`.env.example`**, **`package.json`**, **`package-lock.json`**, both changelogs.

---

## 2026-04-22 — Film & Game Plan: mobile numeric fields, drive-ended guard, formation sections, scenario labels

### What

- **Film score fields** on **`/film/new`**, **`EditGameDetailsModal`**, and **`/film/import/save`**: store **`my_score`** / **`opponent_score`** as digit strings in component state and parse to non-negative integers only when building the payload so coaches can clear digits without the field snapping to **`0`** mid-edit.
- **`DriveSetupForm`**: score, down, and distance use **`type="text"`** with **`inputMode="numeric"`** and parallel string state; submit parses, strips non-digits, and clamps into valid ranges before calling **`onSubmit`**.
- **`YardageSheet`**: ending yard line uses **`type="text"`** with digit-only **`onChange`** (drops number-input spin styling).
- **`app/film/[gameId]/page.tsx`**: per-drive **Add Play** is shown only while the drive is **`ACTIVE`** or **`NO_PLAYS`**; otherwise shows **Drive ended** so finished drives are not treated as open logging targets.
- **`useFormationGroups`** + **`lib/playbook.ts`**: Play Browser formation sections prefer Supabase **`formation_type`** via **`resolveFormationSection`**, with expanded **`deriveFormationGroup`** string fallbacks and **`sortFormationTypes`** for stable section order.
- **`lib/playbookUtils.ts`**: **`scenarioDisplayLabel`** appends yardage band hints for down-and-distance sheet scenarios; used in **`PlaybookEditor`**, **`SituationList`**, and **`AddPlayDrawer`** headings.
- **`PlaybookEditor`**: closes the add-play drawer when the active situation changes; **`postPlay`** and quick-add-from-suggestions use **`activeBlock?.id`** so adds always target the visible scenario block (with a clear error toast if missing).

### Why

- String-backed numeric fields behave better on mobile and match the Film combobox-style forms elsewhere; editing matches **`DECISIONS.md`** and the existing logger / **`DriveInlineScores`** pattern (parse and clamp on submit, not on every keystroke).
- **`formation_type`** is the catalog-aligned grouping key; heuristic **`deriveFormationGroup`** remains the fallback when the column is empty.
- Coaches need yard thresholds visible next to situation names; add-play flows must not post against a stale scenario id after switching tabs.

### Status after this push

- **`app/film/[gameId]/page.tsx`**, **`app/film/import/save/page.tsx`**, **`app/film/new/page.tsx`**, **`components/film/DriveSetupForm.tsx`**, **`EditGameDetailsModal.tsx`**, **`YardageSheet.tsx`**, **`components/playbook/AddPlayDrawer.tsx`**, **`PlaybookEditor.tsx`**, **`SituationList.tsx`**, **`hooks/useFormationGroups.ts`**, **`lib/playbook.ts`**, **`lib/playbookUtils.ts`**.

---

## 2026-04-22 — Game Plan: new play sheet as a modal (not a separate page)

### What

- **`PlaybookHome`:** **Create play sheet** opens **`CreatePlaybookModal`** with **`variant="modal"`** instead of navigating to **`/playbook/new`**. The modal still mounts during list **loading** and **error** states so **`/playbook?create=1`** (after redirect) is not blocked by the play sheet list query.
- **`app/playbook/page.tsx`:** Reads **`?create=1`** and passes **`initialCreateOpen`** into **`PlaybookHome`**; client clears the query from the address bar with **`history.replaceState`** so the URL stays **`/playbook`**.
- **`app/playbook/new/page.tsx`:** Server **`redirect("/playbook?create=1")`** so bookmarks and old links still land in the create flow.
- **`CreatePlaybookModal`:** On each **modal open**, resets step and draft fields so cancel/reopen does not keep stale data; mobile sheet uses **full viewport height** with no inner scroll; desktop keeps **`sm:overflow-visible`** so **`TeamCombobox`** dropdown is not clipped.

### Why

- Creating a play sheet is a short, focused action; a full page broke the same anchored-in-Game-Plan pattern as other contained flows.

### Status after this push

- Game Plan entry and presentation only; **`CreatePlaybookModal`** page variant remains for any future direct page use.

---

## 2026-04-22 — Tendencies: portaled filter dropdowns + formation column width cap

### What

- **`usePortalDropdown`:** New shared hook in `sideline/hooks/usePortalDropdown.ts` for fixed-position portal menus (capture-phase outside click, scroll / Escape / window resize close).
- **`TendenciesFilters` / `PlaybookFilter`:** Opponent and playbook filter menus render via `createPortal` to `document.body` at `z-[70]` so they escape the `.tab-content` stacking context on `TendenciesHome`.
- **`formationAggTableColumns`:** Formation name cells use `block max-w-[10rem] truncate` so long labels do not blow out horizontal scroll while keeping existing per-column width classes (no `equalColumns` on the Film game formations summary table).

### Why

- Animated tab content trapped absolutely positioned menus; coaches need filters to layer cleanly over formation lists on both Tendencies sub-tabs.
- Equal-width table layout was not needed here and would have distorted narrow numeric and chevron columns.

### Status after this push

- Tendencies filter UX and Film game tendencies formation table readability only; **`DECISIONS.md`** records the scoped portal decision.

---

## 2026-04-22 — Film: YOUR CALLS shows which play sheet it is based on

### What

- **`GET /api/playbook/[id]/plays`** (`slim=1`): response now includes **`sheetName`** from **`play_sheets.name`** (same request that loads sheet plays for the logger).
- **`usePlaySuggestions`:** reads **`sheetName`** from that slim response and exposes it alongside **`sheetCalls`**.
- **`PlayLoggerV2`:** under **YOUR CALLS**, shows **`Based on {sheet name}`** using the same secondary line styling as **You’ve been calling…**.

### Why

- Coaches need to see at a glance that **YOUR CALLS** is the planned sheet, not the same source as historical tendencies.

### Status after this push

- Play Logger copy only; no change to suggestion ranking or sheet play loading behavior.

---

## 2026-04-22 — Game Plan: suggestions gated to linked games + scenario cache on sheet edit

### What

- **`GET /api/playbook/[id]/plays`** scopes logged-play aggregation and suggestions to **`game_sessions.play_sheet_id` = the requested sheet** only. Games that only match the sheet’s CFB26 playbook by name, or have **`play_sheet_id` null**, no longer contribute to that sheet’s Game Plan suggestions or logged-backed stats on this route.
- **`PlaybookEditor`** invalidates **`["playbook-scenario", sheetId]`** after a successful sheet metadata save so suggestions and scenario stats refetch immediately.

### Why

- Suggestions must reflect data earned through this play sheet, not bleed from other sheets or unlinked sessions.
- Editing the bound playbook could leave stale scenario query data until the prior stale window expired.

### Status after this push

- Tighter suggestion eligibility at the API; correct cache refresh after sheet edits.

---

## 2026-04-22 — Game Plan: Opening Script suggestions + replace when sheet is full

### What

- **Suggested plays (follow-up):** `loggedPlayScenarioLabels` / `loggedPlayScenarioLabelsForSuggestions` in `playbookUtils.ts` widen logged scenario matching and pool sparse tabs (for example `4 Minute`, `2 Point`) from defensible related scenarios; **`GET /api/playbook/[id]/plays`** scopes `logged_plays` to **`game_sessions`** whose playbook matches the sheet’s CFB26 book, returns empty suggestions when no sessions match (no silent global fallback), and wires **`buildSuggestions`** with exact **`byCombo`** so each row shows **exact-only** uses/success when that combo exists in the current tab, **pooled** stats only when the combo is pooled-only, and ranking matches displayed stats. **`PlaySuggestions`** appends **similar situations** only for pooled-only rows. **`DECISIONS.md`** records the pool behavior and logged-data-only rule.
- `GET /api/playbook/[id]/plays` maps **Opening Script** to **`logged_plays.scenario = "1st Down"`** for stats and suggested plays, because film logging never writes `"Opening Script"` on logged rows.
- **Playbook editor**: when a situation is at max plays, suggested plays use **Replace a play** and open a modal to pick an existing slot; the choice calls the existing **`swap`** action on `PUT /api/playbook/[id]/plays`.
- **Replace modal polish:** overlay matches shared modal shell (`hs-overlay`, higher z-index, `aria-labelledby` / `aria-modal` / `aria-hidden`), scroll lock while the chooser is open, explicit **Cancel**, backdrop dismiss blocked during an in-flight swap, chooser stays open after a failed swap so the coach can pick another slot, and duplicate swap failures surface the API message when it includes **already exists** (otherwise **`COULDNT_SAVE`**).

### Why

- Sparse or aliased scenarios needed logged-only pooling and playbook-scoped queries so suggestions stay relevant and never blend unrelated sessions; exact-tab stats on suggestion rows must match what the coach sees (no silent pooled inflation).
- Opening Script showed no suggestions even when first-down history supported them (scenario label mismatch).
- Full scenarios (for example Opening Script at 15 plays) could not act on suggestions without a replace path.
- Coaches need the replace flow to feel like other modals (stacking, scroll, dismiss), and they need clear feedback when a replacement would duplicate an existing call.

### Status after this push

- Opening Script can surface suggestions from first-down logged data; full sheets can swap in a suggested play via the modal, with safer modal behavior and clearer duplicate handling.

---

## 2026-04-22 — Tendencies: play type distribution bar corner radius

### What

- **`PlayTypeDistribution.tsx`:** SVG progress bar `<rect>` **`rx`** reduced from **4** to **2** so short segments read as bars rather than pills at narrow widths.

### Why

- Minor visual polish on the play-type breakdown chart.

### Status after this push

- Tendencies play-type distribution component only.

---

## 2026-04-21 — Drive create API inches flag fix + expanded team playbook seeds

### What

- Fixed `POST /api/games/[id]/drives` to correctly persist `is_inches` when clients send either boolean `true` or string `"true"` payloads.
- Expanded seeded playbook coverage by adding team files for Auburn, Colorado, Colorado State, Indiana, Ohio, Oregon State, Texas Tech, and Western Kentucky.
- Hardened `sideline/scripts/seed-playbooks.ts` with a fail-fast validation pass that loads and validates all seeds first, then blocks seeding on canonical duplicate formation/play rows before any database writes.

### Why

- Drive-start inch distance could be dropped on insert despite being provided, and seed imports needed stronger upfront guarantees so partial runs do not write data before structural seed issues are caught.

### Status after this push

- Drive create requests now preserve inch state reliably, and seed execution exits early with clear per-team errors for invalid or duplicate canonical seed rows.

---

## 2026-04-21 — Per-game play sheet binding for Film logger

### What

- Added a nullable `game_sessions.play_sheet_id` foreign key (`on delete set null`) with matching migration and schema mirror, plus `GameSession` type support.
- Extended game create/update APIs to accept optional `play_sheet_id`, validate sheet existence, and enforce playbook-to-sheet compatibility before persisting.
- Added sheet pickers to Film **New Game** and **Edit game details** flows (including a `None` option and no-sheet helper copy), and ensured edit hydration preserves existing selections unless invalid for the selected playbook.
- Removed brittle `is_active` sheet discovery from the logger path: Film game detail now passes `game.play_sheet_id` into `PlayLoggerV2`, and `usePlaySuggestions` uses only that explicit `sheetId`.
- Kept logger hot-path performance work by using the existing `/api/playbook/[id]/plays` route with `slim=1` for scenario sheet calls.

### Why

- `YOUR CALLS` could be missing or wrong because runtime discovery depended on `is_active` sheets and playbook heuristics; coaches need a stable, explicit game-to-plan link at decision time.

### Status after this push

- New/edit game flows can attach a specific Game Plan sheet, logger reads that stable ID, and `YOUR CALLS` no longer depends on implicit active-sheet discovery.

---

## 2026-04-21 — Film game card modal/control fixes, turnover tagging, and delete cascade hardening

### What

- **Game delete API (`/api/games/[id]`)** now performs a defensive manual cascade by deleting `logged_plays` and `drives` before removing the `game_sessions` row, so game removal succeeds even if FK cascade drift exists.
- **Film game card edit flow** was refactored so the kebab menu launches `EditGameDetailsModal` as a controlled modal (separate trigger, explicit open state) rather than nesting a trigger inside a menu item.
- **Edit game details modal** now supports controlled props (`open`, `onOpenChange`, `hideTrigger`, `onOpen`) and renders via `createPortal` at a higher overlay layer to avoid stacking conflicts with navigation and menu chrome.
- **Drive outcome logic** now treats `INTERCEPTION` and `FUMBLE` as turnover tags in the same path as `TURNOVER`, including possession-ended checks and final drive outcome mapping.
- **Play logger result mapping** now preserves explicit `TURNOVER` outcomes (instead of collapsing through `FG_MISS` handling), and the bottom nav z-index was lowered to keep modal overlays on top.

### Why

- Coaches were hitting modal/menu layering issues in game-card actions and inconsistent turnover semantics for drive outcomes; deletion also needed to remain reliable across database environments where cascade constraints may differ.

### Status after this push

- Film game card interactions and edit modal layering are consistent, turnover outcomes are normalized, and game deletion is resilient to FK drift.

---

## 2026-04-21 — Film Drive setup: starting yard line free typing

### What

- **`DriveSetupForm`** keeps the starting yard line in a **string** field so clearing it no longer snaps back to **25** (or clamps mid-edit via `Number("") || 25`). Coaches can empty the box and type **1–50** at their own pace.
- **Start Drive** stays disabled until the yard parses to a valid integer in range; invalid non-empty input shows an amber field border.

### Why

- The previous `type="number"` handler coerced empty input to the default yard, which blocked natural editing.

### Status after this push

- Production build is clean. See `sideline/CHANGELOG.md` for file-level notes (`DriveSetupForm.tsx`).

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
