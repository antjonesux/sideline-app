# Changelog

All notable changes to **The Sideline** (CFB play-calling / film logging assistant) are recorded here. The deployable Next.js app lives in `sideline/`.

---

## 2026-06-28 — Call Sheet: situation cards match Coach View colors and play count

### What

- **[`sideline/components/playbook/CallSheetSituationGrid.tsx`](sideline/components/playbook/CallSheetSituationGrid.tsx):** Builder **Situations** tab cards use **`SITUATION_COLORS`** (tinted fill + accent text) to match Coach View; play count sits on the icon row and shows added plays only (e.g. **3 plays**), not slot cap.

### Why

Situation tiles should read as the same visual system as Coach View; coaches only need to see how many calls are in each bucket, not capacity limits on the grid.

### Status after this push

- `npm run build` from `sideline/` expected to pass.

---

## 2026-06-28 — Call Sheet: consolidate builder + Coach View on sheet editor

### What

- **[`sideline/components/playbook/PlaybookEditor.tsx`](sideline/components/playbook/PlaybookEditor.tsx)**, **[`CallSheetBuilderDashboard.tsx`](sideline/components/playbook/CallSheetBuilderDashboard.tsx)**, **[`CallSheetBuilderSheetHeader.tsx`](sideline/components/playbook/CallSheetBuilderSheetHeader.tsx):** Sheet editor gains **Situations** / **Coach View** tabs (**[`SegmentTabBar`](sideline/components/shared/SegmentTabBar.tsx)** — shared with sign-in); inline back button beside sheet title; **My Situations** subheader on builder dashboard.
- **[`sideline/components/playbook/CallSheetCoachView.tsx`](sideline/components/playbook/CallSheetCoachView.tsx):** Read-only Coach View accordion — full-width situation rows, **`SITUATION_COLORS`** tinted headers, play name + formation row layout; all sections collapsed on tab entry.
- **[`sideline/lib/constants.ts`](sideline/lib/constants.ts):** **`SITUATION_COLORS`** co-located with **`CALL_SHEET_SCENARIOS`**.
- **[`sideline/components/playbook/CallSheetViewerMenu.tsx`](sideline/components/playbook/CallSheetViewerMenu.tsx)**, **[`sideline/lib/coachCopy.ts`](sideline/lib/coachCopy.ts)**, **[`sideline/lib/navigation/playSheetNav.ts`](sideline/lib/navigation/playSheetNav.ts):** Slide-out nav consolidates to single **Call Sheet** item; legacy **`/playbook/view`** redirects to **`/playbook`**.
- **Removed:** standalone viewer tree (**`CallSheetViewer*`**, **`CallSheetViewerFullSheet`**, etc.). QA fixtures updated (**`CallSheetQaViews`**, **`PlaySheetQaEditor`**).

### Why

Coaches build and reference the same call sheet from one screen during prep and game use; separate builder and viewer routes added navigation overhead.

### Status after this push

- `npm run build` from `sideline/` passed.

---

## 2026-06-28 — Call Sheet screenshot QA routes + refreshed Play Sheet baselines

### What

- **[`sideline/app/qa/call-sheet/`](sideline/app/qa/call-sheet/)**, **[`sideline/components/qa/call-sheet/`](sideline/components/qa/call-sheet/)**: Sessionless preview routes for call sheet viewer home, situation, empty, menu, and sheet switcher — production **`notFound()`** via segment layout.
- **[`sideline/playwright/call-sheet-screenshots.spec.ts`](sideline/playwright/call-sheet-screenshots.spec.ts)**, **`qa-screenshots/call-sheet/`**: Playwright capture for five call sheet states; **`npm run screenshots:call-sheet`** and **`npm run screenshots:flows`** in **`package.json`**.
- **[`sideline/proxy.ts`](sideline/proxy.ts):** **`/qa/call-sheet`** prefix is public (matches onboarding / play-sheet QA).
- **`qa-screenshots/play-sheet/`**: Baseline PNGs refreshed after responsive shell changes.

### Why

Repeatable visual QA for call sheet sideline flows without auth; keep play sheet screenshot baselines aligned with the updated app shell.

### Status after this push

- `npm run build` from `sideline/` expected to pass.

---

## 2026-06-28 — Responsive layout foundation: shared app shell tokens

### What

- **[`sideline/app/globals.css`](sideline/app/globals.css):** **`--app-shell-max-width`**, **`--app-shell-px`**, **`--app-shell-pt`**, **`--app-shell-pb-tab`** CSS variables and **`.app-shell-main`** — mobile stays **`48rem`**; widens at **`md` / `lg` / `xl`** without edge-to-edge stretch.
- **[`sideline/app/layout.tsx`](sideline/app/layout.tsx):** Root **`<main>`** uses **`appShellMainClass`** instead of inline **`max-w-3xl`** utilities.
- **[`sideline/components/shared/BottomTabNav.tsx`](sideline/components/shared/BottomTabNav.tsx)**, **[`sideline/components/shared/PlaySheetSituationChipScroll.tsx`](sideline/components/shared/PlaySheetSituationChipScroll.tsx):** Tab bar and full-bleed situation chip spacers consume the same shell tokens.
- **[`sideline/lib/constants/designTokens.ts`](sideline/lib/constants/designTokens.ts):** **`appShellMainClass`** export.
- **Docs:** [`BUILD_CONTRACT.md`](BUILD_CONTRACT.md), [`DECISIONS.md`](DECISIONS.md) (**2026-06-28 — Responsive app shell tokens**).

### Why

Tablet and desktop need more usable width from one shared foundation; mobile behavior and marketing/onboarding chrome exceptions stay unchanged.

### Status after this push

- `npm run build` from `sideline/` passed.

---

## 2026-06-26 — Shell: slide-out menu enters from left edge only

### What

- **[`sideline/components/ui/dialog.tsx`](sideline/components/ui/dialog.tsx):** New **`drawer-left`** **`DialogContent`** variant — full-height panel anchored to the left viewport edge with slide-in motion (no centered-modal zoom or diagonal enter).
- **[`sideline/components/playbook/CallSheetViewerMenu.tsx`](sideline/components/playbook/CallSheetViewerMenu.tsx):** Hamburger menu uses **`drawer-left`** so the slide-out reads as navigation chrome, not a modal.

### Why

The shared **`Dialog`** enter animation made the hamburger menu feel like a centered popup; left-edge drawer motion matches coach expectations for app navigation.

### Status after this push

- `npm run build` from `sideline/` expected to pass.

---

## 2026-06-26 — Auth / routing: post-login lands on Play Sheet; compact menu wordmark

### What

- **[`sideline/lib/navigation/loginHref.ts`](sideline/lib/navigation/loginHref.ts):** **`DEFAULT_POST_AUTH_PATH`** is **`/playbook`**; **`resolveSafeNextPath`** still honors safe internal **`next`** params.
- **[`sideline/app/auth/callback/route.ts`](sideline/app/auth/callback/route.ts)**, **[`sideline/app/auth/confirm/route.ts`](sideline/app/auth/confirm/route.ts)**, **[`sideline/components/providers/AuthProvider.tsx`](sideline/components/providers/AuthProvider.tsx)**, **[`sideline/proxy.ts`](sideline/proxy.ts)**, **[`sideline/components/shared/HomeOnboardingGate.tsx`](sideline/components/shared/HomeOnboardingGate.tsx)**, **[`sideline/app/login/LoginForm.tsx`](sideline/app/login/LoginForm.tsx):** Default post-auth routing now sends coaches to **Play Sheet** when no explicit **`next`** is present.
- **[`sideline/components/shared/AppCompactWordmark.tsx`](sideline/components/shared/AppCompactWordmark.tsx):** Compact **Sideline** mark at app header title size in the slide-out menu header.
- **Docs:** [`BUILD_CONTRACT.md`](BUILD_CONTRACT.md) default landing path updated.

### Why

Play Sheet is the primary coaching loop entry after sign-in; the menu wordmark matches in-app header typography without duplicating the full landing lockup.

### Status after this push

- `npm run build` from `sideline/` expected to pass.

---

## 2026-06-26 — Play Sheet: **Add sheet** in app shell header; auth shell header alignment

### What

- **[`sideline/components/playbook/PlaySheetHomeHeader.tsx`](sideline/components/playbook/PlaySheetHomeHeader.tsx)**, **[`sideline/components/playbook/PlaybookHome.tsx`](sideline/components/playbook/PlaybookHome.tsx)**, **[`sideline/components/qa/play-sheet/PlaySheetQaHome.tsx`](sideline/components/qa/play-sheet/PlaySheetQaHome.tsx):** **Add sheet** create action moved into the shared app shell header (removed duplicate CTAs from the home body).
- **[`sideline/components/shared/AppShellMenuHeader.tsx`](sideline/components/shared/AppShellMenuHeader.tsx):** Wider spacing between hamburger and page title.
- **[`sideline/app/login/LoginForm.tsx`](sideline/app/login/LoginForm.tsx):** Sign-in **Back** button and wordmark share one header row on the auth shell.

### Why

Primary create action stays visible while scrolling the sheet list; auth and app pillars share consistent header rhythm.

### Status after this push

- `npm run build` from `sideline/` expected to pass.

---

## 2026-06-26 — Shell: slide-out nav redesign (labels, sign out, wordmark)

### What

- **[`sideline/components/playbook/CallSheetViewerMenu.tsx`](sideline/components/playbook/CallSheetViewerMenu.tsx):** Redesigned slide-out menu with wordmark header, primary links (**Build Your Sheet**, **Call Plays**, **Settings**), and **Sign out**. **Film** and **Tendencies** links hidden for now (routes preserved).
- **[`sideline/lib/coachCopy.ts`](sideline/lib/coachCopy.ts):** Nav labels aligned with Call Sheet coaching loop terminology.

### Why

Focus primary navigation on the sheet-building and sideline reference flows while the bottom tab bar is gated off.

### Status after this push

- `npm run build` from `sideline/` expected to pass.

---

## 2026-06-26 — Call Sheet viewer: accordion coach view, shared surfaces, bottom sheet switcher

### What

- **[`sideline/components/playbook/CallSheetViewerHome.tsx`](sideline/components/playbook/CallSheetViewerHome.tsx)**, **[`sideline/components/playbook/CallSheetViewerSituation.tsx`](sideline/components/playbook/CallSheetViewerSituation.tsx)**, **[`sideline/components/playbook/CallSheetViewerFullSheet.tsx`](sideline/components/playbook/CallSheetViewerFullSheet.tsx)**, **[`sideline/components/playbook/CallSheetViewerPlayRow.tsx`](sideline/components/playbook/CallSheetViewerPlayRow.tsx)**, **[`sideline/components/playbook/CallSheetViewerSituationGrid.tsx`](sideline/components/playbook/CallSheetViewerSituationGrid.tsx):** Viewer simplified to expanded accordion coach view with read-only detail rows and shared surface tokens matching the builder.
- **[`sideline/components/playbook/CallSheetSheetSwitcher.tsx`](sideline/components/playbook/CallSheetSheetSwitcher.tsx):** Tab-style switcher replaced with a full-width **[`BottomSheet`](sideline/components/shared/BottomSheet.tsx)** for play sheet selection.
- **[`sideline/components/game-plan/PlayTableRow.tsx`](sideline/components/game-plan/PlayTableRow.tsx)**, **[`sideline/lib/constants/designTokens.ts`](sideline/lib/constants/designTokens.ts)**, **[`sideline/lib/playbookUtils.ts`](sideline/lib/playbookUtils.ts):** Shared row and card tokens between builder and viewer.

### Why

Sideline glance UX should mirror builder visual language without edit chrome; bottom sheet switcher fits mobile-first sheet picking.

### Status after this push

- `npm run build` from `sideline/` expected to pass.

---

## 2026-06-26 — Shell: hamburger navigation across app pillars; bottom tab bar hidden

### What

- **[`sideline/components/shared/AppShellMenuHeader.tsx`](sideline/components/shared/AppShellMenuHeader.tsx):** Shared hamburger + title header wired on Play Sheet, Film, Tendencies, and Settings pillar pages.
- **[`sideline/components/playbook/CallSheetViewerMenu.tsx`](sideline/components/playbook/CallSheetViewerMenu.tsx)**, **[`sideline/lib/navigation/playSheetNav.ts`](sideline/lib/navigation/playSheetNav.ts):** Menu links reach **Builder** (`/playbook`), **Call Sheet viewer** (`/playbook/view`), **Film**, and **Settings**; viewer route stays menu-only (no tab bar).
- **[`sideline/components/shared/BottomTabNav.tsx`](sideline/components/shared/BottomTabNav.tsx):** **`BOTTOM_TAB_NAV_ENABLED = false`** gates the fixed bottom tab bar off while preserving the component for later re-enable.
- **[`sideline/app/film/page.tsx`](sideline/app/film/page.tsx)**, **[`sideline/components/tendencies/TendenciesHome.tsx`](sideline/components/tendencies/TendenciesHome.tsx)**, **[`sideline/app/settings/SettingsPageClient.tsx`](sideline/app/settings/SettingsPageClient.tsx)**, **[`sideline/app/globals.css`](sideline/app/globals.css):** Pillar pages adopt shell header; bottom padding adjusted for tab-bar-off layout.

### Why

One navigation pattern across coaching pillars; hamburger-first nav matches the Call Sheet sideline reference flow.

### Status after this push

- `npm run build` from `sideline/` expected to pass.

---

## 2026-06-26 — Call Sheet: active sheet lifecycle, stale-pointer heal, **Active** badge

### What

- **[`sideline/lib/callSheetPrefs.ts`](sideline/lib/callSheetPrefs.ts):** **`readActiveCallSheetId`** heals stale **`user_call_sheet_prefs.active_call_sheet_id`** pointers (missing or deleted sheets fall back to most recently updated sheet). Delete path reassigns active only when the deleted sheet was active.
- **[`sideline/app/api/playbook/[id]/route.ts`](sideline/app/api/playbook/[id]/route.ts):** Delete handler uses updated active-sheet reassignment.
- **[`sideline/components/playbook/PlaySheetActiveBadge.tsx`](sideline/components/playbook/PlaySheetActiveBadge.tsx)**, **[`sideline/components/playbook/PlaybookCard.tsx`](sideline/components/playbook/PlaybookCard.tsx)**, **[`sideline/components/playbook/CallSheetSheetSwitcher.tsx`](sideline/components/playbook/CallSheetSheetSwitcher.tsx):** Inline green **Active** badge beside sheet names on home list and viewer switcher.
- **[`sideline/lib/constants/designTokens.ts`](sideline/lib/constants/designTokens.ts):** Badge color tokens.

### Why

Coaches need a reliable “which sheet am I calling from?” pointer across builder, viewer, and Film; stale prefs after delete or manual DB edits should self-heal on read.

### Status after this push

- `npm run build` from `sideline/` expected to pass.

---

## 2026-06-26 — Call Sheet: read-only sideline viewer (`/playbook/view`)

### What

- **[`sideline/app/playbook/view/page.tsx`](sideline/app/playbook/view/page.tsx)**, **[`sideline/components/playbook/CallSheetViewer.tsx`](sideline/components/playbook/CallSheetViewer.tsx):** New read-only **Call Sheet viewer** — glance active sheet by tactical situation or full list, switch sheets from the header, navigate via hamburger menu (no bottom tabs or edit chrome).
- **Viewer components:** **[`CallSheetViewerHeader.tsx`](sideline/components/playbook/CallSheetViewerHeader.tsx)**, **[`CallSheetViewerHome.tsx`](sideline/components/playbook/CallSheetViewerHome.tsx)**, **[`CallSheetViewerSituation.tsx`](sideline/components/playbook/CallSheetViewerSituation.tsx)**, **[`CallSheetViewerSituationGrid.tsx`](sideline/components/playbook/CallSheetViewerSituationGrid.tsx)**, **[`CallSheetViewerFullSheet.tsx`](sideline/components/playbook/CallSheetViewerFullSheet.tsx)**, **[`CallSheetViewerPlayRow.tsx`](sideline/components/playbook/CallSheetViewerPlayRow.tsx)**, **[`CallSheetViewerMenu.tsx`](sideline/components/playbook/CallSheetViewerMenu.tsx)**, **[`CallSheetSheetSwitcher.tsx`](sideline/components/playbook/CallSheetSheetSwitcher.tsx)**.
- **[`sideline/lib/coachCopy.ts`](sideline/lib/coachCopy.ts)**, **[`sideline/lib/constants.ts`](sideline/lib/constants.ts)**, **[`sideline/lib/playbookUtils.ts`](sideline/lib/playbookUtils.ts):** Viewer copy and tactical scenario helpers.

### Why

Coaches need sideline play reference separate from the builder/editor without logging or editing affordances in the same surface.

### Status after this push

- `npm run build` from `sideline/` expected to pass.

---

## 2026-06-26 — Play Sheet home rebuild and add-play browse (Call Sheet loop)

### What

- **[`sideline/components/playbook/PlaybookHome.tsx`](sideline/components/playbook/PlaybookHome.tsx)**, **[`sideline/components/playbook/PlaybookCard.tsx`](sideline/components/playbook/PlaybookCard.tsx):** Dashboard drill-down home with active sheet menu actions (set active, view, edit, delete).
- **[`sideline/components/playbook/PlaybookEditor.tsx`](sideline/components/playbook/PlaybookEditor.tsx)**, **[`CallSheetBuilderDashboard.tsx`](sideline/components/playbook/CallSheetBuilderDashboard.tsx)**, **[`CallSheetBuilderSheetHeader.tsx`](sideline/components/playbook/CallSheetBuilderSheetHeader.tsx)**, **[`CallSheetBuilderSituationHeader.tsx`](sideline/components/playbook/CallSheetBuilderSituationHeader.tsx)**, **[`CallSheetSituationGrid.tsx`](sideline/components/playbook/CallSheetSituationGrid.tsx):** Builder shell with tactical situation grid and in-context navigation.
- **[`sideline/components/playbook/AddPlayBrowseRow.tsx`](sideline/components/playbook/AddPlayBrowseRow.tsx)**, **[`AddPlayDrawer.tsx`](sideline/components/playbook/AddPlayDrawer.tsx)**, **[`sideline/components/film/PlayBrowser.tsx`](sideline/components/film/PlayBrowser.tsx):** Table-style formation browse with **Go-To** star toggles; shared browse patterns between Film and Play Sheet add-play.
- **[`sideline/components/shared/IconBackButton.tsx`](sideline/components/shared/IconBackButton.tsx)**, **[`BackNavLink.tsx`](sideline/components/shared/BackNavLink.tsx)**: Shared icon back buttons keep coaches in the sheet-building flow without losing context.
- **QA:** **[`PlaySheetQaSituationEditor.tsx`](sideline/components/qa/play-sheet/PlaySheetQaSituationEditor.tsx)** and related QA views refactored to mirror production builder surfaces.

### Why

The Call Sheet loop needs a coach-first home and browse path that stays in sheet context from list → builder → add-play → back.

### Status after this push

- `npm run build` from `sideline/` expected to pass.

---

## 2026-06-26 — Play Sheet builder: tactical Call Sheet situations (8 buckets)

### What

- **[`sideline/lib/constants.ts`](sideline/lib/constants.ts):** **`CALL_SHEET_SCENARIOS`** — eight tactical buckets (**Go-To Plays**, **Tempo**, **Run Game**, **Pass Game**, **Man Beaters**, **Zone Beaters**, **Take a Shot**, **Red Zone**); legacy **`SCENARIOS`** preserved for logging/Tendencies and older sheets.
- **[`sideline/lib/playbookUtils.ts`](sideline/lib/playbookUtils.ts):** Builder sorts, caps, and defaults new sheets to **`CALL_SHEET_SCENARIOS`**; legacy sheets keep prior situational behavior.
- **[`sideline/components/playbook/PlaybookEditor.tsx`](sideline/components/playbook/PlaybookEditor.tsx)**, **[`SituationList.tsx`](sideline/components/playbook/SituationList.tsx)**, **[`PlaySheetSituationChipScroll.tsx`](sideline/components/shared/PlaySheetSituationChipScroll.tsx)**: Builder UI wired to tactical buckets; guided onboarding targets **Go-To Plays**.
- **[`sideline/app/api/playbook/[id]/plays/route.ts`](sideline/app/api/playbook/[id]/plays/route.ts):** Scenario ordering aligned with Call Sheet buckets on write.

### Why

Sideline call sheets organize by tactical buckets coaches actually use on game day, distinct from down-and-distance logging scenarios.

### Status after this push

- `npm run build` from `sideline/` expected to pass.

---

## 2026-06-26 — Call Sheet architecture foundation and Play Sheet QA capture

### What

- **[`sideline/lib/callSheetPrefs.ts`](sideline/lib/callSheetPrefs.ts)**, **[`sideline/app/api/playbook/active/route.ts`](sideline/app/api/playbook/active/route.ts)**: Server-side active Call Sheet prefs (**`user_call_sheet_prefs`**) with **`readActiveCallSheetId`**, **`upsertActiveCallSheetId`**, and **`PUT /api/playbook/active`**.
- **[`sideline/app/api/playbook/route.ts`](sideline/app/api/playbook/route.ts)**: List/create responses include active sheet context; new sheets seed **`CALL_SHEET_SCENARIOS`**.
- **[`sideline/lib/constants.ts`](sideline/lib/constants.ts)**, **[`sideline/lib/types.ts`](sideline/lib/types.ts)**: Tactical scenario constants and types shared by Builder/Viewer without touching Film logging paths.
- **QA capture:** Sessionless **`/qa/play-sheet/*`** routes, **[`PlaySheetQaHome.tsx`](sideline/components/qa/play-sheet/PlaySheetQaHome.tsx)** / **[`PlaySheetQaEditor.tsx`](sideline/components/qa/play-sheet/PlaySheetQaEditor.tsx)** / **[`PlaySheetQaEditorViews.tsx`](sideline/components/qa/play-sheet/PlaySheetQaEditorViews.tsx)**, **[`playSheetQaFixture.ts`](sideline/lib/playSheetQaFixture.ts)**, **[`playwright/play-sheet-screenshots.spec.ts`](sideline/playwright/play-sheet-screenshots.spec.ts)** with baseline PNGs under **`qa-screenshots/play-sheet/`**. **`PlayBrowser`** QA hooks for repeatable visual capture.

### Why

Stable backend and scenario model before shipping Builder/Viewer UI; repeatable screenshot QA for Play Sheet surfaces.

### Status after this push

- `npm run build` from `sideline/` expected to pass.
- Play Sheet screenshot spec: **`npm run screenshots:play-sheet`** (from `sideline/`).

---

## 2026-05-04 — Onboarding: carousel slide 3 PNG

### What

- **[`sideline/public/onboarding/slide-3-improve.png`](sideline/public/onboarding/slide-3-improve.png):** Updated raster for **`OnboardingCarousel`** slide 3 (**improve**).

### Why

Asset-only refresh; **`components/shared/OnboardingCarousel.tsx`** references unchanged.

### Status after this push

- `npm run build` from `sideline/` expected to pass.

---

## 2026-05-04 — Settings / API: account deletion teardown order and server logging

### What

- **[`sideline/app/api/account/route.ts`](sideline/app/api/account/route.ts):** Service-role deletes for the signed-in user run in FK-safe order: **`play_sheet_plays`** → **`play_sheet_scenarios`** → **`dismissed_suggestions`** → **`play_sheets`** → **`logged_plays`** → **`drives`** → **`game_sessions`** → **`user_profiles`**, then **`auth.admin.deleteUser`**. Each **`delete()`** checks **`error`**; failures log **`[DELETE /api/account] step=<table or auth.admin.deleteUser>`** with the Supabase error (plus **`step=unexpected`** for thrown errors). User-facing JSON unchanged except behavior now succeeds when data existed under the old broken order.
- **Docs:** [`BUILD_CONTRACT.md`](BUILD_CONTRACT.md) (API / data integrity), [`DECISIONS.md`](DECISIONS.md) (**2026-05-04 — Account deletion**), [`sideline/CHANGELOG.md`](sideline/CHANGELOG.md).

### Why

Deleting **`game_sessions`** first violated **`logged_plays` → `game_sessions`** FK behavior in shipped migrations; ignoring PostgREST **`error`** on earlier deletes hid failures.

### Status after this push

- `npm run build` from `sideline/` expected to pass.

---

## 2026-05-04 — Auth: Google button alignment and dark WebKit autofill

### What

- **[`sideline/app/login/LoginForm.tsx`](sideline/app/login/LoginForm.tsx):** Google sign-in CTA matches slate **`slate-900` / `slate-700`** field styling and emerald focus ring.
- **[`sideline/app/globals.css`](sideline/app/globals.css):** **`.dark`**-scoped **`-webkit-autofill`** rules so browser-filled fields stay on-brand (**`slate-900`** fill, **`slate-100`** text) across the dark auth shell.

### Why

Google button and autofill styling had drifted from the shared auth input treatment; filled fields no longer flash light/yellow on dark surfaces.

### Status after this push

- `npm run build` from `sideline/` expected to pass.

---

## 2026-05-04 — Data: CFB26 playbook seed batch 3 + cfb.fan generator docs

### What

- **`sideline/lib/seed/playbooks/`**: 60 additional offensive **`TeamPlaybookSeed`** modules (batch 3: Mountain West, Pac-12, AAC, CUSA, Sun Belt, and related FBS slugs), **`source.url`** on **cfb.fan**, **`source.verified`**: **2026-05-04**.
- **`sideline/scripts/generate-cfbfan-playbook-seeds.ts`**: `TEAMS` reconciled to those 60 slugs; **`urlSlug`** overrides for **California** (`cal`), **FIU** (`florida-international`), **Middle Tennessee** (`mid-tenn-state`), **Sam Houston** (`sam-houston-state`). Comments point to **`sideline/lib/seed/cfb26-playbook-seed-generator.md`** (no dangling brief filename).
- **`sideline/lib/seed/cfb26-playbook-seed-generator.md`**: run instructions, batch list, override table, fragility and post-run checks.
- **`SESSION_BRIEF.md`**: batch scope and references.
- **`BUILD_CONTRACT.md`**, **`DECISIONS.md`**: repo map link + decision log entry.

### Why

Broader catalog coverage per **2026-05-02 — Bulk CFB26 offensive playbook seed catalog**; reproducible regeneration and traceability for operators.

### Status after this push

- `npm run build` from `sideline/` expected to pass. Upsert remains **`npm run seed:playbook`** (per slug or **`--all`**).

---

## 2026-05-04 — Auth: forgot-password QA dry-run (`?dryRun=1`), shared recovery `redirectTo` helper

### What

- **`sideline/lib/passwordRecoveryRedirect.ts`**: **`buildPasswordRecoveryRedirectTo`** — single implementation for **`{base}/auth/callback?type=recovery`** (**`base`** = **`window.location.origin`** or trimmed **`NEXT_PUBLIC_SITE_URL`**).
- **`sideline/components/providers/AuthProvider.tsx`**: **`resetPassword`** uses that helper (behavior unchanged).
- **`sideline/app/login/LoginForm.tsx`**: when **`NODE_ENV` ≠ `production`** and the URL has **`?dryRun=1`**, forgot-password submit and **Resend** skip **`resetPasswordForEmail`**, **`console.log`** the **`redirectTo`**, and show it on the post-submit screen; production builds ignore dry-run. Reset-sent **Resend** now surfaces **`resetPassword`** errors instead of failing silently.
- **Docs:** [`BUILD_CONTRACT.md`](BUILD_CONTRACT.md), [`DECISIONS.md`](DECISIONS.md) (**2026-05-04 — Forgot-password QA dry-run**), [`sideline/.env.example`](sideline/.env.example), repo-root and [`sideline/CHANGELOG.md`](sideline/CHANGELOG.md).

### Why

Local QA can confirm the recovery redirect URL without sending email or hitting rate limits; **`redirectTo`** stays aligned with **`AuthProvider`** via one module.

### Status after this push

- `npm run build` from `sideline/` expected to pass.

---

## 2026-05-04 — Auth: document password reset `redirectTo` base (`window` + `NEXT_PUBLIC_SITE_URL`)

### What

- **`sideline/components/providers/AuthProvider.tsx`**: **`resetPassword`** builds **`redirectTo`** from **`window.location.origin`**, falling back to **`NEXT_PUBLIC_SITE_URL`** when the window origin is empty (defensive; forgot-password runs in the browser).
- **Docs:** [`BUILD_CONTRACT.md`](BUILD_CONTRACT.md), [`DECISIONS.md`](DECISIONS.md) (**2026-05-03 — Password recovery** decision text), [`sideline/.env.example`](sideline/.env.example), repo-root and [`sideline/CHANGELOG.md`](sideline/CHANGELOG.md) aligned with the **`{base}/auth/callback?type=recovery`** wording.

### Why

Keeps contract and decision log accurate with the implementation and clarifies when **`NEXT_PUBLIC_SITE_URL`** participates in recovery links.

### Status after this push

- `npm run build` from `sideline/` expected to pass.

---

## 2026-05-03 — Auth: password reset email routes through `/auth/callback?type=recovery`

### What

- **`sideline/components/providers/AuthProvider.tsx`**: **`resetPasswordForEmail`** uses **`redirectTo`** **`{origin}/auth/callback?type=recovery`**. Reset-specific copy when Supabase rate-limits the email: **“Too many reset attempts. Wait a few minutes, then try again.”** (other errors still use **`mapAuthError`**).
- **`sideline/.env.example`**: documents that Supabase Auth redirect URLs must include **`/auth/callback`** for each origin (localhost, **`https://<project>.vercel.app`**, production domain).
- **Docs:** [`BUILD_CONTRACT.md`](BUILD_CONTRACT.md) (architecture bullet), [`DECISIONS.md`](DECISIONS.md) (**2026-05-03 — Password recovery email redirect**), [`sideline/CHANGELOG.md`](sideline/CHANGELOG.md).

### Why

Recovery links that land on **`/`** with a **`code`** hit **`app/page.tsx`** unauthenticated redirect to **`/landing`** before the session exchange; sending users to the public callback first fixes the flow.

### Status after this push

- **`app/auth/callback/route.ts`** already redirected **`type=recovery`** to **`/reset-password`** after **`exchangeCodeForSession`**; no route change required.
- `npm run build` from `sideline/` expected to pass.

---

## 2026-05-03 — Auth: `/reset-password` recovery UX (copy, card, sign-out after update)

### What

- **`sideline/app/reset-password/ResetPasswordForm.tsx`**: Coach-facing copy for create / success / no-session states; **`PasswordInput`** labels; slate **`AuthSurfaceCard`** wrapper; **Back** via **`buildLandingHref`** (optional **`next`**); **Sign in** / secondary link via **`buildLoginHref`**. Reuses **`lib/passwordValidation.ts`** (8+ chars, letter + number, confirm match). After a successful **`supabase.auth.updateUser({ password })`** (via **`useAuth().updatePassword`**), sets **`passwordUpdated`** then **`signOut()`** so the success CTA can reach **`/login`** without an immediate authenticated bounce. Generic error string only (no raw Supabase messages).

### Why

Password recovery from email should match the agreed auth shell (dark slate, Barlow headings, emerald primary) and the product brief for reset, success, and expired-session messaging.

### Status after this push

- `npm run build` from `sideline/` expected to pass; [`sideline/CHANGELOG.md`](sideline/CHANGELOG.md) updated in the same change.

---

## 2026-05-02 — Product copy: “Play Sheet” replaces “Game Plan” (UI + docs)

### What

- **Coach-facing terminology:** Bottom nav, playbook list/editor, **`lib/coachCopy.ts`** (defaults, onboarding carousel CTA, loop copy, empty list headline/body, new-sheet title), Film new game / edit game details (play sheet picker labels), and landing hero + metadata now use **Play Sheet** instead of **Game Plan**. **`/playbook` routes and APIs unchanged.**
- **Supporting comments** in **`sideline/lib/*`** and a few Film/playbook components updated for consistency (no behavior change).
- **Docs:** [`BUILD_CONTRACT.md`](BUILD_CONTRACT.md), [`DECISIONS.md`](DECISIONS.md) (new decision + current nav line), [`.cursorrules`](.cursorrules), [`sideline/AGENTS.md`](sideline/AGENTS.md).

### Why

Align in-app language with how coaches talk about call sheets; reduce confusion with the phrase “game plan” as a whole-game concept.

### Status after this push

- `npm run build` from `sideline/` expected to pass; [`sideline/CHANGELOG.md`](sideline/CHANGELOG.md) updated in the same change.

---

## 2026-05-02 — Bulk CFB26 offensive playbook seed catalog (`lib/seed/playbooks/`)

### What

- **Playbook data:** Additional **`sideline/lib/seed/playbooks/{slug}.ts`** modules (**`TeamPlaybookSeed`**, **`scheme`** aligned with **`lib/playbooks/scheme-classifications`**, **`source.url`** on **cfb.fan**, formations + plays). Intentional **bulk catalog** expansion, not a single-school add.
- **Ops:** Load into **`cfb26_plays`** with **`npm run seed:playbook -- <slug> [slug…] | --all`** (**`scripts/seed-playbooks.ts`**); compare DB to seeds with **`npm run verify:playbook -- …`** after upsert. Canonical **`play_type`** for stored rows still flows through **`resolveSeedPlayType`** → **`mapToCanonicalPlayType`** → **`RUN` / `PASS` / `RPO`** per **`DECISIONS.md`** **2026-05-02 — Seed playbook script**.

### Why

Widen credible CFB26 offensive vocabulary for Game Plan, Film browse, and catalog-backed **`RUN` / `PASS` / `RPO`** without requiring a separate PR per school.

### Status after this push

- `npm run build` from `sideline/` expected to pass (seed files are TypeScript data only).
- [`DECISIONS.md`](DECISIONS.md) (new **2026-05-02 — Bulk CFB26 offensive playbook seed catalog** entry), [`BUILD_CONTRACT.md`](BUILD_CONTRACT.md) (repo map), [`sideline/CHANGELOG.md`](sideline/CHANGELOG.md) updated in the same change.

---

## 2026-05-02 — Game Plan: single-step create play sheet + coach-first copy

### What

- **`CreatePlaybookModal`**: Creates a play sheet in one step (removed the second confirmation screen). Submit still uses **`POST /api/playbook`** and navigates to **`/playbook/[id]`** (or **`?onboarding=1`** when guided). Page and modal titles use **`PLAYBOOK_NEW_SHEET_TITLE`**; primary CTA **`PLAYBOOK_CREATE_CTA`**. Dropped the extra helper line under the playbook picker on this screen.
- **`coachCopy.ts`**: **`PLAYBOOK_NEW_SHEET_TITLE`**, **`PLAYBOOK_NEW_SHEET_SUBTITLE`**, name and search placeholders, **`PLAYBOOK_CREATE_CTA`**; **`ONBOARDING_PLAYBOOK_CTA`** aliases **`PLAYBOOK_CREATE_CTA`**.

### Why

Faster Game Plan setup; copy emphasizes trusted calls by situation (outcome-first) per UX guidance.

### Status after this push

- `npm run build` from `sideline/` expected to pass.

---

## 2026-05-02 — Game Plan create flow, seed `play_type` mapping, `BackNavLink`

### What

- **Game Plan UX / routing:** **`app/playbook/new/page.tsx`** renders **`CreatePlaybookModal`** full-page; **`HomeOnboardingGate`** → **`/playbook/new?onboarding=1`**; **`PlaybookHome`** links to **`/playbook/new`**; **`app/playbook/page.tsx`** **`redirect`**s **`?create=1`** (optional **`onboarding`**, **`cfb26`**) to **`/playbook/new`**. **`CreatePlaybookModal`**: Film.new-style shell (**`Breadcrumb`**, **`BackNavLink`**, card), in-card title **`PLAYBOOK_NEW_SHEET_TITLE`**; page flow drops redundant **Cancel** (back link only). **`components/shared/BackNavLink.tsx`** replaces **`BackToFilmLink`** (same default **`href="/film"`**; use **`href="/playbook"`** from **`/playbook/new`**).
- **Seed scripts:** **`scripts/seed-playbooks.ts`** **`mapToCanonicalPlayType`** maps full **`SeedPlayType`** labels (**`Option`**, **`Play Action`**, **`Screen`**, etc.) to **`RUN` / `PASS` / `RPO`** for **`cfb26_plays`** upserts when seeds omit explicit **`playType`**.

### Why

Full-page create matches Film.new; docs (**`BUILD_CONTRACT.md`**, **`DECISIONS.md`**) align with running code; seed classifier output no longer mis-maps to **`RUN`** with warnings.

### Status after this push

- `npm run build` from `sideline/` expected to pass.
- [`BUILD_CONTRACT.md`](BUILD_CONTRACT.md), [`DECISIONS.md`](DECISIONS.md), [`sideline/CHANGELOG.md`](sideline/CHANGELOG.md), [`DESIGN_AUDIT.md`](DESIGN_AUDIT.md) updated in the same change.

---

## 2026-05-02 — Marketing `/landing`: full-bleed hero, viewport-locked layout, spacing token

### What

- [`sideline/app/globals.css`](sideline/app/globals.css): **`html[data-marketing-chrome="true"] main`** is full width (**`max-width: none`**) with no horizontal padding on **`main`**; horizontal inset is on the hero section. **`@theme`** adds **`--spacing-landing-hero-copy-to-cta: 3rem`** for subcopy→CTA stack **`gap`** below **`md`**.
- [`sideline/components/landing/HeroSection.tsx`](sideline/components/landing/HeroSection.tsx): **`h-dvh`** hero with **`overflow-y-hidden`**, **`fixed`** full-viewport SVG backdrop, bounded-height showcase image, **`justify-start`** / **`md:justify-center`**, flex **`gap`** using the theme token (and **`md:gap-8`** between copy and CTAs at **`md+`**); **`gap-2`** between primary CTA and sign-in row; auth links still via **`buildLoginHref`**.

### Why

Marketing reads full-bleed without changing root **`layout.tsx`** for app routes; spacing is tokenized in **`globals.css`**.

### Status after this push

- `npm run build` from `sideline/` passes.
- [`DECISIONS.md`](DECISIONS.md) (new **2026-05-02 — Marketing `/landing`** entry; **2026-04-30** landing parity bullet updated), [`sideline/CHANGELOG.md`](sideline/CHANGELOG.md) updated in the same change.

---

## 2026-05-02 — Guided first-drive insight: full-viewport readout shell

### What

- [`sideline/components/film/GuidedFirstDriveInsight.tsx`](sideline/components/film/GuidedFirstDriveInsight.tsx): **Radix `Dialog`** is **full-viewport** at all breakpoints (**`inset-0`**, **`h-[100dvh]`**, **`rounded-none`**, **`max-w-none`**); **`slate-950`** / **`border-slate-800`** shell; safe-area top padding on the scroll region; **DialogContent** motion classes aligned to full-bleed guided steps (replaces bottom-sheet + **`sm:`** centered modal).

### Why

Immersive end to guided onboarding (**`?guided=1`**); consistent with other full-bleed guided onboarding surfaces (**`DECISIONS.md`** **2026-05-02 — Guided first-drive insight**).

### Status after this push

- `npm run build` from `sideline/` passes.
- [`BUILD_CONTRACT.md`](BUILD_CONTRACT.md), [`DECISIONS.md`](DECISIONS.md), [`sideline/CHANGELOG.md`](sideline/CHANGELOG.md) updated in the same change.

---

## 2026-05-02 — Shared situation chip scroll (Film My Sheet + Game Plan mobile)

### What

- [`sideline/components/shared/PlaySheetSituationChipScroll.tsx`](sideline/components/shared/PlaySheetSituationChipScroll.tsx): Single implementation of **full-bleed** horizontal **n/max** situation pills, **spacer alignment** to **`main`** (`max-w-3xl` + padding + **`gap-2`**), optional **`hideFromLg`** (Game Plan), optional **`tabSemantics`** (Film **My Sheet** **`tab` / `tablist`** inside Radix **`Tabs`**).
- [`sideline/components/playbook/SituationList.tsx`](sideline/components/playbook/SituationList.tsx): Mobile variant **delegates** to **`PlaySheetSituationChipScroll`** (no duplicated bleed math).
- [`sideline/components/film/PlayLoggerV2.tsx`](sideline/components/film/PlayLoggerV2.tsx): **My Sheet** situation strip uses the same component; error / loading / empty copy stays **`px-4`**.

### Why

**`BUILD_CONTRACT.md`** calls for **Game Plan–style** **My Sheet** chips; one module keeps layout math and coach-visible parity in sync.

### Status after this push

- `npm run build` from `sideline/` passes.
- [`DECISIONS.md`](DECISIONS.md) (new **2026-05-02** chip-scroll entry + prior Game Plan **Impact** pointer), [`sideline/CHANGELOG.md`](sideline/CHANGELOG.md) (detail) updated in the same change.

---

## 2026-05-02 — Game Plan: 10 calls per situation, suggested-play rows, full-bleed situation chips (mobile)

### What

- [`sideline/lib/playbookUtils.ts`](sideline/lib/playbookUtils.ts): **`PLAY_SHEET_SCENARIO_MAX_DEFAULT`** (**10**); **`scenarioMaxSlots`** default branch (Opening Script **15** and 2-/4-minute **10** unchanged). **`POST /api/playbook/[id]/plays`** already uses **`scenarioMaxSlots`** — capacity stays consistent with Film **My Sheet** chips and **`SituationList`** counts.
- [`sideline/components/playbook/PlaySuggestions.tsx`](sideline/components/playbook/PlaySuggestions.tsx): Suggested plays use **Tendencies-style** ranked rows (formation → play, **avg yds** + call count, pooled hint); **`PlayTypeBadge`** on the metrics row; **`GET`** supplies **`play_type`** via catalog resolution. **Add** / **Replace** use a **plus** icon with **`aria-label`**.
- [`sideline/app/api/playbook/[id]/plays/route.ts`](sideline/app/api/playbook/[id]/plays/route.ts): Enrich **`suggestions`** with **`resolveCfbDisplayPlayType`** after **`buildSuggestions`** (same **`cfb26_plays`** map as sheet rows).
- [`sideline/lib/loggedPlayStats.ts`](sideline/lib/loggedPlayStats.ts): **`SuggestionRow`** includes **`avg_yards`** (and optional **`play_type`** from API).
- [`sideline/components/playbook/SituationList.tsx`](sideline/components/playbook/SituationList.tsx): Mobile situation strip uses **`PlaySheetSituationChipScroll`** (see chip-scroll entry above).

### Why

More room per situation for real call sheets; suggestions read as coaching data (aligned with Tendencies top rows); mobile situations use edge-to-edge scroll without losing alignment with the rest of the shell.

### Status after this push

- `npm run build` from `sideline/` passes.
- [`DECISIONS.md`](DECISIONS.md) (new **2026-05-02** entry), [`sideline/CHANGELOG.md`](sideline/CHANGELOG.md) (detail) updated in the same change.

---

## 2026-05-02 — Film game tendencies tab: 3×2 stats, TOP PLAYS / TOP FORMATIONS / RECONSIDER, formations table removed

### What

- [`sideline/components/film/FilmGameTendenciesBody.tsx`](sideline/components/film/FilmGameTendenciesBody.tsx): **GAME STATS** 3×2 grid; **TOP PLAYS** / **TOP FORMATIONS** / **PLAYS TO RECONSIDER** sections (same heading style as other blocks); rankings from [`sideline/lib/gameTendenciesWhatsWorking.ts`](sideline/lib/gameTendenciesWhatsWorking.ts) (**`summarizeGameWhatsWorking`**) over existing **`GET /api/tendencies/game/[id]`** payload.
- Removed [`sideline/components/tendencies/GameFormationTable.tsx`](sideline/components/tendencies/GameFormationTable.tsx), [`sideline/components/tendencies/formationAggTableColumns.tsx`](sideline/components/tendencies/formationAggTableColumns.tsx) (only used by Film game tendencies).

### Why

Single-game tendencies emphasize compact stats and “what’s working” lists aligned with cross-game tendencies APIs, without a new endpoint.

### Status after this push

- `npm run build` from `sideline/` passes.
- [`DECISIONS.md`](DECISIONS.md) (new **2026-05-02** entry; **2026-04-30** film tendencies **Impact** updated), [`sideline/CHANGELOG.md`](sideline/CHANGELOG.md) (detail) updated in the same change.

---

## 2026-05-02 — Tendencies: predictability cleanup, scouting trim, reconsider filter, portal positioning

### What

- [`sideline/components/tendencies/AmIPredictable.tsx`](sideline/components/tendencies/AmIPredictable.tsx): Removed duplicate play-type stat cards under the distribution chart.
- [`sideline/components/tendencies/TendenciesFilters.tsx`](sideline/components/tendencies/TendenciesFilters.tsx): Game range filter is a **portal listbox** (same **`usePortalDropdown`** pattern as opponent + playbook); shared menu classes; one-row filter strip with label truncation.
- [`sideline/components/tendencies/PlaybookFilter.tsx`](sideline/components/tendencies/PlaybookFilter.tsx): Dropdown panel respects viewport height/width; list area scrolls inside flex layout.
- [`sideline/hooks/usePortalDropdown.ts`](sideline/hooks/usePortalDropdown.ts): Horizontal placement stays on-screen (**start-aligned** to trigger, **end-aligned** when clipped); measured width pass after open.
- [`sideline/lib/constants.ts`](sideline/lib/constants.ts), [`sideline/lib/tendenciesServer.ts`](sideline/lib/tendenciesServer.ts), [`sideline/components/tendencies/ScoutingReport.tsx`](sideline/components/tendencies/ScoutingReport.tsx): Scouting report situations omit **2 Point**, **2 Minute**, **4 Minute**.
- [`sideline/lib/playTypeResolution.ts`](sideline/lib/playTypeResolution.ts), [`sideline/app/api/tendencies/top-plays/route.ts`](sideline/app/api/tendencies/top-plays/route.ts): **Plays to reconsider** excludes Film Browse Special Teams rows (**`isSpecialTeamsFormationPlayRow`**).

### Why

Clearer tendencies surface for coaches: less noise under predictability, stable filter UX above tab stacking, tighter scouting summary, and no misleading ST rows in reconsider.

### Status after this push

- `npm run build` from `sideline/` passes.
- [`sideline/CHANGELOG.md`](sideline/CHANGELOG.md) (detail) updated in the same change.

---

## 2026-05-02 — Film game detail: drive accordion, logger My Sheet copy, PlayBrowser scroll

### What

- [`sideline/app/film/[gameId]/page.tsx`](sideline/app/film/[gameId]/page.tsx): Drive cards use **`getDrivePossessionOutcome`** (via **`getDriveResult`**) so completed possessions default collapsed on load; **`refresh({ pruneClosedPossessions: true })`** after possession-ended logging collapses ended drives without pruning expansion on every refetch; debounced drive metadata **`saveDrive`** uses **`skipRefresh: true`** so expanding a completed drive is not reset by autosave. Removed drive note row from the drive accordion.
- [`sideline/components/film/PlayLoggerV2.tsx`](sideline/components/film/PlayLoggerV2.tsx) + [`sideline/lib/coachCopy.ts`](sideline/lib/coachCopy.ts): My Sheet empty state uses **`filmLoggerMySheetEmptyHint`** (coach terminology: **calls**).
- [`sideline/components/film/PlayBrowser.tsx`](sideline/components/film/PlayBrowser.tsx): Reset plays list **`scrollTop`** when switching formation (inline browse).

### Why

Less clutter after logging, clearer empty My Sheet guidance, stable browse scroll, and copy centralized per film logger patterns in **BUILD_CONTRACT** / **DECISIONS**.

### Status after this push

- `npm run build` from `sideline/` passes.
- [`sideline/CHANGELOG.md`](sideline/CHANGELOG.md) (detail) updated in the same change.

---

## 2026-05-02 — Onboarding: refreshed carousel slide images

### What

- [`sideline/public/onboarding/slide-1-plan.png`](sideline/public/onboarding/slide-1-plan.png), [`slide-2-call.png`](sideline/public/onboarding/slide-2-call.png), [`slide-3-improve.png`](sideline/public/onboarding/slide-3-improve.png): Replaced PNG mocks used by [`sideline/components/shared/OnboardingCarousel.tsx`](sideline/components/shared/OnboardingCarousel.tsx) (**`ONBOARDING_CAROUSEL_SLIDES`** in [`sideline/lib/coachCopy.ts`](sideline/lib/coachCopy.ts)).

### Why

Updated onboarding artwork; no route or component logic changes.

### Status after this push

- [`sideline/CHANGELOG.md`](sideline/CHANGELOG.md) (detail) updated in the same change.

---

## 2026-05-02 — Film: new game setup copy + playbook prefill

### What

- [`sideline/app/film/new/page.tsx`](sideline/app/film/new/page.tsx): Title **Start a game**, subtitle (*Set the matchup and playbook…*), CTA **Start game**; labels **Your team** / **Playbook** from shared copy; removed the “any playbook” helper. Prefills CFB26 playbook via **`GET /api/playbook`**: prefers **`My First Game Plan`** (**`ONBOARDING_DEFAULT_SHEET_NAME`**), else most-recent sheet, when it matches the catalog; ignores prefill after the coach touches the playbook combobox.
- [`sideline/lib/coachCopy.ts`](sideline/lib/coachCopy.ts): **`FILM_NEW_GAME_*`** strings for that screen.

### Why

Coach-first first real game setup; defaults honor onboarding / Game Plan without new routes or schema.

### Status after this push

- `npm run build` from `sideline/` passes.
- [`sideline/CHANGELOG.md`](sideline/CHANGELOG.md) (detail) updated in the same change.

---

## 2026-05-01 — Film Room: empty list coach copy

### What

- [`sideline/app/film/page.tsx`](sideline/app/film/page.tsx): When no non-onboarding games exist, empty card headline, supporting line, and primary CTA use shared strings (**`FILM_ROOM_EMPTY_*`** in **`coachCopy.ts`**): *You've got a plan. Now call the game.* / *Log your first real game and see what actually works.* / **Start your first game** (still links to **`/film/new`**).

### Why

Coaching-first empty state after onboarding so the next step is obvious; copy stays centralized per **BUILD_CONTRACT** film / **`coachCopy.ts`** patterns.

### Status after this push

- `npm run build` from `sideline/` passes.

---

## 2026-05-01 — Onboarding QA: home handoff, guided chrome, logger, first-drive readout, docs

### What

- [`BUILD_CONTRACT.md`](BUILD_CONTRACT.md), [`DECISIONS.md`](DECISIONS.md): Authenticated home flow documents **carousel → `/playbook?create=1&onboarding=1`** (no CFB26 step on **`/`**); new decision entries for that handoff and for **guided-only** **`PlayLoggerV2`** **My Sheet** scenario behavior vs **2026-04-29** default chip sync.
- [`sideline/components/shared/HomeOnboardingGate.tsx`](sideline/components/shared/HomeOnboardingGate.tsx): Carousel CTA **`replace`**s to Game Plan onboarding create URL; removed home playbook picker phase.
- [`sideline/components/playbook/PlaybookHome.tsx`](sideline/components/playbook/PlaybookHome.tsx), [`sideline/components/playbook/CreatePlaybookModal.tsx`](sideline/components/playbook/CreatePlaybookModal.tsx): **`onboardingFullPage`** guided create (no Cancel row); guided modal cannot dismiss via overlay when **`guidedOnboardingFlow`**.
- [`sideline/components/playbook/PlaybookEditor.tsx`](sideline/components/playbook/PlaybookEditor.tsx): Onboarding editor: fixed footer (**Take the field**), no duplicate situation banner; navigate to **`/film/{id}?guided=1&sheetScenario=…`**.
- [`sideline/components/shared/BottomTabNav.tsx`](sideline/components/shared/BottomTabNav.tsx), [`sideline/app/layout.tsx`](sideline/app/layout.tsx): Hide tab bar + **`data-onboarding-chrome`** for **`onboarding=1`** on **`/playbook`** routes and **`guided=1`** on **`/film/[gameId]`**; **`Suspense`** around **`BottomTabNav`** for **`useSearchParams`**.
- [`sideline/app/film/[gameId]/page.tsx`](sideline/app/film/[gameId]/page.tsx): Guided logger shell (subline under **Getting started**, no backdrop/X close); passes **`guidedOnboarding`** / **`guidedMySheetScenario`** into **`PlayLoggerV2`**.
- [`sideline/components/film/PlayLoggerV2.tsx`](sideline/components/film/PlayLoggerV2.tsx), [`sideline/components/film/YardageSheet.tsx`](sideline/components/film/YardageSheet.tsx): Guided My Sheet bootstrap + post-log tab nudge; **`onboardingSpotHelper`** on yardage.
- [`sideline/lib/coachCopy.ts`](sideline/lib/coachCopy.ts): **`GUIDED_ONBOARDING_EDITOR_SCENARIO`**, **`GUIDED_LOGGER_HEADER_SUBLINE`**, **`ONBOARDING_BALL_SPOT_HELPER`**, **Take the field** CTA string.
- [`sideline/lib/guidedOnboardingInsight.ts`](sideline/lib/guidedOnboardingInsight.ts), [`sideline/components/film/GuidedFirstDriveInsight.tsx`](sideline/components/film/GuidedFirstDriveInsight.tsx): **`playTypeDistribution`** on readout; insight uses **`PlayTypeDistribution`** + informational nudge inside primary card.

### Why

Ship guided onboarding without duplicate steps, align bottom chrome and logger UX with the onboarding QA brief, reuse tendencies play-type visuals for the first-drive readout, and keep **BUILD_CONTRACT** / **DECISIONS** aligned with running code.

### Status after this push

- `npm run build` from `sideline/` passes.

---

## 2026-05-02 — Film: first drive breakdown (Dialog, `guidedFirstDriveCopy`)

### What

- [`sideline/lib/guidedFirstDriveCopy.ts`](sideline/lib/guidedFirstDriveCopy.ts): New module for first-drive insight coach strings (eyebrow, headlines, nudges, primary-line helpers) so copy is not split across `guidedOnboardingInsight` literals.
- [`sideline/lib/guidedOnboardingInsight.ts`](sideline/lib/guidedOnboardingInsight.ts): `buildFirstDriveCoachingReadout` consumes that copy; `guidedInsightFromLoggedPlays` lives here (moved from `coachCopy`); readout type no longer carries `eyebrow`.
- [`sideline/components/ui/dialog.tsx`](sideline/components/ui/dialog.tsx): `hideCloseButton` on `DialogContent` for forced-choice flows.
- [`sideline/components/film/GuidedFirstDriveInsight.tsx`](sideline/components/film/GuidedFirstDriveInsight.tsx): Radix `Dialog` with outside/Esc dismiss prevented; mobile sheet–style layout; footer uses `modalCtaFooterClass`.
- [`sideline/app/film/[gameId]/page.tsx`](sideline/app/film/[gameId]/page.tsx): `GuidedFirstDriveInsight` receives `open={guidedInsightOpen}`; mount when `guidedReadout` exists.
- [`sideline/lib/coachCopy.ts`](sideline/lib/coachCopy.ts): `GUIDED_LOGGER_HINT` wording matches “first drive breakdown”; removed unused guided insight exports that depended on importing the insight builder.

### Why

Aligns with **BUILD_CONTRACT** (prefer `Dialog` for new Film overlay surfaces), keeps **coachCopy** free of imports from `guidedOnboardingInsight`, and documents the shipped behavior in the changelog.

### Status after this push

- `npm run build` from `sideline/` passes.

---

## 2026-05-01 — Onboarding carousel: full-bleed gradient, layout, CTA spacing

### What

- [`sideline/components/shared/OnboardingCarousel.tsx`](sideline/components/shared/OnboardingCarousel.tsx): Layered **`ONBOARDING_PAGE_BACKDROP`** on **`fixed inset-0`** **`pointer-events-none`** (**`z-[5]`**, **`min-h-[100dvh]`**) so the background bypasses **`main`** horizontal padding; carousel UI **`z-[10]`**. Mock stack: intrinsic **`Image`**, **`object-contain`**, top-only rounding, tighter Explore / copy / dots rhythm, **`min-h-[48px]`** flex spacer above CTA, safe-area bottom padding on CTA row.
- [`sideline/components/shared/HomeOnboardingGate.tsx`](sideline/components/shared/HomeOnboardingGate.tsx): Carousel-phase **`section`** uses viewport-height **`calc`** with safe-area terms, **`overflow-x-hidden`**, **`py-0`**.

### Why

Polish the first-run carousel so the backdrop reads full-screen and the column stays usable on small viewports without scroll regressions.

### Status after this push

- `npm run build` from `sideline/` passes.

---

## 2026-05-01 — Home onboarding: PNG carousel, scaffold sessions, guided insight

### What

- [`BUILD_CONTRACT.md`](BUILD_CONTRACT.md): Documents **`HomeOnboardingGate`** eligibility (Supabase head counts on **`game_sessions`** excluding onboarding **`import_source`**, plus **`play_sheets`**), **`Explore app`** dismissal (**`lib/onboardingDismissed`**), legacy **`lastGamePrefsStore`** completion, **`FORCE_ONBOARDING`**, and conservative **`/film`** redirect when counts fail.
- [`sideline/components/shared/OnboardingCarousel.tsx`](sideline/components/shared/OnboardingCarousel.tsx): New client carousel — **`next/image`** slides (**`public/onboarding/slide-{1,2,3}-{plan,call,improve}.png`**), framed card, bottom fade, dots, auto-advance + swipe; Explore + CTA use shared **`Button`**.
- [`sideline/components/shared/HomeOnboardingGate.tsx`](sideline/components/shared/HomeOnboardingGate.tsx): **`OnboardingCarousel`** + Supabase count queries; **`dismissOnboarding`** on Explore; redirects on query failure. (Post-ship: home CFB26 picker removed — handoff is **`/playbook?create=1&onboarding=1`**; see **2026-05-01 — Onboarding QA** above.)
- [`sideline/lib/coachCopy.ts`](sideline/lib/coachCopy.ts): Carousel slide copy + **`imageSrc`**; onboarding/playbook/logger CTAs; **`guidedInsightFromLoggedPlays`** delegates to **`buildGuidedOnboardingInsight`**.
- [`sideline/lib/guidedOnboardingInsight.ts`](sideline/lib/guidedOnboardingInsight.ts): Shared guided readout model (breakdown, tendency paragraph, best play).
- [`sideline/lib/onboardingImportSource.ts`](sideline/lib/onboardingImportSource.ts), [`sideline/lib/onboardingDismissed.ts`](sideline/lib/onboardingDismissed.ts): Onboarding **`import_source`** constant + local dismissal flag (**`FORCE_ONBOARDING`** for QA).
- [`sideline/app/api/games/route.ts`](sideline/app/api/games/route.ts): **`POST`** sets **`import_source`** to onboarding when **`guided_onboarding_session`** / matching body flags.
- [`sideline/app/film/page.tsx`](sideline/app/film/page.tsx): Film list excludes onboarding scaffold games (still loads counts only for visible games).
- [`sideline/app/film/[gameId]/page.tsx`](sideline/app/film/[gameId]/page.tsx): Guided-mode insight sheet after five coach calls (**`buildGuidedOnboardingInsight`**), finish CTAs, **`dismissOnboarding`** integration.
- [`sideline/components/playbook/CreatePlaybookModal.tsx`](sideline/components/playbook/CreatePlaybookModal.tsx), [`sideline/components/playbook/PlaybookEditor.tsx`](sideline/components/playbook/PlaybookEditor.tsx): Guided flow uses **`ONBOARDING_DEFAULT_SHEET_NAME`** and shortened create path where applicable.
- [`sideline/components/tendencies/TendenciesHome.tsx`](sideline/components/tendencies/TendenciesHome.tsx), [`sideline/lib/tendenciesServer.ts`](sideline/lib/tendenciesServer.ts): Exclude onboarding **`game_sessions`** from tendencies game lists / playbook discovery queries.
- [`sideline/store/lastGamePrefsStore.ts`](sideline/store/lastGamePrefsStore.ts): Persist **`guidedOnboardingUserId`**; migrate **v1 → v2**.
- Assets: replace legacy onboarding PNG set with three Plan / Call / Improve slides.

### Why

Ship a visual-first home onboarding loop aligned with design, hide scaffold practice games from Film Room and Tendencies, persist dismissal per user safely, and surface a structured first readout after logging without inventing parallel insight logic.

### Status after this push

- `npm run build` from `sideline/` passes.

---

## 2026-04-30 — App shell: main top padding aligned with landing hero

### What

- [`sideline/app/layout.tsx`](sideline/app/layout.tsx): Root `<main>` **`pt-4 sm:pt-6` → `pt-6`** (same value at all breakpoints; removes redundant **`sm:pt-6`**).

### Why

Film Room, Game Plan, Tendencies, and settings sat **8px** higher than the **`HeroSection`** top inset on small viewports; one shell change matches the landing vertical rhythm without per-page padding.

### Status after this push

- `npm run build` from `sideline/` passes.

---

## 2026-04-30 — Film tendencies: table overflow, BY SITUATION density, formation accordion plays

### What

- [`sideline/components/shared/DataTable.tsx`](sideline/components/shared/DataTable.tsx): Optional **`equalColumnsCompact`** (drops **`min-w-[520px]`** when combined with **`equalColumns`**), **`containedWidth`** (**`table-fixed`** width tracks wrapper / colspan-safe), **`dense`** cell padding, optional column **`headerClassName`** / **`cellClassName`**; colspan **`renderAfterRow`** cells **`min-w-0 max-w-full`**.
- [`sideline/components/film/FilmGameTendenciesBody.tsx`](sideline/components/film/FilmGameTendenciesBody.tsx): BY SITUATION **`equalColumnsCompact`** + truncated situation cells (**`title`**).
- [`sideline/components/tendencies/GameFormationTable.tsx`](sideline/components/tendencies/GameFormationTable.tsx): Outer **`containedWidth`**; nested plays **`dense`**, **`equalColumnsCompact`**, **`drivePlayTableColumns({ includeSpot: false })`** (no **SPOT** in accordion).
- [`sideline/components/shared/drivePlayTableColumns.tsx`](sideline/components/shared/drivePlayTableColumns.tsx): Optional **`includeSpot`** (default true); **RESULT** badge **`pr-4`** gutter; when **SPOT** omitted, **YDS** header/body **`text-right`** and tabular yard styling.

### Why

Remove unnecessary horizontal scroll on game tendencies tables while preserving mobile scroll when needed; tighten RESULT vs YDS spacing in formation-expanded plays without changing APIs.

### Status after this push

- `npm run build` from `sideline/` passes.

---

## 2026-04-30 — Film game detail: drive card header Figma styling + extraction

### What

- [`sideline/app/film/[gameId]/page.tsx`](sideline/app/film/[gameId]/page.tsx): Drive accordion cards use Figma-aligned shell (background **`#0F172B`**, border **`#314158`**, **14px** radius), header row spacing and borders, drive label typography (**`#FFB900`** mono), metadata line (**`#62748E`** **12px**), kebab/chevron control sizing and colors, and expanded-panel top border/radius to match the shell. Outcome pill uses header-specific tokens (success/danger/warning/neutral) instead of shared [`ResultBadge`](sideline/components/import/ResultBadge.tsx) so import/play-table badges stay unchanged.
- [`sideline/components/film/DriveCardOutcomeBadge.tsx`](sideline/components/film/DriveCardOutcomeBadge.tsx): Film-only drive summary badge for that header.
- [`sideline/components/film/filmDriveDetailCardClasses.ts`](sideline/components/film/filmDriveDetailCardClasses.ts): Exported Tailwind class fragments for the drive card shell and header controls.

### Why

Match game-detail drive cards to the design spec while preserving accordion, one-open-drive, kebab menu, and expanded play table behavior; satisfy **BUILD_CONTRACT.md** one-component-per-file by moving the badge out of the page module.

### Status after this push

- `npm run build` from `sideline/` passes.

---

## 2026-04-30 — Film play logger: tighter spacing above yardage Back row

### What

- [`sideline/components/film/PlayLoggerV2.tsx`](sideline/components/film/PlayLoggerV2.tsx): Yardage view body uses **`pt-0`** instead of **`pt-3`** on the scroll wrapper.
- [`sideline/components/film/YardageSheet.tsx`](sideline/components/film/YardageSheet.tsx): Root padding **`px-4 pb-4 pt-3`** replaces **`p-4`** so top inset is not duplicated under the drive accordion.

### Why

Removes stacked vertical padding between the sticky drive chrome and the yardage **Back** control for a denser coach flow.

### Status after this push

- `npm run build` from `sideline/` passes.

---

## 2026-04-30 — UI consistency: modal tokens, auth validation, buttons, page titles

### What

- [`sideline/lib/constants/designTokens.ts`](sideline/lib/constants/designTokens.ts): **`modalCtaFooterClass`**, **`modalDialogTitleClass`**, **`appShellPageTitleClass`** for shared modal footers, dialog titles, and shell page headers.
- Modals/sheets aligned to those tokens: [`ConfirmDestructiveModal`](sideline/components/shared/ConfirmDestructiveModal.tsx), [`CreatePlaybookModal`](sideline/components/playbook/CreatePlaybookModal.tsx), [`EditPlaybookModal`](sideline/components/playbook/EditPlaybookModal.tsx), [`PlaybookEditor`](sideline/components/playbook/PlaybookEditor.tsx) (inline edit + Replace play), [`DriveSetupForm`](sideline/components/film/DriveSetupForm.tsx), [`EditGameDetailsModal`](sideline/components/film/EditGameDetailsModal.tsx), [`SettingsPageClient`](sideline/app/settings/SettingsPageClient.tsx) bottom sheets (including Cancel on update password / sign out), [`app/film/[gameId]/page.tsx`](sideline/app/film/[gameId]/page.tsx) end-game score **`Dialog`** (header/body/footer parity with other confirms).
- [`sideline/components/ui/button.tsx`](sideline/components/ui/button.tsx): **`font-sans`**, **`font-medium`**, **`tracking-normal`** on **`default`**, **`destructive`**, **`outline`**, **`secondary`**, **`ghost`**, and **`size.lg`**.
- Auth: [`LoginForm.tsx`](sideline/app/login/LoginForm.tsx), [`ResetPasswordForm.tsx`](sideline/app/reset-password/ResetPasswordForm.tsx), new [`lib/emailValidation.ts`](sideline/lib/emailValidation.ts) (inline email/password validation, blur + submit).
- Page titles: [`app/film/page.tsx`](sideline/app/film/page.tsx), [`PlaybookHome`](sideline/components/playbook/PlaybookHome.tsx), [`TendenciesHome`](sideline/components/tendencies/TendenciesHome.tsx), settings header, play sheet name on editor; [`app/film/new/page.tsx`](sideline/app/film/new/page.tsx) uses **`modalDialogTitleClass`** for **New game setup**.
- [`HeroSection.tsx`](sideline/components/landing/HeroSection.tsx): **Get started** CTA weight/tracking aligned with button standard.
- [`DECISIONS.md`](DECISIONS.md) **2026-04-30** entry + correction under **2026-04-24** (end game is **`Dialog`**; drive setup + logger remain hand-rolled). [`BUILD_CONTRACT.md`](BUILD_CONTRACT.md) Film UI bullet updated to match.

### Why

Polish across Film, Game Plan, Tendencies, settings, and auth without API or data-model changes; one place for modal footer/title rhythm; decision log and contract match shipped behavior.

### Status after this push

- `npm run build` from `sideline/` passes.

---

## 2026-04-30 — Landing wordmark glow tune + login tertiary link styling

### What

- [`sideline/components/landing/HeroSection.tsx`](sideline/components/landing/HeroSection.tsx): Removed the full-screen SVG emerald radial glow layer so the hero relies on the grid + edge fade and stays closer to auth visual weight; wordmark glow remains via shared styling only.
- [`sideline/lib/landing/appWordmarkStyle.ts`](sideline/lib/landing/appWordmarkStyle.ts): Reduced shared **The Sideline** wordmark `textShadow` and `drop-shadow` intensity for landing and login headers.
- [`sideline/app/login/LoginForm.tsx`](sideline/app/login/LoginForm.tsx): Styled **Forgot password?** and reset-password **Back to sign in** like the landing **Already have an account? / Sign in** link treatment (`#94a3b8`, underline, emerald hover, focus ring); tightened vertical spacing after the submit button; removed the footer **By continuing, you agree to our terms of service** line.

### Why

Landing title glow was heavier than auth; dialing back background + wordmark keeps marketing and sign-in consistent without noisy halos. Login tertiary actions read as the same family as landing auth links.

### Status after this push

- `npm run build` from `sideline/` passes.

---

## 2026-04-30 — Landing background grid polish: full-bleed sharp playbook pattern + spacing tune

### What

- [`sideline/components/landing/HeroSection.tsx`](sideline/components/landing/HeroSection.tsx): Added a full-viewport, non-interactive SVG background layer for `/landing` (`fixed inset-0 h-screen w-screen pointer-events-none`) so the pattern is full-bleed instead of appearing boxed by content padding.
- [`sideline/components/landing/HeroSection.tsx`](sideline/components/landing/HeroSection.tsx): Replaced the rounded-cell grid variant with a sharper two-layer playbook grid (`grid-minor` 48px and `grid-major` 192px), removed temporary hash-mark rails/lines, and reduced grid stroke opacity for a subtler texture.
- [`sideline/components/landing/HeroSection.tsx`](sideline/components/landing/HeroSection.tsx): Kept existing emerald glow and edge fade layers unchanged while tightening hero spacing (`pt-6` on the section, `mt-5` before the text/CTA block).

### Why

The landing surface needed depth without visual noise: full-bleed grid texture that does not fight the hero composition, with slightly tighter vertical rhythm above the title and below the hero image.

### Status after this push

- `npm run build` from `sideline/` passes.

---

## 2026-04-30 — Landing hero polish: larger mobile image, wordmark, auth-safe CTA routing

### What

- [`sideline/components/landing/HeroSection.tsx`](sideline/components/landing/HeroSection.tsx): Added the app wordmark at the top using shared `appWordmarkStyle` (auth-screen style parity), increased hero visual prominence with a wider/full-bleed image treatment on mobile, and kept text/CTA content constrained for readability.
- [`sideline/components/landing/HeroSection.tsx`](sideline/components/landing/HeroSection.tsx): CTA hrefs use `buildLoginHref` with optional `next` again, preserving safe return-path behavior through auth flows.
- [`sideline/public/onboarding/hero-showcase-mobile.png`](sideline/public/onboarding/hero-showcase-mobile.png): Added mobile-optimized static hero asset used by `/landing`.
- Image loading metadata updated to match rendered hero width and reduce soft image selection on larger phones.

### Why

Landing needed to better match the approved marketing composition on mobile (larger hero + branded header) without regressing auth handoff behavior or introducing layout overflow issues.

### Status after this push

- `npm run build` from `sideline/` passes.

---

## 2026-04-29 — Landing: static marketing hero, remove carousel, docs + a11y

### What

- [`sideline/app/landing/page.tsx`](sideline/app/landing/page.tsx) + [`sideline/components/landing/HeroSection.tsx`](sideline/components/landing/HeroSection.tsx): **`/landing`** is a **static** full-viewport hero (wordmark, **`hero-showcase.png`**, headline, supporting copy; CTAs use **`buildLoginHref`** so **Get started** / **Sign in** match auth flows and preserve safe **`?next=`** from the landing URL). Section uses **`min-h-[100dvh]`**, **`overflow-x-hidden`**, and **`overflow-y-auto`** so large text / small viewports can scroll instead of clipping.
- [`sideline/lib/landing/appWordmarkStyle.ts`](sideline/lib/landing/appWordmarkStyle.ts): shared glow style for the **The Sideline** wordmark; [`sideline/app/login/LoginForm.tsx`](sideline/app/login/LoginForm.tsx) imports it for the main auth header.
- [`sideline/app/layout.tsx`](sideline/app/layout.tsx): **Barlow** font weights include **700** so the landing headline can use true bold.
- Removed unused carousel stack: **`OnboardingCarousel`**, **`CarouselDots`**, **`GetStartedButton`**, **`SignInLink`**, **`lib/landing/onboardingSlides.ts`**.
- **`sideline/public/onboarding/`**: removed **`slide-1.png`–`slide-4.png`**; added **`hero-showcase.png`** as the single precomposed marketing hero image.
- [`BUILD_CONTRACT.md`](BUILD_CONTRACT.md): repo map describes **`/landing`** as the static marketing hero (not the old carousel).

### Why

Align shipped marketing with the unauth entry contract; drop dead code; fix vertical **`overflow-y-hidden`** clipping risk from review; single source for wordmark styling.

### Status after this push

- `npm run build` from `sideline/` passes.

---

## 2026-04-29 — Film play logger: My Sheet situation chips, situational explainer, sheet overview fetch

### What

- [`sideline/components/film/PlayLoggerV2.tsx`](sideline/components/film/PlayLoggerV2.tsx): **My Sheet** — situation **pill strip** for **every** scenario on the game-bound sheet; tap switches plays below; default tracks **derived** situation when the tab is active; **“Based on {sheet name} play sheet”** subtitle; **`PlayRow`** list per selected scenario. **Situational** — single hint paragraph (no **“You’ve been calling…”** header).
- [`sideline/lib/filmLoggerCatalogFetch.ts`](sideline/lib/filmLoggerCatalogFetch.ts): **`fetchPlaySheetOverview`** wraps existing **`GET /api/playbook/[id]`**.
- [`sideline/lib/filmLoggerQueryKeys.ts`](sideline/lib/filmLoggerQueryKeys.ts): **`playSheetOverview`** cache key.
- [`sideline/lib/coachCopy.ts`](sideline/lib/coachCopy.ts): **`filmLoggerYouveBeenCallingHint`** string for the situational line.
- [`sideline/lib/filmLoggerCallingSuggestions.ts`](sideline/lib/filmLoggerCallingSuggestions.ts): JSDoc wording for situational suggestions.
- [`BUILD_CONTRACT.md`](BUILD_CONTRACT.md), [`DECISIONS.md`](DECISIONS.md): Film logger tabs, copy symbol (**`filmLoggerYouveBeenCallingHint`**), **YOUR CALLS** vs in-logger **My Sheet** wording, engine alignment note.

### Why

Surface the full plan by situation at call time; keep onboarding **YOUR CALLS** language accurate relative to in-app **My Sheet**; keep OS docs aligned with running code.

### Status after this push

- `npm run build` from `sideline/` passes.

---

## 2026-04-29 — Film / modals: Radix tabs, overlay stacking tokens, scroll lock, logger + PlayBrowser

### What

- [`sideline/components/ui/tabs.tsx`](sideline/components/ui/tabs.tsx): Restored **Radix**-based **Tabs** (`TabsPrimitive` forwards) so shared tabs align with **`DECISIONS.md`** (shadcn/ui on Radix). Dependency remains **`@radix-ui/react-tabs`** in [`sideline/package.json`](sideline/package.json).
- [`sideline/lib/constants/designTokens.ts`](sideline/lib/constants/designTokens.ts): New **`overlayZ`** map (bottom nav, tendencies portaled menus, toast host, Film backdrop/shell, Radix dialog band, sheet shell, Radix portaled select/dropdown).
- [`sideline/components/ui/dialog.tsx`](sideline/components/ui/dialog.tsx), [`sideline/components/ui/select.tsx`](sideline/components/ui/select.tsx), [`sideline/components/ui/dropdown-menu.tsx`](sideline/components/ui/dropdown-menu.tsx): Default overlay/content and portaled content use **`overlayZ`** so layers stack above Film full-screen shells.
- [`sideline/app/film/[gameId]/page.tsx`](sideline/app/film/[gameId]/page.tsx): Play logger fixed layers use **`overlayZ.filmBackdrop`** / **`filmShell`**; drive accordion “Log a call” footer uses **`py-3`** only (no extra **`px-4`**) so width matches the starting-field column.
- [`sideline/components/playbook/AddPlayDrawer.tsx`](sideline/components/playbook/AddPlayDrawer.tsx), [`sideline/components/playbook/PlaybookEditor.tsx`](sideline/components/playbook/PlaybookEditor.tsx), [`sideline/app/settings/SettingsPageClient.tsx`](sideline/app/settings/SettingsPageClient.tsx): Hand-rolled sheets use **`overlayZ`** for backdrop/shell parity with the dialog band.
- [`sideline/components/shared/FormationPlaySearch.tsx`](sideline/components/shared/FormationPlaySearch.tsx), [`sideline/components/tendencies/TendenciesFilters.tsx`](sideline/components/tendencies/TendenciesFilters.tsx), [`sideline/components/tendencies/PlaybookFilter.tsx`](sideline/components/tendencies/PlaybookFilter.tsx), [`sideline/components/film/TeamCombobox.tsx`](sideline/components/film/TeamCombobox.tsx): Dropdown/list panels use **`overlayZ`** instead of scattered literals.
- [`sideline/lib/useScrollLock.ts`](sideline/lib/useScrollLock.ts): Scroll lock prefers **`html`/`body` overflow hidden** and **`overscroll-behavior: none`** (optional **`paddingRight`** for scrollbar width) instead of **`position: fixed`** on **`body`**.
- [`sideline/components/film/PlayLoggerV2.tsx`](sideline/components/film/PlayLoggerV2.tsx): Sticky drive header **`z-10`** removed; tab column wrapper **`relative z-[5]`**; **My Sheet** list removes emerald left border.
- [`sideline/components/film/PlayBrowser.tsx`](sideline/components/film/PlayBrowser.tsx): Search/header stacking and mobile hints; explicit states when no playbook, load error, loading skeleton, or no search hits.

### Why

Portaled Radix UI must sit above Film’s high-**z** overlays; tabs should stay on the documented Radix primitive; **`body` position fixed** scroll lock was implicated in iOS input/focus issues inside modals; Film logger layout and Play Browser feedback reduce dead clicks and blank-looking search.

### Status after this push

- `npm run build` from `sideline/` passes.

---

## 2026-04-29 — Settings: session actions outside Account card

### What

- [`sideline/app/settings/SettingsPageClient.tsx`](sideline/app/settings/SettingsPageClient.tsx): Removed the **Session** grouped card. **Sign out** is a full-width **`Button`** (`outline`) below the Account card; **Delete account** is a standalone red text control beneath it. Existing sign-out bottom sheet and delete-account **`ConfirmDestructiveModal`** flows are unchanged.

### Why

Session actions should read as primary page controls, not a second settings list, while keeping account rows grouped in one card.

### Status after this push

- `npm run build` from `sideline/` passes.

---

## 2026-04-29 — Film new game: no score/result; Game Plan calls table: no ORD column

### What

- [`sideline/app/film/new/page.tsx`](sideline/app/film/new/page.tsx): Removed **My score** / **Their score** inputs and **Game result** (W/L) from new game setup; removed dedicated `form` state and those keys from the `POST /api/games` body. `buildGameSetup` now only carries teams, schemes, offensive playbook, date, and optional `play_sheet_id`. Score and result remain on **Edit game details** (`EditGameDetailsModal`).
- [`sideline/components/game-plan/PlayTableHeader.tsx`](sideline/components/game-plan/PlayTableHeader.tsx), [`sideline/components/game-plan/PlayTableRow.tsx`](sideline/components/game-plan/PlayTableRow.tsx), [`sideline/components/playbook/PlaySlot.tsx`](sideline/components/playbook/PlaySlot.tsx): Removed the visible **ORD** column and per-row slot index from the Game Plan calls table; drag-and-drop reorder and API `play_order` behavior unchanged.
- [`sideline/components/shared/AppSkeleton.tsx`](sideline/components/shared/AppSkeleton.tsx): **`NewGameFormSkeleton`** no longer renders skeleton blocks for the removed score and result fields.

### Why

Coaches should not pre-fill final score or outcome when starting a log; visible ordinals on the call list add noise without changing how plays are stored or reordered.

### Status after this push

- `npm run build` from `sideline/` passes.

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
