# Changelog

All notable changes to **The Sideline** (CFB play-calling / film logging assistant) are recorded here. The deployable Next.js app lives in `sideline/`.

---
---


## 2026-08-29 — Discord link on landing footer + in-app sidebar

### What

- Added “Follow on Discord” link with Discord brand mark to landing footer, linking to `discord.gg/a9TeQggFqF`. Carries through to public playbook routes via shared footer (`PlaybooksPageShell`).
- Added “Follow on Discord” as a top-level nav item in the authenticated app sidebar and mobile drawer, positioned immediately above Settings in the utility block. Opens in a new tab.
- New `external?: boolean` flag on the sidebar nav item type for external URL handling (never active, no active dot, `target="_blank"` + `rel="noopener noreferrer"`).
- Shared `DiscordIcon` (Clyde mark, `currentColor`) used in footer, sidebar, and drawer.

### Why

Product updates and community engagement move to Discord in place of the previously-planned email announcement. Landing footer entry gives public visitors a path in; authenticated sidebar entry keeps the community one click away for active users.

### Status

- `npm run build` from `sideline/` passed.
- Discord nav item visible to all authenticated users (not beta-gated).
- No regressions to other nav items, footer links, or active state logic.

## 2026-08-29 — Welcome modal + per-feature onboarding modals

### What

- Added a multi-step **New Enhancements** welcome modal (Film Room → Tendencies → Browse Playbooks) and single-step per-feature onboarding on first entry to Call Sheets, Schemes, Film Room, and Tendencies.
- New `user_onboarding_prefs` table (`welcome_modal_version_seen`, `onboarding_seen`) with `GET/POST /api/user/onboarding-state`; shared Radix `OnboardingModal` shell.
- Gated behind `isFilmRoomBetaUser`; `QA_FORCE_FIRE_MODALS = true` for QA (flip to `false` before rollout).
- QA polish: feature name / “New Enhancements” top bars (bold white), slate Next/Previous/Got it, black fade overlays on visuals, no `NEW ·` / `WELCOME ·` eyebrows, no trailing periods on headings.
- Mockups aligned to real UI — Film Room drive summary cards, Tendencies hero + top plays, Browse Playbooks with team logos, Call Sheets Coach View situations, Schemes detail (side toggle + coach accordion).
- Copy updates for Film Room, Tendencies, Schemes, and Call Sheets.

### Why

Returning users miss new features; new users hit each surface cold. Modals close both gaps with opt-out dismiss and once-per-version / once-per-feature tracking. QA polish tightens coach voice and visual accuracy against shipped screens.

### Status

- `npm run build` from `sideline/` passed.
- Migration applied on the-sideline-app (`user_onboarding_prefs`).
- Welcome takes priority over per-feature; force-fire still on for beta QA.
- No regressions to Film Room, Tendencies, Call Sheets, Schemes, or public playbook routes.

## 2026-08-29 — Play-art Batches 7–8 publish + FIU/Charlotte ingest fixes

### What

- Published **Batch 7** (12 books): Colorado, Colorado State, Eastern Michigan, BYU, Coastal Carolina, Clemson, Delaware, Florida State, Fresno State, Cincinnati, Duke, Florida (+5,526 assets).
- Published **Batch 8** (12 books): Charlotte, Florida International (FIU), Kent State, Georgia State, Houston, Jacksonville State, Georgia Tech, James Madison, Kentucky, Kennesaw State, Hawaii, Indiana (+5,517 assets).
- Manifest **22,236 → 33,279** (+11,043).
- **FIU:** seed load now resolves via playbook catalog (`cfb27-fiu`) instead of deriving `cfb27-florida-international` from the display name; report slugs align to `cfb27-offense-fiu`.
- **Charlotte:** added missing **Gun Stack Y Off** formation (civil.gg / vault; absent from cfb.fan) so DOCX section count matches the seed; sealed that formation to positional plays after a skip override cascade.
- **Deferred:** Georgia Southern (26 DOCX sections vs 27 required).

### Why

Continue the 12-book operator review cadence and unblock FIU/Charlotte first-ingest failures so those books can join the published set.

### Status

- All Batch 7–8 books published at REVIEW 0 after operator confirmation.
- Matching overrides remain local/gitignored.

## 2026-08-28 — Sidebar expandable nav collapses by default

### What

- Authenticated left nav Call Sheets and Schemes groups now start collapsed instead of expanded. Coaches can still expand via the chevron; collapsed parents stay highlighted on nested routes.

### Why

Keeps the signed-in nav compact by default so the primary destinations stay visible without a long sheet/scheme list open on every load.

### Status

- Change limited to default `expanded` state in `AppShellSidebar`; expand/collapse behavior unchanged.

## 2026-08-28 — Call sheet cards: school logos + CFB27 sidebar filter

### What

- Call sheet list cards use `PublicTeamMark` from the linked CFB playbook (team logo when available; initials for defense / generic schemes), matching public Playbooks browse branding. Logo shows on mobile and desktop.
- Call sheet card metadata omits game version (still available on sheet details).
- Authenticated sidebar Call Sheets submenu only lists sheets for the current catalog game version (CFB27).

### Why

School logos are now available; cards should brand by linked playbook rather than a sheet-name initial. Sidebar should surface current-version sheets only so coaches are not hunting across older game catalogs.

### Status

- `npm run build` from `sideline/` passed.
- Play-art asset ingest / manifest updates remain uncommitted.

## 2026-08-28 — Public playbook lookup Pass 3 (global search + search-within-playbook)

### What

- Extended the `/playbooks` home page search to a global search across playbook names, formation names, and play names. Results grouped: Playbooks, Formations, Plays. First 5 per section shown; "See all {N}" expands in place to up to 20 per level from the API.
- Added within-playbook search on `/playbooks/[playbookId]` that filters formations and plays in the current playbook via client-side filter over pre-fetched catalog data.
- New public API endpoints: `GET /api/public/search?q=…` for global search; `GET /api/public/playbooks/[playbookId]/catalog` for full playbook catalog (formations + plays).
- Debounced input (300ms), 2-character minimum for both searches.
- Empty query on home restores the three-section playbook browse; empty query on playbook detail restores the standard formation category list.
- Empty state: "No results for '{query}'" on both searches.

### Why

Completes the public playbook lookup by making the entire catalog queryable. Coaches can find a specific play by name across all playbooks, or narrow a large playbook to a specific formation or play. Pass 3 closes the browse loop that started in Pass 1.

### Status

- `npm run build` from `sideline/` passed.
- Within-playbook search uses Option A (client-side filter over `/catalog` payload) — single-playbook play counts are bounded (~50–200).
- Global search queries the `playbooks` table with parallel ILIKE filters; capped at 20 results per level server-side.
- No regressions to Pass 1/Pass 2 browse, add-to-sheet, cross-references, adaptive chrome, or static generation on non-search routes.

## 2026-08-28 — Authenticated Playbooks browse chrome alignment

### What

- Signed-in playbooks breadcrumbs no longer show Home (call sheets is app home via sidebar).
- Playbooks home (`/playbooks`) shows no breadcrumb when signed in; signed-out keeps Home → `/landing` only.
- Deeper signed-in trails start at Playbooks (playbook → formation → play).
- Pinned search header border aligns with the content column (no double horizontal padding).
- Signed-in top spacing matches Call Sheets, Schemes, Film Room, and Tendencies — uses `<main>` `--app-shell-pt` only, no extra page-level inset.

### Why

Authenticated Playbooks lives in the app shell; breadcrumbs and layout should match other shell list pages instead of marketing-style Home links and extra padding.

### Status

- Play-art asset ingest / manifest updates remain uncommitted.

## 2026-08-28 — Add-to-call-sheet catalog guard + Pass 2 polish

### What

- Adding a play to a call sheet (POST) or swapping a play (PUT) now requires the sheet’s linked CFB playbook to contain that formation and the play within it. Coach-facing errors when the formation or play is missing.
- Public Add to Call Sheet modal only lists call sheets and scheme sides whose linked playbook matches the playbook being browsed; empty state when none match.
- Add to Call Sheet modal uses the content-hugging centered dialog pattern (no unused bottom sheet height) and compact footer spacing.
- Signup-to-save modal follows the same centered / compact footer sizing.
- Playbooks breadcrumb: back button on mobile (`< md`); full breadcrumb trail on tablet/desktop.
- Playbooks home search spans the full container width.
- Authenticated sidebar: Playbooks pinned at the top of the nav with a separator before Call Sheets / Schemes.
- Play detail: formation label matches cross-ref header weight; removed subtitle and play-type badge under the play name.
- Play cross-refs dedupe by playbook (same team no longer listed multiple times for different formations).

### Why

Coaches must not add catalog plays that do not exist in the call sheet’s linked playbook. Pass 2 follow-up QA also tightened modal sizing, mobile browse chrome, nav order, and cross-ref accuracy.

### Status

- `npm run build` from `sideline/` passed.
- Play-art asset ingest / manifest updates intentionally excluded from this commit.
- Pass 3 remaining: global search across playbooks/formations/plays; optional search-within-playbook.

## 2026-08-28 — Public playbook lookup Pass 2 (formation detail, play detail, add CTA, performance, auth nav)

### What

- Built `/playbooks/[playbookId]/[formationId]` formation detail: play tiles grid, cross-references to other playbooks with the same formation.
- Built `/playbooks/[playbookId]/[formationId]/[playId]` play detail: large play art, Add to Call Sheet CTA, cross-references to other playbooks with the same play.
- Add to Call Sheet CTA: signed-out users see signup prompt with return URL; signed-in users see modal picker of their existing call sheets and schemes.
- Modal picker adds the play to the selected call sheet via the existing add-play API; toast confirms.
- Adaptive chrome on `/playbooks/*`: signed-in users see the app sidebar; signed-out users see marketing chrome.
- Added "Playbooks" nav item to authenticated app shell between Film Room and My Tendencies. Visual separator below distinguishes it from surrounding items.
- Wired Pass 1 formation cards to route to formation detail.
- Migrated public playbook routes to static generation with 24h revalidation. Public API endpoints return cache headers (s-maxage=86400, stale-while-revalidate=604800). Play art tiles lazy-load below the fold.
- New public API endpoints: `/api/public/playbooks/[playbookId]/formations/[formationId]/plays`, `/api/public/formations/[formationId]/playbooks`, `/api/public/plays/[playId]/playbooks` (plus play detail under formations).
- Shared browse frame keeps breadcrumbs in a fixed screen position across home, playbook, formation, and play routes.
- Formation detail play tiles use the same 3-column grid as playbook formation lists (no fourth column at large breakpoints).
- Formation play cards show art and play name only — play type badges removed from browse tiles.
- Owned play art watermark: lower opacity and extrabold weight on `SIDELINE.PRO` overlay.

### Why

Pass 1 delivered the browse foundation but didn't let coaches see plays or take action. Pass 2 completes the browse loop (playbook → formation → play → add), makes Playbooks a first-class part of the authenticated app instead of a public-only surface, and moves the entire browse to static generation for near-instant loads.

### Status

- `npm run build` from `sideline/` passed.
- Static generation approach: playbooks and formations pre-generated; play detail on-demand (triples too large for full SSG).
- No regressions to Tendencies, Film Room, authenticated app shell, or Pass 1 QA'd surfaces.
- Pass 3 remaining: global search across playbooks/formations/plays; optional search-within-playbook.

## 2026-08-28 — Playbook lookup Pass 1 QA corrections

### What

- Playbook cards now show team logo (ESPN CDN with initials fallback), team name in bold, mascot in regular weight; card content centered.
- Uniform card sizing across all playbooks; content fills the `max-w-6xl` container edge-to-edge (no horizontal page padding).
- Home header, subhead, and search pinned above a dedicated scroll pane (header does not scroll with the list); transparent header over marketing backdrop (no opaque fill).
- Header and subhead text sizes reduced for a tighter pinned region.
- Search bar clear (X) icon matches the app's existing search input pattern.
- Section headings render in white.
- `/playbooks` breadcrumb: Home > Playbooks. `/playbooks/[playbookId]` breadcrumb: Home > Playbooks > {playbook name}; Home links to `/landing`.
- Renamed "Browse Playbooks" to "Playbooks" across marketing nav, page heading, and breadcrumb.
- Team logo mapping via ESPN CDN URLs (`sideline/lib/publicTeamLogos.ts`); initials fallback in emerald circle for missing logos or non-team playbooks.
- Formation cards uniform width in a 3-column desktop grid (responsive on mobile/tablet).
- Formation names display without category prefix (e.g. "Pistol Empty Tight Stack" → "Empty Tight Stack"); category shown via the section heading only.

### Why

QA feedback on Pass 1 covering card content, layout uniformity, pinned navigation, text sizing, breadcrumb, terminology, team branding, and formation display cleanup — plus follow-up polish on padding, header chrome, and card alignment.

### Status

- `npm run build` from `sideline/` passed.
- No regressions to Pass 1 routes, search, or data flow.
- Team logos load via ESPN CDN; initials fallback covers ESPN misses and non-team playbooks.

## 2026-08-28 — Public playbook lookup Pass 1 (home + playbook detail)

### What

- Built `/playbooks` public route: three sections (offensive team playbooks, alternative offensive playbooks, defensive playbooks), alphabetical within each, with client-side playbook-name search.
- Built `/playbooks/[playbookId]` public route: playbook header, breadcrumb, formations grouped by category. Formations render as non-clickable placeholders in Pass 1; Pass 2 adds formation and play detail routes.
- New public API endpoints: `/api/public/playbooks` and `/api/public/playbooks/[playbookId]/formations`. No auth required, CFB27 only.
- Playbook classification helper distinguishes team vs alternative offense — reuses `GENERIC_OFFENSIVE_PLAYBOOKS` + `side_of_ball` (no formal type column on `playbooks`).
- Replaced the "Coming soon" `/playbooks` empty state.
- Browse Playbooks nav link shows active state on `/playbooks` routes.
- Marketing chrome (`data-marketing-chrome`) and app-shell exclusion extended to `/playbooks/*` detail routes.

### Why

Public playbook lookup is the largest top-of-funnel feature since launch. Matches the browse patterns coaches expect from cfb.fan and Civil Playbook, using The Sideline's design system. Pass 1 establishes routes, data flow, and the two entry screens. Pass 2 adds formation detail, play detail, cross-references, add-to-call-sheet CTA, and search-within-playbook. Pass 3 adds global search.

### Status

- `npm run build` from `sideline/` passed.
- No regressions to landing, authenticated app, or `playbooks` catalog queries used internally.
- Public routes verified on signed-out and signed-in states — marketing chrome renders in both cases.
- Play art deferred to Pass 2 (introduced on formation detail).

## 2026-08-28 — Play-art Batch 5 (Illinois) + Batch 6 publish

### What

- Published **Illinois** (Batch 5 leftover from the matched queue): **REVIEW 0**, 465 assets.
- Initial-ingested and published Batch 6: **Appalachian State**, **Ball State**, **Arkansas State**, **Buffalo**, **Akron**, **Arkansas**, **Auburn**, and **Bowling Green** after manual REVIEW confirmation.
- Manifest **18,138 → 22,236** (+4,098 unique assets; Illinois + Batch 6). `npm run build` passed.
- Operator batch size increased to **12 playbooks** going forward.

### Why

Illinois closed the prior matcher-report queue. Batch 6 starts the Spread / Power Spread / Veer & Shoot first-ingest wave. Larger batches (12) keep operator throughput up against ~60+ remaining untouched DOCXs.

### Status

- Illinois + Batch 6: **REVIEW 0**, published.
- Diagnostic-queue books still excluded: Air Raid, Purdue, Iowa State, Central Michigan, Multiple.


## 2026-08-28 — Play-art Batch 4 publish (8 playbooks)

### What

- Published owned play-art for **Oregon State**, **Kansas**, **Michigan State**, **Wyoming**, **Alabama**, **Minnesota**, **North Dakota State**, and **Louisiana Tech** after manual REVIEW confirmation.
- Skipped cases where cfb.fan reference art was wrong overridden to vault positional plays: Michigan State Gun Bunch X Nasty **MESH SPOT**; Minnesota Singleback Wing **PA BOOT**.
- Formations with ownership-transfer cascades sealed via positional overrides before publish (Oregon State, Kansas, Michigan State, Minnesota, North Dakota State).
- Manifest **14,417 → 18,138** (+3,721 unique assets). `npm run build` passed.

### Why

Batch 4 continues the operator review pass. Skip meant the cfb.fan comparison image was unreliable — the Vault crop still maps to a catalog play via positional order in the DOCX.

### Status

- Batch 4 playbooks: **REVIEW 0**, published.
- **Illinois** (101 REVIEW) remains — sole book left in the current ingest queue.
- Diagnostic-queue books still excluded: Air Raid, Purdue, Iowa State, Central Michigan, Multiple.

---

## 2026-08-28 — Landing page refresh corrections

### What

- Removed four redundant sections from landing: "The Concept" ("What is a Call Sheet?"), "Features" / "Everything you need to run the coaching loop" grid, "Your Game Day Workspace", and "Ready to Start" CTA. Each duplicated information already delivered by Hero, "How It Works", or "Preparation wins games".
- Removed "The Surfaces" feature deep-dive section (also redundant with "How It Works").
- Created `/playbooks` route with a minimal empty state matching landing marketing chrome. Copy: "Browse the full playbook database. Coming soon." Includes a signup CTA.
- Fixed Browse Playbooks nav link routing — `/playbooks` was not a public path in `proxy.ts`, so unauthenticated clicks redirected back to `/landing?next=/playbooks` without rendering a new page. Added `/playbooks` to marketing chrome in `BottomTabNav` and `appShellRoutes`.
- Top nav: Browse Playbooks as an outline button (matching Sign In) with a separator before Sign In; removed center text anchor links (Features, How It Works, About). Footer trimmed to Privacy and Terms only.
- Hero headline: "Study your game. Call it smarter." Metadata description matches.
- Hero subcopy: "Build call sheets, review your film, and study your tendencies. Enhance your college football experience and feel like a real coach." Removed secondary "full coaching loop" tagline.
- Hero visual: fourth Tendencies panel (Win Rate, top play); Tendencies header matches other panels (bold white). Film Room mockup intentionally omitted from hero.
- Hero desktop top padding tightened to `md:pt-0` below the fixed nav.
- How It Works: Build / Call / Study / Improve loop with Film Room and Tendencies mockups. Tendencies illustration drops "Season Overview" header; "Play Type Distribution" uses mobile-style per-type bar rows (Run, Pass, RPO).

### Why

The refreshed landing had too many sections telling the same story in different formats. Each removal tightens the page and lets the remaining sections carry their weight. The Browse Playbooks link failing silently was a first-impression bug on a marketing surface.

### Status

- `npm run build` from `sideline/` passed.
- Landing sections preserved: Hero, "The Problem", "How It Works", "Preparation wins games", Footer.
- `/playbooks` empty state ships now; full public playbook lookup feature ships in a separate pass.
- No regressions to sign-in / sign-up or existing landing behavior.

---

## 2026-08-28 — Landing page refresh

### What

- Updated hero headline to "Study your game. Call it smarter." and broadened subcopy to reflect the full coaching loop.
- Restructured "How It Works" section from the pre-game-only four-step to a Build / Call / Study / Improve loop covering Call Sheets, Coach View, Film Room, and Tendencies.
- Feature explainer section expanded to cover Call Sheets, Schemes, Film Room, and Tendencies (six feature tiles including Playbook Lookup and Coach View).
- Added "Browse Playbooks" to the top nav (link to `/playbooks`; route ships separately).
- Generated new landing mockups for Film Room (drive summary + logged plays) and Tendencies (hero stats + top plays), matching existing landing mockup style.
- "What is a Call Sheet?" section broadened to describe the full workflow (Option B).
- Copy pass throughout to shift positioning from "call sheet builder" to "coaching intelligence companion".

### Why

The landing was correct at launch but presented the app as one feature (Call Sheets) when it's now a full coaching loop with Schemes, Film Room, and Tendencies live. Refreshing positioning is the foundation for the upcoming email announcement and the public playbook lookup route.

### Status

- `npm run build` from `sideline/` passed.
- Mobile responsive across all sections.
- No regressions to authenticated app shell, tendencies, Film Room, or existing marketing chrome.
- Browse Playbooks nav link 404s until the `/playbooks` route ships in a separate pass.

---

## 2026-08-28 — Play-art Batch 3 publish (8 playbooks)

### What

- Published owned play-art for **Washington State**, **Western Kentucky**, **Boston College**, **Iowa**, **Miami**, **Boise State**, **Arizona**, and **Nebraska** after manual REVIEW confirmation.
- Skipped cases where cfb.fan reference art was wrong still published as owned Vault crops via operator overrides using vault positional play names (e.g. Washington State / Boise State Gun Bunch X Nasty; Arizona Singleback Wing).
- Where positional overrides displaced other crops in the same formation, sealed the formation by assigning remaining crops to positional plays so REVIEW cleared without inventing play names.
- Manifest **10,711 → 14,417** (+3,706 unique assets). `npm run build` passed.

### Why

Batch 3 continues the operator review pass for scheme-folder DOCXs. Skip meant the matcher’s cfb.fan candidate was unreliable, not that the Vault card lacked a catalog play — positional vault order is the honest assignment path for those cases.

### Status

- Batch 3 playbooks: **REVIEW 0**, published.
- Diagnostic-queue books still excluded: Air Raid, Purdue, Iowa State, Central Michigan, Multiple.

---

## 2026-08-28 — QA51 container-based scroll and add-play rail (Pass 3)

### What

- Shifted scroll ownership from root `html` to `.app-shell-workspace` on Film game details and call sheet situation details at `md+` (`data-app-shell-container-scroll`). Sidebar stays fixed; main content scrolls in the workspace; add-play / logger rail stays sticky and scrolls via its inner column.
- Mobile (`< md`) retains page-level scroll behavior; other shell routes (Film home, Tendencies, Schemes, Settings) unchanged.
- Fixed the layout shift when a formation is selected from the add-play rail. Root cause: `PlayBrowser` called `scrollIntoView({ block: "start" })` when `pageScrollResults` was on (panel shell), which scrolled the plays header to the top of the page. That call is removed; rail scroll no longer jumps the page.
- Non-sidebar routes (landing, onboarding, viewer chrome, hamburger nav) retain page-level scroll.

### Why

Coaches on desktop expect the sidebar to stay put and the content area to scroll independently — the dashboard mental model. Page-level scroll made the whole shell feel like it was moving when only the main content changed. Container-based scroll also isolates the add-play rail so scrolling one doesn't affect the other. The formation click layout shift compounded the disorientation.

### Status

- `npm run build` from `sideline/` passed.
- No regressions to modals, tendencies, Film Room game lifecycle, or recent QA corrections passes.
- Remaining from the QA51 batch: equal horizontal space on situation details (not flagged recently; deferred).

---

## 2026-08-28 — Film Room Pass 2 QA corrections

### What

- Fixed mobile scroll on Film Room landing and game details. Pass 2 removed `touch-pan-x` only from game-detail stats/tables; Film Room landing cards still had it, and `AppShellChrome` pinned the workspace to `min-h-dvh` flex columns that competed with root scroll. Also ref-counted `useScrollLock` and dropped redundant `padding-right` compensation (layout shift + stuck lock with Radix overlays).
- Drive setup modal now displays the score after the most recent completed drive (or `0 - 0` if no drives yet), sourced from `computeCumulativeDriveScores`.
- Fixed game details header score format: shows `{my_score} - {opponent_score}` from cumulative logged plays (or final game scores when ended) instead of em-dash placeholders reading as `— — – —`.
- Call sheet Add Play drawer (play art browse) no longer shifts layout on open or leaves scroll locked after close — shared `useScrollLock` fix.
- Updated play art placeholder copy to "No image available".

### Why

Pass 2 QA revealed the mobile scroll fix didn't hold and had spread to Film Room landing, pointing to a shell-level rather than surface-level issue. The call sheet play art scroll lock and layout shift shared symptoms with redundant scroll-lock padding compensation. The drive setup score and header format are small but visible bugs coaches would hit every session.

### Status

- `npm run build` from `sideline/` passed.
- No regressions to Pass 1 game lifecycle, Pass A/B tendencies, or recent corrections passes.
- QA51 Pass 3 (container-based scroll + add-play rail) shipped in a later entry on this date.

---

## 2026-08-28 — Film Room UX cleanup (Pass 2)

### What

- Fixed mobile scroll on game details page. Root cause: `touch-pan-x` on the stats strip and drive play tables restricted touch scrolling to horizontal-only, blocking vertical page scroll on iOS when gestures started on those regions.
- Mobile game version select component now fills the horizontal space matching game card width (`w-full`; `md:max-w-xs` on tablet/desktop).
- "Ball spotted at" input in play logger now matches the height of the Own/Opp buttons (`min-h-11`, `items-stretch` row).
- Plays without art now render a placeholder card with the same dimensions and a coach-facing message ("Play art coming soon").

### Why

QA feedback on Film Room mobile experience and play art gaps during batch ingestion. All cosmetic; no data or game state changes.

### Status

- `npm run build` from `sideline/` passed.
- No regressions to Film Room game lifecycle (Pass 1), tendencies (Pass A/B), or the recent QA corrections.
- Remaining from the QA51 batch: call sheet situation details layout (Pass 3).

---


### What

- Published owned play-art for **Baylor**, **Sam Houston**, **South Carolina**, **Kansas State**, **Option**, **Florida Atlantic**, **Louisville**, and **Pro Style** after manual REVIEW confirmation (operator overrides in `matching-overrides/`).
- Review tool: `loadReviewData` maps DOCX crops with `extracted.effectiveReference` (OCR-effective formation order), matching ingest/matcher — fixes Option Wingbone REVIEW cases showing “nothing to review” despite 8 crops on disk.
- Manifest **6,992 → 10,711** (+3,719 unique assets). `npm run build` passed.

### Why

Batch 2 completes the second operator review pass for scheme-folder DOCXs. The Option empty queue was a formation-index mismatch: optional formations omitted from the Vault DOCX shift block order; the review UI was indexing crops against the full reference list.

### Status

- Batch 2 playbooks: **REVIEW 0**, published.
- Diagnostic-queue books still excluded: Air Raid, Purdue, Iowa State, Central Michigan, Multiple.

---

## 2026-08-28 — Film Room Pass 1 QA corrections

### What

- XP plays now show only "XP Made" / "XP Missed" as result options; 2PT plays show only "2PT Made" / "2PT Missed". Regular play result options (yardage, TD, turnovers) are hidden for these scenarios.
- Drive result stays "Touchdown" regardless of XP/2PT outcome. TD is always 6 points; XP made adds 1, 2PT made adds 2, either missed adds 0.
- Per-play badges: "Extra Point" for XP plays, "2-Point" for 2PT plays.
- Drive score column now displays cumulative running game total across all completed drives, not per-drive score.
- Tendencies Run/Pass hero card formatted as `{run_pct}% / {pass_pct}%` (e.g. `42% / 58%`) instead of raw `42/58`.

### Why

Pass 1 conflated the TD scoring event with the XP/2PT attempt: XP was logged as a 1-point FG play, drive result was overwritten from Touchdown to Field Goal, and the score math was wrong. QA also surfaced that drive score display was per-drive rather than cumulative, which coaches expect from a scoreboard-style view.

### Status

- `npm run build` from `sideline/` passed.
- No regressions to non-scoring drives, FG-only drives, existing scoring flows, or Pass A/B tendencies.
- Deferred: one-time migration for Pass 1 XP rows logged as `FIELD_GOAL` + scenario `XP` (reclassify to `XP_MADE` / `XP_MISSED` for accurate replay).

---

## 2026-08-28 — Film Room game lifecycle bug fixes (Pass 1)

### What

- Added `XP` as a new scenario alongside `2 Point`. TD scores 6 points; XP made adds 1; 2PT made adds 2; FG unchanged at 3 (see QA corrections entry for conversion Made/Missed logging).
- Post-TD flow: after an offensive TD, an inline XP/2PT selector appears before the drive closes. 2PT scopes the next play to the `2 Point` scenario.
- Drive setup on a game created with only one side of the ball now offers the opposite side. Selecting the missing side prompts for a playbook; on save, the playbook persists to `game_sessions` for subsequent drives on that side.
- Spot changes after drive setup now propagate to the play logger's field position source. Yardage on subsequent plays calculates against the current spot, not the drive's initial starting field.
- End Game modal autopopulates `my_score` and `opponent_score` from the most recent drive's running score. Coach can override before submitting.

### Why

Four highest-friction bugs in the Film Room live-game loop. XP/2PT flow was missing entirely, coaches couldn't add drives to a missing side of ball, spot changes silently lost data, and End Game required manual score entry despite drives tracking running score.

### Status

- `npm run build` from `sideline/` passed.
- No regressions to existing TD flow, drive setup on both-sides games, drive table SPOT column, or Pass A/B tendencies.
- Deferred: Pass 2 (mobile scroll, input heights, play art placeholder), Pass 3 (QA51 situation details layout).

---

## 2026-08-27 — Tendencies data correctness (Pass B)

### What

- End Game now derives `result` from final scores (`my_score > opponent_score` → W, `<` → L, equal → NULL) alongside `ended_at`. Previously, End Game wrote only scores; `result` defaulted to `"W"` on create and was never updated.
- Create Game no longer defaults `result` to `"W"`; new games start with `result = NULL` until End Game runs.
- `PUT /api/games/[id]` clears `result` on in-progress saves when Edit Game Details would otherwise re-write a stale `"W"`.
- Migration `20260827210000_backfill_game_result_from_scores.sql` corrects production data: ended games with scores disagreeing with stored `result` are synced; in-progress games with stale `"W"` defaults reset to `NULL`. Idempotent.
- Win rate denominator now explicitly excludes in-progress games (`ended_at IS NULL`) and null-result games. Ties are `NULL` and excluded.
- Play type distribution now filters special teams plays (Field Goals, kickoffs, XPs) from the offensive breakdown, matching the existing punt filter.
- Tendencies aggregation no longer hardcodes `"cfb26"` for catalog lookup; the selected `game_version` from the filter chain drives catalog resolution.

### Why

Phase 0 audit surfaced two root causes on the tendencies dashboard: win rate was inflated (~100% for a user with two clear losses) because the write path never synced `result` from scores, and the "Other" bucket in play type distribution was bloated by special teams inclusion and a version mismatch between logged CFB27 games and the hardcoded CFB26 catalog lookup.

### Status

- `npm run build` from `sideline/` passed.
- Migration ready to apply; win rate reflects score-derived truth once backfill runs.
- No regressions to Film Room, Game Plan, or `FilmGameTendenciesBody`.
- Deferred to a future pass: name-ladder gaps on stubborn unmatched play names (audit estimated small residual "Other").

---

## 2026-08-27 — Tendencies filter polish (Pass A follow-up)

### What

- Reordered filter row: Game version, Game scope, Playbook, Opponent (playbook moved before opponent).
- Reordered Key Rates cards: Red Zone %, 3rd Down Conv %, Explosive Play %, Turnover Rate.
- Playbook filter now restricted to playbooks the user has logged games with; narrows further by selected game version.
- Added game version filter to Tendencies. Defaults to most recent version in the user's data. Filters all sections via `game_version` param on tendencies API routes.

### Why

QA feedback on Pass A. Coaches switch between game versions across dynasty saves and need tendencies scoped to the version being played.

### Status

- `npm run build` from `sideline/` passed.
- No regressions to other filters or the offense/defense toggle.
- Playbook filter was already scoped to logged games; follow-up adds `game_version` narrowing.
- Game version default: highest sorted `game_version` in user's games; fallback `cfb27`.
- Defensive defaults on game version filter props prevent hot-reload crashes.

---

## 2026-08-27 — Tendencies dashboard polish (Pass A: visual + copy)

### What

- Renamed nav item from "My Tendencies" to "Tendencies"; swapped icon from Activity to LineChart.
- Removed Games Logged card from hero stats; grid is now 3 cards (Win Rate, Avg YPP, Run/Pass).
- Removed subtitle games count; subtitle now reads "What kind of play caller are you becoming?"
- Replaced Motion Usage key rate with Explosive Play % (plays of 15+ yards / total offensive plays).
- Renamed Red Zone TD% → Red Zone %; redefined as red zone plays ending in a scoring result (TDs + FGs made). Attribution: play-level via `result_tag`.
- Lifted filter row to page-level; on desktop filters render alongside the Offense/Defense switch, on mobile the switch is full-width with filters below.
- Dashboard card headers now use emerald green matching add-play rail formation headers.
- Fixed "All playbooks" filter duplicate key error via option deduplication and stable keys.
- Play Type Distribution now renders as a recharts donut chart on desktop/tablet with a labeled list beside it; mobile retains the bar-list view.
- Rewrote Scouting Report subheading from coach's perspective.
- Moved tendency % into Scouting Report situation card headers; repositioned formation "% of total plays" into the header.
- Updated "Below your [down] avg" copy to include the yards delta ("{delta} yds below your [down] avg").

### Why

QA feedback surfaced a set of visual, copy, and layout issues on the new tendencies dashboard alongside a broken filter. Consolidated polish into one pass; data correctness (win rate calc, "Other" bucket, catalog version) is Pass B.

### Status

- `npm run build` from `sideline/` passed.
- No regressions to WhatsWorking, filter state, or URL playbook param.
- Pass B (data correctness) queued next.

---

## 2026-08-27 — Play-art vault duplicate omit + publish Run & Shoot / Navy

### What

- Review tool: transfer-aware queue (lock transferred play, banner/`D` for vault duplicates, toast on re-queue); pending cases skip crops that already have overrides or omits.
- New `matching-omits/` + matcher method `duplicate-omit`: operator marks a flip/duplicate crop (`D`); ingest PASSes it without a second publish mapping and allows one unfulfilled catalog play per omit (WARN).
- Published **Run & Shoot** and **Navy** owned play-art after REVIEW=0 (ALL GO / WB DIVE kept; twin crops omitted as vault duplicates).
- Manifest **6,254 → 6,992** (+738 unique assets). `npm run build` passed.

### Why

Two Vault cards can share the same printed play name while the catalog has only one. Forcing a different play cleared REVIEW incorrectly; omit is the honest path and unblocks Batch 1 finish for these books.

### Status

- Run & Shoot / Navy: **REVIEW 0**, published.
- Catalog gaps (no unique vault card): Gun Trips **14**; Flexbone Close **QB COUNTER**.

---

## 2026-08-26 — Play-art assets already tracked; ship batch reference JSONs

### What

- Diagnosed why `git add sideline/public/play-art/` appeared to stage nothing: **all 933 JPGs under `public/play-art/cfb27/assets/` are already in HEAD and `origin/main`** (Air Force + USC publishes). `git add` is a silent no-op for tracked, unchanged files — not a gitignore/sparse-checkout block.
- Committed **40** auto-built play-art reference JSON files from recent ingest/batch runs (`scripts/play-art/references/cfb27-offense-*.json`).
- Manifest (`lib/generated/play-art-manifest.json`) was reorder-only vs HEAD (canonical content identical); left unchanged.

### Why

Operators mistook “add does nothing” for an untracked-asset blocker. Production owned-art for AF/USC depends on assets already on origin; newer batch playbooks still need REVIEW → publish before additional crops land in `public/` + the manifest.

### Status

- Disk / HEAD / origin asset counts: **933 / 933 / 933**.
- No `.gitignore`, sparse-checkout, skip-worktree, or assume-unchanged rule was excluding assets.
- `offense/` under `public/play-art/cfb27/` only contains `.DS_Store` (ignored); not the asset store.

---

## 2026-08-26 — Formation OCR fuzzy match length-aware threshold

### What

- `formation-ocr.ts`: length-aware fuzzy/containment gates — distance ≤ max(4, ⌊seedLen×0.25⌋), OCR length ≥ max(4, ⌊seedLen×0.5⌋), unique within threshold; reject personnel-suffix ambiguity (`DEUCE CLOSE` vs Gun/Singleback); reject proper-prefix extensions (`SINGLEBACK WING` ↛ Wing Slot).
- Richer section-OCR failure messages (OCR text + top-3 candidates with reject reasons).
- `npm run play-art:verify-threshold` re-checks ingested playbooks (section OCR only; no trusted-hash overwrite).
- `npm run play-art:batch` + `batch-ingest.ts` (also lands here — see prior changelog note) for sequential source-directory ingestion.

### Why

Batch failures were dominated by “assigned twice” from short OCR fragments (e.g. `ACE` → Gun Ace Rip 4WR, distance 12). Fail closed when uncertain.

### Status

- Verification: **28/28 safe** (incl. Air Force, USC, California, Run & Shoot, Veer & Shoot).
- Re-ran 14 duplicate-section failures: **13 recovered**, **1 still failed** (Air Raid — crop-header disagreement 26.1%, not duplicate-section).
- Recovery rate: **92.9%** (13/14).
- `npm run build` passed.

---

## 2026-08-25 — My Tendencies dashboard

### What

- Added My Tendencies as a top-level nav destination in `appShellNav.ts` (Activity icon, route `/tendencies`, label "My Tendencies").
- My Tendencies nav item is gated behind the Film Room beta flag (`isFilmRoomBetaUser`). Route remains accessible via direct URL; only the sidebar entry is hidden for non-beta users.
- New `MyTendenciesHeroStats` component: 4-card row (Games Logged, Win Rate, Avg YPP, Run/Pass) backed by new `GET /api/tendencies/overview` endpoint.
- New page-level Offense/Defense toggle (`TendenciesSideOfBallToggle`) that filters hero stats and all tab content by side of ball.
- Cross-game tendencies endpoints (`top-plays`, `top-formations`, `predictability`) now accept `side_of_ball` param; aggregation reuses helpers from `tendenciesServer.ts` (`resolveTendenciesGamePool`, drive-side play fetch).
- Renamed "Plays to Reconsider" → "Calls to Reconsider" via `coachCopy.ts`.
- Header updated to "MY TENDENCIES" with subtitle showing live games count.

### Why

Cross-game tendencies were parked off the nav during the Call Sheet reframe. With Film Room back, coaches have per-game tendencies inside each game but no cross-game view. My Tendencies closes the coaching loop by surfacing seasonal patterns without a URL bar detour, and the Offense/Defense toggle mirrors game-detail behavior now that defensive logging is live.

### Status

- `npm run build` from `sideline/` passed.
- Local `npm run dev` already running on `:3000`; `/tendencies` returns 200.
- No regressions to game-detail tendencies (`FilmGameTendenciesBody`) or call sheet suggestion engine.

---

## 2026-08-25 — Play-art batch ingestion script

### What

- New `scripts/play-art/batch-ingest.ts` + `npm run play-art:batch`: recursively walk `source/`, invoke `play-art:ingest -- --source=<docx>` per file, skip already-ingested by matcher report, isolate per-file failures.
- Flags: `--scheme`, `--limit`, `--exclude`, `--force`, `--dry-run`. Progress lines + actionable summary; full subprocess stdout/stderr in `reports/batch-{timestamp}.log`.
- Does not auto-clear REVIEWs (operator uses `play-art:review`). Sequential only.

### Why

Manual single-command ingest does not scale to 100+ DOCXs. Batch converts evening operator work into one monitored command with fail-per-file isolation.

### Status

- Source inventory: **126** DOCXs; matcher reports on disk after test: Air Force, USC, California, Run & Shoot, Veer & Shoot, **Alabama**, **Arizona State**, **Boise State**.
- Test: `npm run play-art:batch -- --scheme="Multiple & Pro Style" --limit=3`
  - Alabama: **404 PASS / 61 REVIEW / 0 FAIL** (86.9%, 2m 2s)
  - Arizona State: **426 / 41 / 0** (91.2%, 2m 12s)
  - Arizona: **FAILED** (OCR duplicate section header “Singleback Wing Slot”) — batch continued
  - Boise State: **414 / 52 / 0** (88.8%, 2m 12s) — filled the limit after Arizona failure
- Idempotency: re-run `--dry-run` marks the three successes as already ingested / would skip.
- Recommended operator batch: **~15–20** playbooks (~30–45 min at ~2.1 min median).

---

## 2026-08-25 — Ampersand slug normalization (`&` → `-and-`)

### What

- Shared `displayNameToTeamSlug`: spaced `&` → `-and-` (`Run & Shoot` → `run-and-shoot`); bare `&` stripped (`Texas A&M` → `texas-am`).
- Renamed seeds `cfb27-run-&-shoot.ts` → `cfb27-run-and-shoot.ts` and `cfb27-veer-&-shoot.ts` → `cfb27-veer-and-shoot.ts` (export consts updated; `source.url` still `run-shoot-off` / `veer-shoot-off`).
- Reference path, matching-overrides path, validation report filename, and related helpers use the same normalizer; reference auto-build writes to the seed-slug path.

### Why

Literal `&` in seed filenames and CLI slugs is fragile across shells and URLs. Normalize before batch ingest.

### Status

- cfb.fan: `run-shoot-off` / `veer-shoot-off` → 200; `run-and-shoot-off` / `veer-and-shoot-off` → 404.
- Run & Shoot validate-only: **246 PASS / 42 REVIEW / 0 FAIL** (288 plays; auto 85.4%).
- Veer & Shoot validate-only: **221 PASS / 31 REVIEW / 0 FAIL** (252 plays; auto 87.7%).
- Air Force: **468 / 0 / 0** (unchanged). USC: **465 / 0 / 0** (unchanged). California slug path unchanged.

---

## 2026-08-25 — Play-art review tool playbook auto-discovery

### What

- Review tool discovers valid `--playbook` slugs from matcher reports on disk (`scripts/play-art/reports/cfb27-offense-{slug}-matching.json`) instead of a hardcoded air-force/usc allow-list.
- Unknown playbook errors list actually available playbooks (and ingest hint); empty discovery gets a clear “ingest first” message.
- Optional `--list` prints discovered playbooks with mapping counts.
- Source DOCX resolved via existing `source-discovery` (same as ingest), so new playbooks work without editing the review tool.

### Why

California (and every future batch playbook) was blocked by a static CLI allow-list even when fully ingested. Discovery should follow ingestion artifacts, not require sync patches.

### Status

- Verified: `--list` shows air-force / california / usc; `--playbook=nonexistent` lists available; air-force + usc load (0 REVIEW); california loads 34 REVIEW.

---

## 2026-08-25 — Play-art reference download resilience + spaced hole-number URLs

### What

- Reference downloads degrade per-candidate: one cfb.fan 403 no longer cascade-FAILs an entire formation. Scoring continues against available candidates; all-refs-failed → REVIEW with reason.
- Play-art references preserve spaced hole numbers (`0 1 TRAP`) via `normalizePlayNameBase` so cfb.fan slugs stay `0-1-trap.jpg` (not `01-trap.jpg` from digit-collapse).
- End-of-ingest download summary logging (`Reference downloads: X succeeded, Y failed`).
- Documented: cfb.fan uses `--` for all literal hyphens including `Y-Flex` → `y--flex` (no slug rule change).

### Why

California’s 44 FAILs were cascade aborts from three `01-trap.jpg` 403s. Root cause was `normalizePlayName` collapsing `0 1 TRAP` → `01 TRAP` before URL build; cfb.fan serves `0-1-trap.jpg`. Y-Flex `y--flex` was already correct on cfb.fan.

### Status

- California validate-only: **433 PASS / 34 REVIEW / 0 FAIL** (was 390 / 33 / 44); auto **92.7%**; reference downloads **467/0**.
- Air Force: **468 / 0 / 0** (unchanged).
- USC: **465 / 0 / 0** (unchanged).

---

## 2026-08-25 — Play-art section matching via header OCR (not position)

### What

- Replaced positional `seed_formation[i] ↔ docx_header[i]` pairing in `extract-docx.ts` with OCR of each section header matched to the seed formation list (play-count disambiguation; crop-vote / personnel-hint fallbacks when middle-only is ambiguous).
- Fail-closed on unidentified sections (no positional fallback). Hail Mary omitted when absent from DOCX.
- Per-crop OCR is validation-only (`validateCropHeadersAgainstSections`).
- Diagnostics: `diff-formation-assignments.ts`, `reconcile-trusted-hashes.ts`; invalidated hashes archive dir `trusted-hashes-invalidated/`.

### Why

California “12 vs 15” was wrong section pairing (Nasty’s 15 cards intact). Positional order ≠ DOCX order; USC trusted store needed reconciliation after the fix.

### Status

- California: 32/32 sections OCR-matched; Bunch X Nasty = 15; 467 owned cards (Hail Mary omitted); matcher **390 PASS / 33 REVIEW / 44 FAIL** (validate-only; FAIL blocks publish).
- Air Force: re-extract identical to published crop→formation (idempotent).
- USC: 26/26 sections; trusted reconciliation **465 confirmed / 0 invalidated**.

---

## 2026-08-25 — Play-art extraction diagnostic (DOCX vs seed order)

### What

- Added `scripts/play-art/diagnostics/` (DOCX inspector, extraction audit, header-order OCR probes). Reports under `diagnostics/reports/`.
- California / Air Force / USC audited without changing `extract-docx.ts`.

### Why

California ingest failed (`Singleback Bunch X Nasty` 12 vs 15). Needed evidence whether crops were dropped or sections mis-paired.

### Status

- California: all 15 Nasty cards present at DOCX header #26; failure is **seed/reference order ≠ Vault DOCX order** (slot 1 paired with Wing Slot Offset’s 12 cards).
- Air Force: no count under/over (no silent trailing drops).
- USC: same order-mismatch class under current seed-ordered reference.
- Fix deferred (Category 2: DOCX-ordered reference or header OCR section match).

---

## 2026-08-25 — Play-art ingest: auto-derive seed from DOCX filename

### What

- Added `scripts/play-art/lib/slug-utils.ts` (filename → team slug → seed slug → reference path).
- `play-art:reference` accepts `--source` / `--team` / `--game` as alternatives to `--seed`; exports `buildReferenceFromSeedSlug` for reuse.
- `play-art:ingest` accepts `--source` alone: derives reference path, auto-builds missing reference from seed (unless `--no-auto-reference`).
- README updated for single-command team + scheme playbook workflow. Existing `--seed` / `--reference` flags unchanged.

### Why

Operator had to hand-build `cfb27-{team}` and pass explicit reference paths per playbook — blocking batch ingestion.

### Status

- Ampersand: `Run & Shoot.docx` → seed `cfb27-run-&-shoot` (matches seed filename; cfb.fan uses `run-shoot-off` in seed URL).
- Aliases: `Miami FL.docx` → `cfb27-miami` via `source-aliases.json`.
- California single-command auto-derive + auto-build works; full extract blocked by **seed/DOCX formation order mismatch** (Nasty’s 15 cards intact; positional slot paired with a 12-card section) — not slug derivation.
- Air Force single-command `--source` validate-only succeeds (backward-compat path also intact).

---

## 2026-08-25 — Formation assignment via crop-header OCR

### What

- Added `sideline/scripts/play-art/formation-ocr.ts`: tesseract OCR on each Vault card header; normalize/match to known formations; size-constrained section remap (Hungarian on OCR votes) with positional fallback.
- Wired into `extractPlayArtDocx` (skip with `PLAY_ART_SKIP_FORMATION_OCR=1`). Validation via `npm run play-art:validate-formation-ocr`.
- Matching overrides remapped by cropId after formation moves (`remapOverridesByCropLocation`).
- Re-ingested Air Force: **PASS 437 / REVIEW 31 / FAIL 0** (93.4% auto-match) vs prior **248 / 220 / 0** (~53%).

### Why

Diagnostic proved AF REVIEW mass was wrong formation labels on count-valid DOCX sections. Printed headers are reliable OCR targets; play identity stays with the visual matcher.

### Status

- Validation sample: operator visual **30/30** headers match assigned formation; OCR fallback 7.5%.
- Requires system `tesseract` (`brew install tesseract`).
- `npm run build` from `sideline/` passed.

---

## 2026-08-24 — Air Force skip diagnostic (formation mismatch dominant)

### What

- Extended `sideline/scripts/play-art/review-tool/` with `--mode=diagnostic`: samples 30 skipped REVIEWs, categorization keys F/C/A/O, report under `review-tool/reports/diagnostic-*.json`. Does not modify review state, overrides, matcher, or ingest.
- Operator pass (`--playbook=air-force --seed=42`): **30/30 F** (formation mismatch), 0 C / 0 A / 0 O. Extrapolated ~202/202 skips are formation misassignment.
- **Recommendation:** next session fixes upstream DOCX formation detection. Cross-formation picker is secondary.

### Why

Full Air Force REVIEW pass skipped 92% (18 confirmed / 202 skipped). Needed evidence before investing in tooling vs ingestion.

### Status

- `npm run build` from `sideline/` passed.
- Report: `scripts/play-art/review-tool/reports/diagnostic-air-force-2026-08-25T03-06-29-693Z.json`.

---

## 2026-08-24 — Play-art REVIEW operator tool

### What

- Local keyboard-driven REVIEW confirmation UI under `sideline/scripts/play-art/review-tool/`.
- Bare `node:http` server (`npm run play-art:review -- --playbook=air-force|usc`) serves owned Vault crop + top matcher candidates; confirmations write `matching-overrides/{slug}.json` (matcher `operator-override` → PASS).
- Session progress persists under `review-tool/state/`; one-level undo; formation play picker for “none of these”.
- Air Force e2e: 10 confirmations → overrides=10; rematch **239/229 → 248/220** PASS/REVIEW (net −9 REVIEW after Hungarian reassignment); auto **53.0%**.

### Why

Matcher V3.2 plateaued on ambiguous REVIEWs. Operator tooling is the ROI path to ship Air Force without loosening gates or bulk `--approve-review`.

### Status

- `npm run build` from `sideline/` passed.
- Tool ready for full Air Force REVIEW pass; not run at full scale this session.

---

## 2026-08-24 — SVG auto-trace prototype (VTracer) — do not proceed

### What

- Isolated prototype under `sideline/scripts/play-art/svg-prototype/`: preprocess (diagram crop + palette + 2× Lanczos), VTracer WASM (`@visioncortex/vtracer`), 20 trusted USC Vault crops, HTML comparison + fidelity assessment.
- Sample coverage: 5 pass / 5 run / 4 option / 3 motion / 3 blocking (TRAP → COUNTER Y LEAD; Curl Flats → CURL COMBO).
- Result: **0 clean / 6 minor / 14 major / 0 unusable**. Mean SVG ~1.8× larger than source JPG. Controller glyphs, yard text, and arrowheads systematically degrade.
- **Recommendation: do not proceed** with whole-card auto-trace as a PNG replacement. Keep owned rasters + watermark; cfb.fan fallback unchanged. No Storage/frontend/matcher changes.

### Why

Prove or disprove SVG ownership via auto-trace before building pipeline infrastructure. Evidence shows cleanup ROI and glyph fidelity fail the product bar.

### Status

- `npm run build` from `sideline/` passed.
- Operator artifacts under `svg-prototype/output/` (gitignored).

---

## 2026-08-24 — Play-art Matcher V3.2 per-hue geometry scoring

### What

- Geometry resolver now scores **per-hue** (warm/cool/other) spatial grids + occupancy as independent signals alongside combined-ink geometry (hybrid Option A weights + Option B confirm-margin boost when max per-hue margin ≥ 0.04).
- Hue buckets retained after source-image histogram evidence (peaks ~65°/225°/345°; warm≈72% / cool≈23% / other≈5%). Per-hue directional histograms stored for diagnostics only (no composite weight — weak incremental separation).
- Confirm path requires V3 margin ≥ **0.005** (blocks weak V3 ties that mis-confirmed AF option collisions). V3 non-negative / local-best gate kept; no geometry-correction override of V3 mis-rankings.
- Calibration set expanded to **61** entries (51 USC V3.1 REVIEW residuals + 10 verified AF), split `verified-correct` vs `verified-ambiguous`.
- Diagnostics: per-hue masks + margins under `scripts/play-art/reports/matcher-v3-debug/geometry/per-hue/`; `matcherVersion: v3.2` / method `geometry-v3.2`.
- USC pure-visual regression: **417 PASS / 48 REVIEW / 0 FAIL**, wrong automatic PASS **0**, geometry-promoted **30** (per-hue-boosted **1**), auto **89.7%** (V3.1 was 414 / 51 / 89.0%).
- Air Force validate-only: **239 PASS / 229 REVIEW / 0 FAIL**, geometry-promoted **48**, auto **51.1%** (V3.1 was 225 / 243 / 48.1%); neg-margin PASS **0**. No provisional REVIEW → trusted-hash; no bulk `--approve-review`.

### Why

Hardest remaining REVIEW families often differ by one colored path element. Combined-ink geometry ties; per-hue channels expose that difference when present (e.g. Load Option warm). Option-arrow near-duplicates (Power G vs Read Opt) remain ambiguous at this resolution.

### Status

- `npm run build` from `sideline/` passed.
- Playbook #3 ingest still deferred — Air Force REVIEW remains material (229).

---

## 2026-08-24 — Play-art Matcher V3.1 geometry resolver (REVIEW only)

### What

- Added fail-closed geometry resolver that runs **only** on Matcher V3 REVIEW cases (does not replace V3; does not loosen V3 PASS gates).
- Play-ink masks from variance-weighted residual ∪ color ink; connected components; 4×3 spatial grid; L/R occupancy; directional histograms; endpoint/topology signatures.
- Color class masks (warm/cool/other) retained for diagnostics; scoring keeps combined color-ink.
- Confirm path (geometry agrees with V3 local-best) and stricter switch path; V3↔geometry conflict → remain REVIEW; negative V3 margin never auto-PASS.
- Operator diagnostics: `npm run play-art:debug-geometry` → `scripts/play-art/reports/matcher-v3-debug/geometry/` (never `public/`).
- USC pure-visual regression: **414 PASS / 51 REVIEW / 0 FAIL**, wrong automatic PASS **0**, geometry-promoted **27**, auto **89.0%** (V3 was 387 / 78 / 83.2%).
- Air Force validate-only: **225 PASS / 243 REVIEW / 0 FAIL**, geometry-promoted **34**, auto **48.1%** (V3 was 191 / 277 / 40.8%); neg-margin PASS **0**. No provisional REVIEW → trusted-hash; no bulk `--approve-review`.

### Why

Hard remaining cases (option / zone / mirrored LT·RT) share near-identical residual energy after V3 registration. Geometry separation recovers confident REVIEW cases without guessing.

### Status

- `npm run build` from `sideline/` passed.
- Do not ingest playbook #3 yet; batch ingestion still not recommended while Air Force REVIEW remains material.

---

## 2026-08-24 — Play-art Matcher V3 (diagnostics + accuracy)

### What

- Added operator diagnostics (`npm run play-art:debug-match`) with visual artifacts under `scripts/play-art/reports/matcher-v3-debug/` (never `public/`).
- Documented V2 failure modes: systematic ~2% scale mismatch, shared formation shell, similar-concept collisions, unused color ink, weak LT/RT spatial cues; `normalized-exact` impractical (avg registered RMSE ≈ 16).
- Matcher V3 (ingest-only): bounded scale+translation registration, formation variance weighting, color-ink + spatial L/R signals, thresholded residual edges. **Same PASS/REVIEW/FAIL gates as V2** (not loosened).
- USC pure-visual regression: **387 PASS / 78 REVIEW / 0 FAIL**, wrong automatic PASS **0**, auto **83.2%** (V2 ≈ 273 / ~190).
- Air Force V3 validate-only: **191 PASS / 277 REVIEW / 0 FAIL**, auto **40.8%** (V2 127 / 341 / 27.1%); negative-margin PASS remains **0**. Provisional Air Force mappings not promoted to trusted-hash.

### Why

V2 was safe but not discriminative enough — correct matches still looked too similar to runner-ups. Goal was better visual separation without relaxing confidence.

### Status

- `npm run build` from `sideline/` passed.
- Do not ingest playbook #3 yet; batch ingestion not recommended until Air Force REVIEW rate drops further via evidence-based matcher work or targeted overrides.

---

## 2026-08-24 — Film Room QA50: rail layout fixes

### What

- Set fixed rail width on desktop with properly scaled play art images.
- Added bottom padding to rail scroll area so the last item has breathing room (all devices, safe-area aware).
- Rail is now sticky/fixed in viewport — does not scroll with page content behind it.

### Why

QA50: play art was oversized in the rail, content hugged the bottom edge, and the rail scrolled away with the page instead of staying anchored.

### Status

- `npm run build` from `sideline/` passed.

---

## 2026-08-24 — Film Room QA49: formation headers + logger tab cleanup

### What

- Unified formation header styling between add-play rail and play logger (logger styling is the reference).
- Play logger with no call sheet: removed tab bar and separator — search bar and formations render directly without unnecessary tab UI wrapping a single view.

### Why

QA49: formation headers were visually inconsistent between the two rails. A single "Browse" tab with no alternative to switch to adds visual noise without value.

### Status

- `npm run build` from `sideline/` passed.

---

## 2026-08-24 — Film Room QA48: shared rail + defensive play types

### What

- Extracted shared rail/sidebar shell component used by both the Call Sheet add-play rail and the Film Room play logger rail. Both now render identically — only inner content differs.
- Fixed rail scroll behavior: content scrolls within the rail container, header stays fixed, page behind does not scroll.
- Fixed defensive play type resolution: defensive plays now show MAN/ZONE/BLITZ/MATCH tags instead of offensive RUN/PASS/RPO.

### Why

QA48: two separate rail implementations created visual inconsistency. Rail scroll was broken — scrolling moved the page instead of the rail content. Defensive play types were showing offensive categories instead of the correct defensive classification (MAN/ZONE/BLITZ/MATCH).

### Status

- `npm run build` from `sideline/` passed.

---

## 2026-08-24 — Film Room QA47: defensive logging polish

### What

- Removed partial film messaging from game details.
- Play logger sidebar now matches the Call Sheet add-play sidebar shell (width, background, header, close behavior).
- Unified badge sizing between result badges (RUN/PASS/RPO) and drive side-of-ball badges (OFF/DEF).
- Added field position input to defensive play logging (reuses offensive field position component).
- Defensive result tag validation rules: INCOMPLETE, PENALTY, PUNT, and INTERCEPTION are standalone (clear other tags when selected). SACK + FUMBLE can coexist. TFL removed — defensive plays use the same loss/gain/turnover result display as offensive plays.
- Defensive play types now resolved from playbook data via shared `playTypeResolution` ladder instead of hardcoded offensive tags (Film play routes use `opponent_scheme` on defensive drives).
- Game details page horizontal spacing now matches Call Sheets detail page layout.

### Why

QA47: defensive logging needed field position parity with offense, result tag combinations needed real-game validation rules, and TFL is a derived stat (not a coach decision). Sidebar and badge inconsistencies broke visual cohesion with the call sheet flow.

### Status

- `npm run build` from `sideline/` passed.

---

## 2026-08-24 — Film Room QA46: bug fixes + UX improvements

### What

- Fixed play logging failure ("couldn't save") caused by the create-play API always sending `result_tags: null` on offensive snaps, which PostgREST rejects when the `result_tags` column is not yet deployed; offensive inserts now omit the field unless defensive tags are present, and play selects use `*`.
- Fixed drive creation investigation: remote DB already has `side_of_ball`; insert path verified — local failures require applying pending Supabase migrations (`20260824120000`, `20260824130000`).
- Added game version filter dropdown to Call Sheets landing page, defaulting to CFB27. Styling matches Film Room landing page.
- Drive cards now show most recent drive at the top.
- Removed "Active" badge from drive cards.
- Play logger renders as a sidebar on desktop/tablet instead of an overlay. Mobile remains full-page modal.
- My Call Sheet tab in play logger now shows play art for each play.

### Why

QA46: drive and play creation were broken after defense passes. Call sheets lacked version filtering. Drive list ordering and active badge did not match coach expectations. Logger overlay was disruptive on larger screens. Call sheet tab lacked play art parity with browse tab.

### Status

- `npm run build` from `sideline/` passed.

---

## 2026-08-24 — Film Room: tendencies offense/defense toggle

### What

- Added offense/defense toggle to the game detail tendencies tab.
- Game tendencies API (`GET /api/tendencies/game/[id]`) accepts a `side_of_ball` filter parameter.
- All tendencies aggregations (play type distribution, top plays, top formations, reconsider, situation breakdowns) filter by the selected side.
- Defaults to offense. Defense view shows empty state when no defensive drives exist.
- Query keys include side-of-ball for correct cache separation.
- Pass 3 of 3-pass defense logging implementation.

### Why

With offensive and defensive plays logged in the same game (Pass 1 + Pass 2), coaches need to see tendencies for each side separately. Mixed aggregation produces meaningless stats.

### Status

- `npm run build` from `sideline/` passed.

---

## 2026-08-24 — Film Room: defensive result tags

### What

- Added `result_tags` column to `logged_plays` table (text array, nullable).
- When logging plays on a defensive drive, the result section shows a multi-select tag picker (Incomplete, Sack, Interception, Fumble, Penalty, Punt, TFL) instead of the offensive yards + outcome UI.
- Multiple tags can be selected per play (e.g., Sack + Fumble).
- Defensive result tags display as badges in the game detail play table.
- Offensive logging remains unchanged.
- Pass 2 of 3-pass defense logging implementation.

### Why

Defensive outcomes are fundamentally different from offensive ones — no yards-gained model, and a single play can produce multiple outcomes. Multi-tag results capture what actually happened.

### Status

- `npm run build` from `sideline/` passed.

---

## 2026-08-24 — Film Room: drive-level side-of-ball + logger routing

### What

- Added `side_of_ball` column to `drives` table (default `'offense'`).
- Drive setup form includes offense/defense toggle.
- Drive cards show side-of-ball indicator.
- Play logger routes to the correct playbook and call sheet based on the drive's side: offensive drives use the game's offensive playbook/call sheet, defensive drives use the defensive ones.
- Pass 1 of 3-pass defense logging implementation.

### Why

Coaches need to log both offensive and defensive plays within the same game. Drive-level side-of-ball is the foundation that defensive results (Pass 2) and tendencies split (Pass 3) build on.

### Status

- `npm run build` from `sideline/` passed.

---

## 2026-08-24 — Fix: call sheet game version display

### What

- Call sheet cards now display the actual stored `game_version` instead of defaulting to CFB27.
- Edit call sheet form hydrates `game_version` from the existing row (fresh `GET /api/playbook/[id]`) instead of catalog lookup.
- Builder/editor metadata and add-play catalog use the sheet’s stored `game_version` via `catalogMetaForSheet()` — not playbook lookup, which prefers CFB27 when both catalog versions exist.
- `usePlaySheetDisplayMeta` fetches authoritative row metadata per card when the list cache omits or stale-versions `game_version`.
- Play sheet list fetch uses `cache: no-store` and a bumped TanStack query key to avoid stale list payloads defaulting to CFB27.
- PATCH `/api/playbook/[id]` applies explicit `game_version` before catalog inference, so saves preserve `cfb26`.

### Why

CFB26 call sheets were incorrectly displaying as CFB27. Editing them without changing the version field silently overwrote `cfb26` to `cfb27`. Both erode trust in data accuracy.

### Status

- `npm run build` from `sideline/` passed.

---

## 2026-08-24 — Film Room QA45: logger UX + edit form fixes

### What

- Play logger browse tab now shows play art for each play, reusing the add-play browse row pattern (`PlayArtImage` + `resolvePlayArtUrl()`).
- Removed Recommended tab from play logger — only My Call Sheet and Browse remain.
- My Call Sheet tab is conditionally hidden when no call sheet is associated with the game; Browse becomes the only/default tab.
- Edit game modal now supports both offensive and defensive playbook/scheme fields, matching create form parity.

### Why

QA45: logger browse should match the visual richness of the call sheet add-play experience. Recommended tab added friction without validated value. Call Sheet tab showing empty when no sheet exists is confusing. Edit form lacked defensive field parity with the create form.

### Status

- `npm run build` from `sideline/` passed.

---

## 2026-08-24 — Film Room beta gate

### What

- Added user-level feature flag for Film Room access (`NEXT_PUBLIC_FILM_BETA_USER_IDS`).
- Film Room nav item hidden from sidebar and mobile drawer for non-beta users.
- `/film` routes redirect non-beta users to `/` (proxy + `app/film/layout.tsx`).
- Guided onboarding (`/film/[gameId]?guided=1`) remains allowed so Play Sheet → Film still works for non-beta users.
- Feature flag utility at `sideline/lib/featureFlags.ts`.

### Why

Film Room shipped alongside play art changes but needs additional QA before public release. User-level gating allows production testing without exposing unfinished features to public users.

### Status

- `npm run build` from `sideline/` passed.

---

## 2026-08-22 — Owned play art: render-time SIDELINE.PRO watermark

### What

- Extended `resolvePlayArtUrl()` to return `{ src, source }` (`owned` | `cfb-fan`) so the UI can distinguish Sideline-owned assets from cfb.fan fallback without URL parsing.
- `PlayArtImage` renders a centered **SIDELINE.PRO** watermark overlay at **9% opacity** for owned art only — scaled to ~85% of the image via container queries; not baked into JPEGs or manifest hashes.
- Added client-side save deterrents on play-art display (context menu block, drag disabled, selection/touch-callout suppressed). cfb.fan fallback art remains unwatermarked.

### Why

Before ingesting additional playbooks, owned play art needs visible Sideline attribution at display time without modifying the ingestion pipeline, content hashes, or shared physical assets.

### Status

- USC owned art: centered **SIDELINE.PRO** watermark verified via resolver (`source: "owned"`).
- Hail Mary and non-USC playbooks: `source: "cfb-fan"` — no watermark.
- `npm run build` from `sideline/` passed.

---

## 2026-08-22 — Owned play art: SHA-256 dedup and source discovery

### What

- Added content-hash asset deduplication at ingest time: final play-card bytes are hashed with **SHA-256** (Node `crypto`); identical images publish once to `public/play-art/cfb27/assets/<hash>.jpg`.
- Manifest entries now include `asset_id` + `asset_path` while keeping one logical row per playbook/formation/play; Add Play lookup unchanged (`gameVersion` + side + playbook + formation + play → `asset_path`).
- Regenerated USC through the existing pipeline: **465** logical mappings, **465** unique physical assets, legacy `public/play-art/cfb27/offense/usc/` tree removed after publish.
- Added read-only recursive source discovery (`npm run play-art:discover`) against `scripts/play-art/source/` with CFB27 seed matching and explicit alias support (`source-aliases.json`, e.g. `Miami FL` → `Miami`).
- Discovery statuses: `MATCH`, `ALIAS`, `UNRESOLVED`, `AMBIGUOUS` — no silent fuzzy matching, no automatic ingestion.

### Why

Scaling beyond the USC pilot requires reusing identical play-art across playbooks without duplicating image files, and licensed DOCX files use human-readable names in nested folders. Operators need discovery before playbook #2 without renaming source files.

### Status

- USC: **26 formations / 465 plays / 465 manifest entries** — PASS; Wildcat U Off Trips and Hail Mary cfb.fan fallback verified.
- Source discovery (local collection): **126** DOCX — **124** MATCH, **1** ALIAS (`Miami FL`), **0** UNRESOLVED, **1** AMBIGUOUS (`Multiple.docx` offense vs defense).
- `npm run build` from `sideline/` passed.

---

## 2026-08-22 — Owned play art pilot: USC ingestion pipeline and Add Play resolver

### What

- Added offline play-art ingestion pipeline under `sideline/scripts/play-art/` — DOCX strip extraction, three-card crop, positional mapping, fail-closed validation, staging → publish, and manifest generation.
- Published **465** USC owned play-art JPEGs under `public/play-art/cfb27/offense/usc/` with matching entries in `lib/generated/play-art-manifest.json`.
- Wired Add Play browse to resolve owned manifest assets first, then cfb.fan, then no image (`playArtUrl.ts`, `playArtManifest.ts`, `AddPlayBrowseRow`, `PlayBrowser`).
- USC source model: **182** embedded **2048×355** strips classified as formation headers or three-card play strips; reference-driven consumption with duplicate title-band drop for overfull formations (Wildcat U Off Trips mirror **DIY REVERSE** slot).
- Operator tools: `npm run ingest:play-art`, `npm run play-art:reference`, `--structure-report`, `--validate-only`, and `debug-formation-map.ts`.

### Why

The first USC pilot failed correctly because embedded DOCX images are wide play strips, not individual plays. This session adapted extraction/segmentation to the real source format while preserving the existing positional mapper, validator, and owned-first app resolver. Non-USC playbooks continue using cfb.fan fallback.

### Status

- USC validation: **26 formations / 465 plays / 465 manifest entries** — PASS.
- Wildcat U Off Trips mapping corrected and visually verified.
- `npm run build` from `sideline/` passed.

---

## 2026-08-22 — Film Room creation form: call sheet picker bottom nav fix

### What

- Replaced offensive/defensive call sheet Radix Select with inline `CallSheetPicker` on `/film/new`, matching the TeamCombobox overlay pattern (absolute menu, drop-up near the bottom edge, stacks above the bottom tab bar).
- Fixes bottom nav layout shift when opening call sheet menus with the form scrolled to the bottom.

### Why

Radix Select scroll-lock and collision handling near the fixed bottom tab bar (`z-40`) shifted the nav; other pickers on the same form already used absolute overlays without scroll lock.

### Status

- `npm run build` from `sideline/` passed.

---

## 2026-08-22 — Schema migration: play_sheets.cfb26_playbook → playbook + layout shift fix

### SQL migration (run manually in Supabase SQL editor)

See `sideline/supabase/migrations/20260822130000_play_sheets_playbook_and_game_version.sql`.

Backfill uses **Option A**: `play_sheets.playbook` stores the catalog playbook name (e.g. "Ohio State"), matched against `playbooks.playbook` to derive `game_version`. Rows without a catalog match default to `cfb26`.

### What

- Renamed `play_sheets.cfb26_playbook` column to `playbook`. Added `game_version` column to `play_sheets` table with NOT NULL constraint. Backfilled existing rows.
- Updated all code references: Supabase queries, TypeScript types, API routes, components.
- Call sheet pickers now filter by game version.
- Fixed root cause of layout shift on all select/dropdown components across the app. Dropdown content now renders as an overlay without affecting document flow.

### Why

Column name `cfb26_playbook` hardcoded a game version into the schema, breaking multi-version support. Layout shift bug persisted through QA42 and QA43 — traced to dropdown content rendering inline instead of as an overlay.

### Status

- SQL migration run manually in Supabase. `npm run build` from `sideline/` passed.

---

## 2026-08-22 — Film Room QA43: follow-up fixes

### What

- Landing page: removed game version filter label, added spacing below filter, fixed version filtering to correctly scope sessions by selected game version.
- Landing page: fixed layout shift when opening game version dropdown.
- Creation form: game version field is now editable (defaults from landing page context, re-scopes pickers on change).
- Creation form: session name field fills full width. Offense/Defense section labels moved inside their containers.
- Creation form: fixed layout shift when opening call sheet dropdowns.

### Why

QA43 follow-up to QA42 Film Room fixes. Layout shift bugs traced to dropdown menus rendering inline instead of as overlays. Filtering bug prevented game version scoping from working correctly.

### Status

- `npm run build` from `sideline/` passed.

---

## 2026-08-22 — Film Room QA42: post-migration fixes

### What

- Landing page: added game version filter dropdown (defaults to most recent version, "All" option). Added defense field on session cards ("Defense: None" when empty).
- Creation form: removed side selector; always shows offensive + defensive sections with at least one required. Introduced call sheet-first model — selecting a call sheet displays associated playbook as read-only ("Offensive Playbook: {name}" / "Defensive Playbook: {name}"). Manual playbook picker available when no call sheet selected.
- Creation form: playbook and call sheet pickers scoped by game version. Game version stored on session.
- Breadcrumbs updated: "Film" → "Film Room."
- Tendencies empty state: merged two copy lines into one.
- Play logger: renamed tabs ("My Call Sheet", "Recommended", "Browse") and reordered with My Call Sheet first. Logger now uses sidebar layout on desktop/tablet and full-page modal on mobile, matching call sheet add-play behavior.
- Fixed ellipsis layout shift on Film Room, call sheet, and scheme cards.
- Sidebar nav: moved Settings above Sign Out.

### Why

QA42 post-migration polish. Creation form restructure aligns with preparation-first product positioning — call sheet is the plan, playbook is the fallback. Game version filtering ensures CFB27 is the default experience.

### Status

- `npm run build` from `sideline/` passed.

---


### What

- Verified `FilmGameTendenciesBody` is wired into the Tendencies tab of the game detail shell (lazy-mount on tab switch).
- Confirmed all sub-components render via the existing body: play type distribution, top plays, top formations, reconsider plays, situation breakdowns, and pagination.
- Confirmed query invalidation: page `refresh()` invalidates `tendenciesQueryKeys.all` after play log/delete — no new invalidation path added.
- No modifications to shared `components/tendencies/` files or the tendencies API.

### Why

Final pass of 4-pass Film Room shell migration. Closes the coaching loop: log plays → see analysis. Tendencies are the payoff that answers "what am I doing and is it working?"

### Status

- `npm run build` from `sideline/` passed.
- Film Room migration complete: session list, game detail shell, play logger, and in-game tendencies all functional in the new app shell.

---

## 2026-08-22 — Film Room Pass 3: play logger integration

### What

- Verified `PlayLoggerV2`, `PlayBrowser`, and `YardageSheet` integration through `FilmPlayLoggerOverlay` in the decomposed game detail shell from Pass 2.
- Confirmed full logging loop wiring: Browse, My Sheet, and Situational paths → ball spot → result → POST; page `refresh()` invalidates drives, tendencies, and `filmLoggerQueryKeys`.
- Added `key={activeDrive.id}` on `PlayLoggerV2` in `FilmPlayLoggerOverlay` so logger state resets when switching drives without closing the overlay.
- No changes to logger internals, `PlayBrowser` public interface, or API routes — integration and verification only.

### Why

Pass 3 of 4-pass Film Room shell migration. The play logger is the core coaching loop; this pass confirms it works correctly within the restructured game detail shell.

### Status

- `npm run build` from `sideline/` passed.

---

## 2026-08-22 — Film Room Pass 2: game detail shell + drive management

### What

- Decomposed `app/film/[gameId]/page.tsx` into focused components: `GameDetailHeader.tsx` (matchup, stats, actions), `DriveList.tsx` (drive cards, expand/collapse, play tables, drive CRUD), plus `FilmDriveSetupOverlay.tsx`, `FilmPlayLoggerOverlay.tsx`, and `FilmEndGameScoreDialog.tsx`.
- Shared helpers moved to `lib/filmGameDetailHelpers.ts` (drive outcome labels, tab/action classes, date formatting).
- Page file is now a thin orchestrator: data loading, tab state, coordination.
- Drive management behavior preserved: create, delete, edit field position, inline scores, outcome badges, play tables.
- Tab navigation: "Drive Summary" (default) and "Tendencies" per `.cursorrules`.
- Verified no guided onboarding references remain in Pass 2 files.

### Why

Pass 2 of 4-pass Film Room shell migration. Decomposition creates a clean structure for Pass 3 (play logger) and Pass 4 (tendencies) to wire into without fighting a monolithic page file.

### Status

- `npm run build` from `sideline/` passed.

---

## 2026-08-22 — Film Room Pass 1: session list + creation flow migration

### What

- Migrated Film Room session list and creation flow into the new app shell.
- Creation flow: default side to Offense, auto-generate session name from team matchup, surface recently used teams in pickers, stripped opponent playbook selection.
- Edit modal updated to match stripped creation flow.
- Removed import flow entry points from session list.
- Deleted legacy `film/new/preview` redirect stub.
- API: opponent playbook now optional on create and update.
- Enabled **Film Room** in app shell sidebar/drawer (`/film`) — removed Coming Soon badge and dead link.
- Restyled Film Room landing to match Call Sheets / Schemes home (header CTA, workspace shell, card list).
- Film game cards use the shared home card chrome without team initial avatars.

### Why

Pass 1 of 4-pass Film Room shell migration. Streamlines session creation for the most common use case (offensive play-calling review for a dynasty coach playing the same team repeatedly).

### Status

- `npm run build` from `sideline/` passed.

---

## 2026-08-21 — Film Room pre-migration: dead code cleanup

### What

- Deleted orphan `play-logger/` components (superseded by `PlayLoggerV2`): `CompactGameStateBar`, `ResultGrid`, `YardsInput`, `PlayLogFeed`, `PlayLogFeedRow`.
- Deleted orphan store `gameStore.ts`, orphan lib `filmResultTags.ts`.
- Deleted orphan API routes: `api/film/playbook`, `api/import/validate`, `api/import/template`.
- Removed guided onboarding: `GuidedFirstDriveInsight.tsx`, `guidedOnboardingInsight.ts`, `guidedFirstDriveCopy.ts`, `onboardingDismissed.ts`, and related references in `[gameId]/page.tsx` and `lastGamePrefsStore.ts`.

### Why

Pre-migration cleanup before Film Room shell migration. Guided onboarding removed by product decision — original "log your first drive" framing no longer fits the preparation/decision support product direction.

### Status

- Deletion only; no feature or behavior changes to active surfaces.

---

## 2026-08-21 — Shell nav: Call Sheets / Schemes labels + Headset icon

### What

- **[`coachCopy.ts`](sideline/lib/coachCopy.ts):** Home/nav titles are **Call Sheets** and **Schemes** (was My Call Sheets / My Schemes); related scheme-form hints updated.
- **[`appShellNav.ts`](sideline/lib/navigation/appShellNav.ts) / [`MarketingWorkspaceIllustration.tsx`](sideline/components/marketing/MarketingWorkspaceIllustration.tsx):** Schemes nav uses Lucide **`Headset`** (was `Layers`).
- **[`AppShellSidebar.tsx`](sideline/components/shared/AppShellSidebar.tsx) / [`AppMockup.tsx`](sideline/components/marketing/AppMockup.tsx):** Fallbacks and marketing mock match the new labels.

### Why

Shorter shell labels and a distinct Schemes affordance next to Call Sheets and Film Room.

### Status

- Copy/icon-only; no schema or API changes.

---

## 2026-08-21 — Film Room nav uses Video icon

### What

- **[`appShellNav.ts`](sideline/lib/navigation/appShellNav.ts) / [`MarketingWorkspaceIllustration.tsx`](sideline/components/marketing/MarketingWorkspaceIllustration.tsx):** Film Room shell nav item uses Lucide **`Video`** (was `Eye`).

### Why

Match Film Room naming with a clearer film/video affordance in the sidebar and marketing shell mock.

### Status

- Icon-only change; no build gate required beyond existing app compile.

---

## 2026-08-21 — QA41 follow-up: situation padding, one scrollbar, PLAY label

### What

- **[`CallSheetBuilderSituationWorkspace.tsx`](sideline/components/playbook/CallSheetBuilderSituationWorkspace.tsx) / [`designTokens.ts`](sideline/lib/constants/designTokens.ts) / [`globals.css`](sideline/app/globals.css):** Situation content uses equal `--app-shell-px` inset L/R. With Add Play open, the workspace bleeds past `.app-shell-main` padding on **both** sides (`gap-0` to the rail) so left is not double-padded vs the rail.
- **[`PlayBrowser.tsx`](sideline/components/film/PlayBrowser.tsx) / [`AddPlayDrawer.tsx`](sideline/components/playbook/AddPlayDrawer.tsx) / [`CallSheetBuilderSituationBrowsePanel.tsx`](sideline/components/playbook/CallSheetBuilderSituationBrowsePanel.tsx):** Dropped viewport height-lock + dual column overflow. Page owns vertical scroll; panel Add Play uses `pageScrollResults` with sticky search. Mobile modal nested scroll unchanged. Documents decision adjust in **`DECISIONS.md`**.
- **[`PlayTableHeader.tsx`](sideline/components/game-plan/PlayTableHeader.tsx):** PLAY (and sibling header labels) use flex `items-center` so the label centers when row cells get `md:min-h-12`; Add Play CTA stays trailing/right-aligned.
- **[`coachCopy.ts`](sideline/lib/coachCopy.ts):** Sidebar / menu coming-soon item label is **Film Room** (was Review).

### Why

QA41 follow-up: unequal situation insets (especially with Add Play open), two vertical scrollbars from independent column scroll, PLAY sitting high in the taller header row, and clearer Film Room naming in the shell nav.

### Status

- `npm run build` from `sideline/` passed.

---

## 2026-08-21 — QA41: Collapsible sidebar Call Sheets / Schemes groups

### What

- **[`AppShellSidebar.tsx`](sideline/components/shared/AppShellSidebar.tsx):** My Call Sheets and My Schemes each get an independent expand/collapse control (Lucide `ChevronDown`, local `useState`, `aria-expanded` / `aria-controls`). Group headers stay visible and keep their list links; nested sheet/scheme links and New Call Sheet / New Scheme hide when collapsed. When a group is collapsed, the header uses section builder-path active styling so nested routes still show a current-location cue. No persistence, global store, or mobile hamburger changes (`AppShellSidebar` remains `md+` only).

### Why

QA41: long Call Sheet and Scheme lists clutter the persistent tablet/desktop sidebar; coaches need to collapse either group without losing primary nav structure or active-route awareness.

### Status

- `npm run build` from `sideline/` passed.

---

## 2026-08-21 — QA41: Add Play + situation detail refinement

### What

- **[`PlayTableHeader.tsx`](sideline/components/game-plan/PlayTableHeader.tsx):** Situation header Add Play is the trailing flex item so its right edge aligns with the remove × column (same row grid; handler/capacity unchanged).
- **[`globals.css`](sideline/app/globals.css) / [`CallSheetBuilderSituationWorkspace.tsx`](sideline/components/playbook/CallSheetBuilderSituationWorkspace.tsx):** Open Add Play rail flex-grows within percentage caps and bleeds past `.app-shell-main` right padding + centering gap to the app-shell workspace edge (`--with-browse`).
- **[`AddPlayBrowseRow.tsx`](sideline/components/playbook/AddPlayBrowseRow.tsx):** Play name and actions sit above featured play art (QA40 art size preserved).
- **[`AddPlayDrawer.tsx`](sideline/components/playbook/AddPlayDrawer.tsx) / [`designTokens.ts`](sideline/lib/constants/designTokens.ts) / [`AppShellSidebar.tsx`](sideline/components/shared/AppShellSidebar.tsx):** Selected formation heading reuses active sidebar nav typography/`text-white` (`appShellNavItemActiveTextClass`) without the emerald pill background; sidebar keeps the full active fill token.

### Why

QA41: larger play art works; remaining polish was header CTA alignment, unused right-side rail space, name/actions hierarchy, and formation context that did not match active nav styling.

### Status

- `npm run build` from `sideline/` passed.

---

## 2026-08-21 — QA40: Play art browse refinement + header Add Play

### What

- **[`PlayArtImage.tsx`](sideline/components/playbook/PlayArtImage.tsx) / [`AddPlayBrowseRow.tsx`](sideline/components/playbook/AddPlayBrowseRow.tsx):** Featured stacked play-art layout (`aspect-[16/10]`) for Add Play results. Play name stays; formation label only when disambiguating search; RUN/PASS/RPO badge removed from these rows. Failed art still hides the `<img>` and keeps the reserved slot.
- **[`PlayBrowser.tsx`](sideline/components/film/PlayBrowser.tsx):** Formation drill-in omits redundant formation context; search passes `showFormationLabel`. Add-play play lists are card-shaped (no browse `PlayTableHeader`).
- **[`globals.css`](sideline/app/globals.css) / [`CallSheetBuilderSituationWorkspace.tsx`](sideline/components/playbook/CallSheetBuilderSituationWorkspace.tsx):** Add Play side rail grows via `--app-shell-situation-browse-panel-width` (`21.25rem` md → `28rem` lg → `36rem` xl) with percentage caps; `xl:gap-0` so the open rail reaches the workspace right edge. Mobile drawer unchanged; independent column scroll preserved.
- **[`PlayTableHeader.tsx`](sideline/components/game-plan/PlayTableHeader.tsx) / [`PlaybookEditor.tsx`](sideline/components/playbook/PlaybookEditor.tsx):** Situation play table header gains Add Play wired to existing `openAdd` + 25-play capacity. Dashed Add Play row kept. QA situation editor fixture updated.

### Why

QA40: tiny thumbs and a narrow rail made play art hard to use; coaches also needed an Add Play entry point in the situation table header without a second add flow.

### Status

- `npm run build` from `sideline/` passed.

---

## 2026-08-21 — Add-play browse: cfb.fan play art thumbnails

### What

- **[`playArtUrl.ts`](sideline/lib/playArtUrl.ts):** Client-side URL builder for cfb.fan play art from existing catalog fields (`formation`, formation type via `group`, `play_name`, `game_version`, `side_of_ball`). Slug rules: lowercase → literal `-` to `--` → spaces to `-`.
- **[`PlayArtImage.tsx`](sideline/components/playbook/PlayArtImage.tsx) / [`AddPlayBrowseRow.tsx`](sideline/components/playbook/AddPlayBrowseRow.tsx):** Fixed-size thumb beside the play name in add-play browse (formation list + search). Failed loads hide the `<img>` but keep the slot (no broken icon, no row shift). Missing URL stays text-only.
- **[`PlayBrowser.tsx`](sideline/components/film/PlayBrowser.tsx) / [`AddPlayDrawer.tsx`](sideline/components/playbook/AddPlayDrawer.tsx) / [`CallSheetBuilderSituationBrowsePanel.tsx`](sideline/components/playbook/CallSheetBuilderSituationBrowsePanel.tsx) / [`PlaybookEditor.tsx`](sideline/components/playbook/PlaybookEditor.tsx):** Threads `catalogGameVersion` + existing `catalogSideOfBall` into the add-play path only. No Coach View, situation detail rows, DB, scraper, or API changes.

### Why

Text-only play names require coaches to already know the art; thumbnails make browsing a call sheet playbook intuitive and competitive with tools that show formation/play diagrams.

### Status

- `npm run build` from `sideline/` passed.

---

## 2026-07-19 — Situation detail: independent column scroll + pinned add-play search

### What

- **[`CallSheetBuilderSituationWorkspace.tsx`](sideline/components/playbook/CallSheetBuilderSituationWorkspace.tsx) / [`globals.css`](sideline/app/globals.css):** Tablet/desktop situation detail locks to a viewport-height shell (`.app-shell-situation-workspace`) so the main play list and add-play side rail each scroll independently instead of sharing page scroll.
- **[`CallSheetBuilderSituationBrowsePanel.tsx`](sideline/components/playbook/CallSheetBuilderSituationBrowsePanel.tsx) / [`AddPlayDrawer.tsx`](sideline/components/playbook/AddPlayDrawer.tsx) / [`PlayBrowser.tsx`](sideline/components/film/PlayBrowser.tsx):** Panel mode fills the rail height; PlayBrowser owns a full-height results scroller with search pinned above (`bg-slate-950`). Mobile modal/drawer add-play unchanged; rail width unchanged (`21.25rem`).

### Why

Scrolling add-play results was moving the situation play list (and vice versa), and an earlier rail-level scroll owner made the wheel hit target too small.

### Status

- `npm run build` from `sideline/` passed.

---

## 2026-07-19 — Coach View empty situations + situation Browse cleanup

### What

- **[`CallSheetCoachView.tsx`](sideline/components/playbook/CallSheetCoachView.tsx):** Coach View hides situations with **0 plays** (client-side filter before render). Empty call sheets still show the existing Coach View empty state. Situations tab unchanged.
- **Situation detail workspace:** Removed the redundant **Browse Playbook** toolbar control from situation detail (`CallSheetBuilderSituationToolbar` deleted). Dashboard / landing Browse Playbook and the add-play side rail remain.

### Why

Coach View is a glanceable game-day surface — empty situations add noise. Coaches add plays via the existing add-play flow, so Browse Playbook on situation detail was redundant.

### Status

- `npm run build` from `sideline/` passed.

---

## 2026-07-19 — QA38 Call Sheet builder fixes

### What

- **[`playbookUtils.ts`](sideline/lib/playbookUtils.ts):** Uniform **25-play** cap for every situation (including Go-To Plays); removed per-scenario slot overrides. Client and **[`plays/route.ts`](sideline/app/api/playbook/[id]/plays/route.ts)** share `maxSlotsForSheetScenario`.
- **[`PlaybookEditor.tsx`](sideline/components/playbook/PlaybookEditor.tsx):** After add/remove, optimistically patches the sheet + scenario TanStack Query caches so max-checks use live play-array length (fixes false “full” warnings and exceeding max). Situation detail header shows **`n/25`**, amber at capacity.
- **[`PlayBrowser.tsx`](sideline/components/film/PlayBrowser.tsx):** Clear (X) control on the add-play / browse search input.
- **[`PlayTableRow.tsx`](sideline/components/game-plan/PlayTableRow.tsx) / [`PlaySlot.tsx`](sideline/components/playbook/PlaySlot.tsx) / situation header & toolbar:** Removed RUN/PASS/RPO badges and aggregate type summary pills from situation detail; browse/search results unchanged.
- **Builder chrome / [`globals.css`](sideline/app/globals.css):** Tablet header shrinks cleanly beside the browse side rail (responsive rail width, truncation, compact Browse label).
- **Call Sheet QA:** Fixture fills situations to the shared max; Coach View preview `initiallyExpanded`; refreshed **`qa-screenshots/call-sheet/*`**.

### Why

QA38 coach feedback: caps and counts must be trustworthy, situation detail should stay uncluttered, and tablet browse layout must not clip the header.

### Status

- `npm run build` from `sideline/` passed.

---

## 2026-07-02 — Landing page copy refresh for CFB27

### What

- **[`landing/page.tsx`](sideline/app/(marketing)/landing/page.tsx), [`marketingHeroCopy.ts`](sideline/lib/marketingHeroCopy.ts), marketing components:** Updated landing copy for CFB27, offense/defense call sheets, schemes, and custom situations — hero, What Is a Call Sheet, How It Works (4 steps), features, workspace, Why Sideline, and final CTA.
- **[`Hero.tsx`](sideline/components/marketing/Hero.tsx), [`Problem.tsx`](sideline/components/marketing/Problem.tsx):** Coach-facing messaging shifts from memory to preparation — “Stop guessing and start playing with a plan” and “Calling plays shouldn’t rely on guessing.”
- **[`FeatureGrid.tsx`](sideline/components/marketing/FeatureGrid.tsx):** Four feature cards — Digital Call Sheets, Schemes, Situational Organization, Fast During Gameplay.
- **[`MarketingWorkspaceIllustration.tsx`](sideline/components/marketing/MarketingWorkspaceIllustration.tsx):** Workspace mock shows My Call Sheets, My Schemes, Review (Coming Soon), and Settings; browse playbook moved to the header row.
- **[`MarketingCallSheetIllustrations.tsx`](sideline/components/marketing/MarketingCallSheetIllustrations.tsx):** Situation helper text uses finalized viewer copy; aria label reads “Custom situations.”
- **[`icon.svg`](sideline/app/icon.svg):** New SL favicon; removed legacy `favicon.ico`.

### Why

The landing page is the first impression for new users during the CFB27 launch window — copy needed to reflect defense, schemes, and the current product without CFB26 or “tactical situations” language.

### Status

- `npm run build` from `sideline/` passed.

---

## 2026-07-02 — Hide onboarding from active user flow

### What

- **[`onboardingDismissed.ts`](sideline/lib/onboardingDismissed.ts):** Added **`ONBOARDING_ENABLED`** (`false`) as the product gate to skip onboarding while keeping all implementation in the repo.
- **[`app/page.tsx`](sideline/app/page.tsx), [`HomeOnboardingGate.tsx`](sideline/components/shared/HomeOnboardingGate.tsx):** Authenticated **`/`** redirects to **`/playbook`** when onboarding is disabled; carousel eligibility logic preserved for re-enable.
- **[`app/playbook/new/page.tsx`](sideline/app/playbook/new/page.tsx), [`PlaybookEditor.tsx`](sideline/components/playbook/PlaybookEditor.tsx), [`app/film/[gameId]/page.tsx`](sideline/app/film/[gameId]/page.tsx):** **`?onboarding=1`** and **`?guided=1`** query flags are ignored when onboarding is off so direct URLs do not surface guided chrome.

### Why

Onboarding is out of the MVP path — new coaches should land in the app after auth while carousel, guided play sheet, and guided film code stay available for future use and **`/qa/onboarding/*`** capture.

### Status

- `npm run build` from `sideline/` passed.

---

## 2026-07-01 — Terms of Service and Privacy Policy pages

### What

- **[`sideline/app/(marketing)/terms/page.tsx`](sideline/app/(marketing)/terms/page.tsx), [`sideline/app/(marketing)/privacy/page.tsx`](sideline/app/(marketing)/privacy/page.tsx), [`LegalDocumentPage.tsx`](sideline/components/legal/LegalDocumentPage.tsx):** Public `/terms` and `/privacy` pages with full legal copy (EA disclaimer, Google OAuth data, Supabase storage), dark-theme typography, and marketing layout chrome.
- **[`MarketingFooter.tsx`](sideline/components/marketing/MarketingFooter.tsx):** Footer links to Terms of Service and Privacy Policy; removed placeholder Contact link.
- **[`LoginForm.tsx`](sideline/app/login/LoginForm.tsx):** Agreement line at the bottom of the sign-in surface linking to both pages.
- **[`proxy.ts`](sideline/proxy.ts), [`appShellRoutes.ts`](sideline/lib/navigation/appShellRoutes.ts):** `/terms` and `/privacy` are public and skip authenticated app shell.

### Why

Legal requirement before strangers sign up — coaches must be able to read terms and privacy policy from the landing page and auth flow without an account.

### Status

- `npm run build` from `sideline/` passed.

---

## 2026-07-01 — Schemes: group offensive and defensive call sheets

### What

- **[`20260701160000_schemes.sql`](sideline/supabase/migrations/20260701160000_schemes.sql), [`schema.sql`](sideline/supabase/schema.sql):** Added **`schemes`** and **`scheme_call_sheets`** tables with RLS, indexes, and account-delete cascade.
- **[`sideline/app/api/schemes/`](sideline/app/api/schemes/), [`schemeApiHelpers.ts`](sideline/lib/schemeApiHelpers.ts):** Scheme list, create, update, delete, and attach/replace call sheets by side of ball.
- **[`sideline/app/schemes/`](sideline/app/schemes/), [`sideline/components/schemes/`](sideline/components/schemes/):** Scheme home (empty state + cards), create/edit form with call sheet pickers, detail view with offense/defense toggle and embedded coach view, and **Add to Scheme** modal from call sheet cards.
- **[`AppShellSidebar.tsx`](sideline/components/shared/AppShellSidebar.tsx), [`appShellNav.ts`](sideline/lib/navigation/appShellNav.ts), [`schemeNav.ts`](sideline/lib/navigation/schemeNav.ts):** **My Schemes** sidebar group (scheme list + **New Scheme**), mobile hamburger link, and route helpers.
- **[`PlaybookEditor.tsx`](sideline/components/playbook/PlaybookEditor.tsx), [`playSheetNav.ts`](sideline/lib/navigation/playSheetNav.ts), [`SchemeDetailView.tsx`](sideline/components/schemes/SchemeDetailView.tsx):** Editing a sheet from a scheme passes **`?from=`** so back returns to scheme detail; header uses **`sheetCfb26Playbook`** / **`cfb26_display`** for playbook subtitle; separate overview query key avoids React Query cache collision that showed **Call sheet** instead of the sheet name.
- **[`coachCopy.ts`](sideline/lib/coachCopy.ts):** Scheme and add-to-scheme coach-facing copy; coach view empty state copy tweak.

### Why

Coaches need to pair offensive and defensive call sheets into named schemes for quick access on game day, without losing their place when editing a sheet from within a scheme.

### Status

- `npm run build` from `sideline/` passed.

---

---

## 2026-07-01 — Call Sheet: fix situation reorder persistence

### What

- **[`CallSheetSituationGrid.tsx`](sideline/components/playbook/CallSheetSituationGrid.tsx):** Situation edit-mode reorder uses pointer events on the drag handle (replacing unreliable HTML5 drag on a nested handle). Go-To Plays lock uses `isGoToPlaysSituation`; drop targets resolve via `data-situation-id` rows.
- **[`PlaybookEditor.tsx`](sideline/components/playbook/PlaybookEditor.tsx):** Optimistic TanStack cache sync on reorder; `pinGoToPlaysFirst` when entering edit mode; skip no-op reorder mutations.
- **[`playbookUtils.ts`](sideline/lib/playbookUtils.ts):** Shared `pinGoToPlaysFirst` and `reorderSituationBlocks` helpers — Go-To stays at index 0, sequential `scenario_order` on every affected row.
- **[`situationApiHelpers.ts`](sideline/lib/situationApiHelpers.ts):** `isGoToPlaysSituation` accepts optional `is_locked` for sheet blocks.

### Why

Coaches could not reliably reorder default situations after drop — HTML5 DnD failed on the small handle (especially Safari/touch), and reorder payloads could fail API validation when Go-To was not pinned first.

### Status

- `npm run build` from `sideline/` passed.

---

## 2026-07-01 — Play Sheet: Goal Line and Hail Mary / Prevent at bottom of add-play formations

### What

- **[`sideline/lib/playbooks/formation-types.ts`](sideline/lib/playbooks/formation-types.ts), [`PlayBrowser.tsx`](sideline/components/film/PlayBrowser.tsx):** Add-play formation browse pins **Goal Line** and **Hail Mary** to the bottom for offense, and **Goal Line** and **Prevent** for defense. Side comes from catalog metadata when available, or is inferred from formation groups.
- **[`AddPlayDrawer.tsx`](sideline/components/playbook/AddPlayDrawer.tsx), [`PlaybookEditor.tsx`](sideline/components/playbook/PlaybookEditor.tsx):** Thread **`catalogSideOfBall`** into the browse UI.

### Why

Situational packages (goal line, hail mary / prevent) should appear last when coaches are picking formations to add to a call sheet.

### Status

- `npm run build` from `sideline/` passed.

---

## 2026-07-01 — Play Sheet: defensive playbook browse formations

### What

- **[`sideline/app/api/cfb26-plays/route.ts`](sideline/app/api/cfb26-plays/route.ts), [`sideline/lib/playbooks/catalog-playbook-server.ts`](sideline/lib/playbooks/catalog-playbook-server.ts):** Play catalog API resolves **`game_version`** from the selected playbook name (CFB27 for defensive playbooks) instead of always querying CFB26. Fixes empty formation lists when browsing a defensive call sheet playbook.

### Why

Defensive playbooks live in the CFB27 catalog; the browse UI loads formations through `/api/cfb26-plays`, which previously hardcoded `cfb26` and returned no rows.

### Status

- `npm run build` from `sideline/` passed.

---

## 2026-07-01 — Play Sheet: catalog metadata on cards and defensive default situations

### What

- **[`sideline/components/playbook/PlaybookCard.tsx`](sideline/components/playbook/PlaybookCard.tsx), [`CallSheetBuilderSheetHeader.tsx`](sideline/components/playbook/CallSheetBuilderSheetHeader.tsx), [`CallSheetBuilderWorkspaceChrome.tsx`](sideline/components/playbook/CallSheetBuilderWorkspaceChrome.tsx), [`PlaybookEditor.tsx`](sideline/components/playbook/PlaybookEditor.tsx):** Call sheet cards and details headers show catalog metadata as plain text — game version, side of ball, scheme, and source playbook — separated by `/` (e.g. `CFB27 / Offense / Spread / Alabama`). Defensive sheets omit the playbook when it matches the scheme name.
- **[`sideline/components/playbook/CallSheetMetadataRow.tsx`](sideline/components/playbook/CallSheetMetadataRow.tsx), [`sideline/lib/playbookUtils.ts`](sideline/lib/playbookUtils.ts), [`sideline/hooks/useCatalogPlaybooks.ts`](sideline/hooks/useCatalogPlaybooks.ts):** Shared metadata label helpers and cached catalog lookup via **`useCatalogPlaybookMeta`**.
- **[`sideline/lib/constants.ts`](sideline/lib/constants.ts):** Renamed **`DEFAULT_OFFENSIVE_SITUATIONS`** (unchanged content); added **`DEFAULT_DEFENSIVE_SITUATIONS`** and **`defaultSheetSituationsForSide()`** for side-aware sheet seeding.
- **[`sideline/app/api/playbook/route.ts`](sideline/app/api/playbook/route.ts), [`CreatePlaybookModal.tsx`](sideline/components/playbook/CreatePlaybookModal.tsx):** New sheets seed offensive or defensive default situations based on **`side_of_ball`** (from create payload or catalog lookup). Existing sheets unchanged.
- **[`sideline/lib/situationIcons.ts`](sideline/lib/situationIcons.ts):** Added **`User`** icon for defensive Man-to-Man default.

### Why

CFB27 defensive playbooks need distinct default situations and immediate visual context (game, side, scheme, playbook) on list cards and sheet headers without redesigning the card or editor chrome.

### Status

- No schema changes; existing sheets retain their seeded situations.
- `npm run build` from `sideline/` passed.

---

## 2026-07-01 — Play Sheet: Game + side playbook filtering on create and edit

### What

- **[`sideline/components/playbook/CreatePlaybookModal.tsx`](sideline/components/playbook/CreatePlaybookModal.tsx), [`EditPlaybookModal.tsx`](sideline/components/playbook/EditPlaybookModal.tsx):** Create and edit flows now require **Game → Side of Ball → Playbook**. Offense shows **Team Offensive** + **Generic Offensive** sections; defense shows **Generic Defensive** only. Playbook picker stays disabled until both game and side are selected; changing game clears side and playbook; changing side clears playbook.
- **[`sideline/components/playbook/CatalogSideOfBallField.tsx`](sideline/components/playbook/CatalogSideOfBallField.tsx):** Shared Offense / Defense toggle field (existing repo toggle styling).
- **[`sideline/hooks/useCatalogPlaybooks.ts`](sideline/hooks/useCatalogPlaybooks.ts), [`sideline/lib/playbooks/catalog-playbooks.ts`](sideline/lib/playbooks/catalog-playbooks.ts):** Shared catalog fetch and playbook metadata lookup (no duplicate fetch logic in modals).
- **[`sideline/app/api/cfb26-playbooks/route.ts`](sideline/app/api/cfb26-playbooks/route.ts):** List endpoint requires **`side_of_ball`**; added **`lookup_playbook`** for edit/onboarding hydration from **`playbooks.game_version`** + **`playbooks.side_of_ball`**.
- **[`sideline/lib/constants.ts`](sideline/lib/constants.ts), [`sideline/lib/playbooks/generic-playbooks.ts`](sideline/lib/playbooks/generic-playbooks.ts), [`sideline/lib/coachCopy.ts`](sideline/lib/coachCopy.ts):** **`CatalogSideOfBall`** types, side-aware section labels, and picker placeholder/loading/empty copy.

### Why

The catalog now spans multiple game versions and both sides of the ball. Filtering the picker by game and side removes ambiguity and prepares the app for CFB27 defensive sheets without hardcoding playbook names.

### Status

- Save/update still persists **`cfb26_playbook`** only (no schema change in this pass).
- `npm run build` from `sideline/` passed.

---

## 2026-07-01 — Data: Rename `cfb26_plays` catalog table to `playbooks`

### What

- **[`sideline/supabase/migrations/20260701150000_rename_cfb26_plays_to_playbooks.sql`](sideline/supabase/migrations/20260701150000_rename_cfb26_plays_to_playbooks.sql):** `ALTER TABLE cfb26_plays RENAME TO playbooks` (applied via **`supabase db push`**). Indexes, constraints, RLS, and grants preserved automatically.
- **[`sideline/supabase/schema.sql`](sideline/supabase/schema.sql):** Table DDL and RLS policies updated to **`playbooks`**.
- **Application queries:** All `.from("playbooks")` references across API routes (`cfb26-plays`, `cfb26-playbooks`, `film/playbook`, `tendencies/predictability`), Film setup pages, and **`tendenciesServer.ts`**.
- **Seed / verify:** [`sideline/scripts/seed-playbooks.ts`](sideline/scripts/seed-playbooks.ts), [`sideline/scripts/verify-playbook-seed.ts`](sideline/scripts/verify-playbook-seed.ts).
- **Docs:** [`BUILD_CONTRACT.md`](BUILD_CONTRACT.md), [`DECISIONS.md`](DECISIONS.md).

### Why

The catalog holds CFB26/CFB27+ offensive and defensive playbooks — not CFB26-only data. **`playbooks`** reflects long-term multi-game purpose.

---

## 2026-07-01 — Data: CFB27 generic defensive playbooks + `side_of_ball` catalog metadata

### What

- **[`sideline/scripts/scrape-cfb27.ts`](sideline/scripts/scrape-cfb27.ts):** Updated **`TEAMS`** for all **31 Alternate Defensive Playbooks** on cfb.fan (3-2-6 through 4-3 variants, Multiple); defensive schemes use **playbook name = scheme** (e.g. **3-4** → **3-4**).
- **[`sideline/lib/seed/playbooks/cfb27-*.ts`](sideline/lib/seed/playbooks/):** **31** new generic defensive **`TeamPlaybookSeed`** modules (**486 formations, 6,268 plays**) plus **`cfb27-multiple-def.ts`** for defensive **Multiple** (offensive **Multiple** remains in **`cfb27-multiple.ts`**).
- **[`sideline/supabase/migrations/20260701140000_cfb26_plays_side_of_ball.sql`](sideline/supabase/migrations/20260701140000_cfb26_plays_side_of_ball.sql):** Added **`side_of_ball text NOT NULL DEFAULT 'offense'`** to **`playbooks`** (applied via **`supabase db push`**).
- **[`sideline/lib/seed/types.ts`](sideline/lib/seed/types.ts), [`sideline/scripts/seed-playbooks.ts`](sideline/scripts/seed-playbooks.ts):** **`sideOfBall: 'offense' | 'defense'`** on **`TeamPlaybookSeed`**; seed runner persists **`side_of_ball`** on every upsert.
- **[`sideline/lib/playbooks/scheme-classifications.ts`](sideline/lib/playbooks/scheme-classifications.ts), [`sideline/lib/seed/scheme-weights-archetypes.ts`](sideline/lib/seed/scheme-weights-archetypes.ts):** Added all **30** defensive scheme names to **`ALL_SCHEMES`** / **`TEAM_SCHEMES`** (plus archetype weight defaults).
- All **180** CFB27 seed files and CFB26 seed modules updated with **`sideOfBall`**; reseeded into **`playbooks`**.

### Why

CFB27 has no team-specific defensive playbooks — the full defensive catalog is EA's generic defensive playbook list on cfb.fan. **`side_of_ball`** makes offense vs defense explicit in the database (including disambiguating offensive vs defensive **Multiple**) so future UI can filter by **`game_version`** + **`side_of_ball`** without name heuristics.

### Status after this push

- CFB27 catalog complete: **149 offense + 31 defense playbooks**, **74,761 plays** (paginated query); **`side_of_ball`** values **`offense`** / **`defense`** only, **0** NULL rows.
- `npm run build` from `sideline/` passed.

---

## 2026-07-01 — Data: CFB27 generic offensive playbooks + catalog dropdown sections

### What

- **[`sideline/scripts/scrape-cfb27.ts`](sideline/scripts/scrape-cfb27.ts):** Updated **`TEAMS`** for all 11 **Alternate Offensive Playbooks** on cfb.fan — Air Raid, Go Go, Multiple, Option, Pistol, Power Spread, Pro Style, Run & Shoot, Spread, Spread Option, Veer & Shoot.
- **[`sideline/lib/seed/playbooks/cfb27-*.ts`](sideline/lib/seed/playbooks/):** Eleven generic offensive **`TeamPlaybookSeed`** modules (**297 formations, 4,492 plays**) with **`gameVersion: 'cfb27'`**; seeded into **`playbooks`** via **`npm run seed:playbook`**.
- **[`sideline/lib/playbooks/scheme-classifications.ts`](sideline/lib/playbooks/scheme-classifications.ts):** Added generic playbook names to **`TEAM_SCHEMES`** with EA scheme mappings (e.g. Go Go → Multiple, Spread Option → Option).
- **[`sideline/lib/playbooks/generic-playbooks.ts`](sideline/lib/playbooks/generic-playbooks.ts):** Canonical generic offensive playbook list and sort/partition helpers.
- **[`sideline/components/film/TeamCombobox.tsx`](sideline/components/film/TeamCombobox.tsx):** Optional section headers for grouped dropdown rows.
- **Playbook pickers** ([`CreatePlaybookModal`](sideline/components/playbook/CreatePlaybookModal.tsx), [`EditPlaybookModal`](sideline/components/playbook/EditPlaybookModal.tsx), Film new/edit/import): **Team Playbooks** section first, **Generic Playbooks** at the bottom.

### Why

Dynasty and Online Dynasty coaches commonly use EA's generic offensive playbooks (Air Raid, Spread, etc.) alongside team playbooks. Completing the CFB27 offensive catalog requires these entries before launch. Separating team vs generic in the picker reduces scroll noise when coaches know which bucket they want.

### Status after this push

- All 11 generic playbooks verified in Supabase with **`game_version: 'cfb27'`**; cumulative CFB27 catalog **113 playbooks**, **68,493 plays** (paginated query).
- `npm run build` from `sideline/` passed.

---

## 2026-07-01 — Data: Sacramento State CFB27 + catalog dropdown cleanup

### What

- **[`sideline/lib/seed/playbooks/cfb27-sacramento-state.ts`](sideline/lib/seed/playbooks/cfb27-sacramento-state.ts):** New offensive **`TeamPlaybookSeed`** for **Sacramento State** (`sacramento-state-off` on cfb.fan) — Brennan Marion Go-Go offense; **27 formations, 455 plays**; seeded into **`playbooks`** with **`game_version: 'cfb27'`**.
- **[`sideline/lib/playbooks/scheme-classifications.ts`](sideline/lib/playbooks/scheme-classifications.ts):** Added **Sacramento State** → Spread Option (placeholder until Go-Go is a first-class scheme).
- **[`sideline/scripts/scrape-cfb27.ts`](sideline/scripts/scrape-cfb27.ts):** Added Sacramento State to **`TEAMS`** for future annual pulls.
- **[`sideline/app/api/cfb26-playbooks/route.ts`](sideline/app/api/cfb26-playbooks/route.ts):** Exclude internal playbooks whose names start with **`_`** from the Create Call Sheet dropdown (e.g. removed **`_cfb27_test`** from coach-facing lists).
- **Removed** duplicate **`cfb27-florida-international.ts`** — Florida International is already covered by **`cfb27-fiu.ts`**.

### Why

cfb.fan added **Sacramento State** after the original 137-team CFB27 catalog scrape. Coaches searching for the Hornets / Go-Go offense need it in the playbook picker. Duplicate FIU seed file and test playbook rows were polluting the catalog surface.

### Status after this push

- **Sacramento State** verified in Supabase (**455 plays**); cumulative unique CFB27 catalog **138 teams** (137 prior + Sacramento State).
- `_cfb27_test` removed from database; dropdown API filters underscore-prefixed internal playbooks.

---

## 2026-07-01 — Data: Revert incidental playType drift on Sessions 1–10 CFB27 seeds

### What

- Restored **51** existing **`cfb27-*.ts`** modules (Sessions 1–10) to their pre–Session 11 committed versions after a bulk tmp-scraper pass had rewritten **`playType`** labels and **`verified`** dates without changing formations or play rosters.

### Why

Session 11 commit **`af82881`** bundled new team catalog files together with incidental play-type reclassification on already-committed seeds. Play-type normalization is out of scope; source files should match what was originally seeded to **`playbooks`**.

---

## 2026-07-01 — Data: CFB27 Final Remaining Teams seed (Session 11)

### What

- **[`sideline/scripts/scrape-cfb27.ts`](sideline/scripts/scrape-cfb27.ts):** Updated **`TEAMS`** array for Session 11 — New Mexico, New Mexico State, Hawaii, Wyoming, UTEP, Western Kentucky, San Jose State, Sam Houston, Middle Tennessee, Jacksonville State, Kennesaw State, Missouri State, North Dakota State, Delaware, Florida International.
- **[`sideline/lib/seed/playbooks/cfb27-*.ts`](sideline/lib/seed/playbooks/):** Fifteen offensive **`TeamPlaybookSeed`** modules with **`gameVersion: 'cfb27'`**, **`source.url`** on **cfb.fan**, and name-based **`playType`** heuristics.
- **[`sideline/lib/playbooks/scheme-classifications.ts`](sideline/lib/playbooks/scheme-classifications.ts):** Added **North Dakota State** → Pro Style (required for scrape/seed validation).
- Seeded into **`playbooks`** via **`npm run seed:playbook -- cfb27-{slug}`** (419 formations, 7,042 plays total).

### Why

Session 11 completes the CFB27 offensive playbook seeding effort — final niche G5 and FCS programs so the full cfb.fan catalog is available for launch validation.

### Status after this push

- All 15 teams verified in Supabase with **`game_version: 'cfb27'`**; cumulative CFB27 catalog **108 teams**, **49,719 plays** (excluding internal test playbook; paginated query).
- **Middle Tennessee:** brief slug **`middle-tennessee-state-off`** returns 404 on cfb.fan; seeded from prior **`cfb27-middle-tennessee.ts`** (**`mid-tenn-state-off`**).
- **Sam Houston / Middle Tennessee:** seed files use **`TEAM_SCHEMES`** canonical names (**`cfb27-sam-houston`**, **`cfb27-middle-tennessee`**).
- `npm run build` from `sideline/` passed (seed modules + scraper only; no app code changed).

---

## 2026-07-01 — Data: CFB27 G5 Mid seed (Session 10)

### What

- **[`sideline/scripts/scrape-cfb27.ts`](sideline/scripts/scrape-cfb27.ts):** Updated **`TEAMS`** array for Session 10 — UCF, Utah, West Virginia, UConn, NC State, Liberty, UNLV, Air Force, Nevada, Northern Illinois.
- **[`sideline/lib/seed/playbooks/cfb27-*.ts`](sideline/lib/seed/playbooks/):** Ten offensive **`TeamPlaybookSeed`** modules with **`gameVersion: 'cfb27'`**, **`source.url`** on **cfb.fan**, and name-based **`playType`** heuristics.
- Seeded into **`playbooks`** via **`npm run seed:playbook -- cfb27-{slug}`** (307 formations, 4,656 plays total).

### Why

Session 10 of the CFB27 catalog rollout — mid-tier G5 programs plus P4 stragglers (Utah, West Virginia, NC State). Air Force's Option playbook is a popular dynasty pick alongside Army and Navy. Brings cumulative coverage to **92 teams** ahead of Sessions 11–12 (niche G5 and FCS).

### Status after this push

- All 10 teams verified in Supabase with **`game_version: 'cfb27'`**; cumulative CFB27 catalog **92 teams**, **42,715 plays** (excluding internal test playbook; paginated query).
- `npm run build` from `sideline/` passed (seed modules + scraper only; no app code changed).

---

## 2026-07-01 — Data: CFB27 ACC/P4 Lower + Major G5 seed (Session 9)

### What

- **[`sideline/scripts/scrape-cfb27.ts`](sideline/scripts/scrape-cfb27.ts):** Updated **`TEAMS`** array for Session 9 — Duke, Georgia Tech, Virginia, Virginia Tech, Wake Forest, Syracuse, Stanford, California, Boston College, Houston.
- **[`sideline/lib/seed/playbooks/cfb27-*.ts`](sideline/lib/seed/playbooks/):** Ten offensive **`TeamPlaybookSeed`** modules with **`gameVersion: 'cfb27'`**, **`source.url`** on **cfb.fan**, and name-based **`playType`** heuristics.
- Seeded into **`playbooks`** via **`npm run seed:playbook -- cfb27-{slug}`** (310 formations, 4,667 plays total).

### Why

Session 9 of the CFB27 catalog rollout — remaining ACC programs plus Houston, rounding out Power 4 coverage before Sessions 10–12 (remaining G5 and FCS teams).

### Status after this push

- All 10 teams verified in Supabase with **`game_version: 'cfb27'`**; cumulative CFB27 catalog **82 teams**, **38,059 plays** (excluding internal test playbook; paginated query).
- `npm run build` from `sideline/` passed (seed modules + scraper only; no app code changed).

---

## 2026-07-01 — Data: CFB27 P4 Mid-Tier seed (Session 8)

### What

- **[`sideline/scripts/scrape-cfb27.ts`](sideline/scripts/scrape-cfb27.ts):** Updated **`TEAMS`** array for Session 8 — Louisville, Pittsburgh, Kansas, Kansas State, Cincinnati, BYU, Arizona, Arizona State, Baylor, SMU.
- **[`sideline/lib/seed/playbooks/cfb27-*.ts`](sideline/lib/seed/playbooks/):** Ten offensive **`TeamPlaybookSeed`** modules with **`gameVersion: 'cfb27'`**, **`source.url`** on **cfb.fan**, and name-based **`playType`** heuristics.
- Seeded into **`playbooks`** via **`npm run seed:playbook -- cfb27-{slug}`** (315 formations, 4,663 plays total).

### Why

Session 8 of the CFB27 catalog rollout — mid-tier Power 4 programs and recently elevated schools (SMU, Cincinnati, BYU) that dynasty players frequently pick. Brings the cumulative CFB27 catalog to **72 teams** ahead of Sessions 9–12 (remaining ACC, G5, and FCS teams).

### Status after this push

- All 10 teams verified in Supabase with **`game_version: 'cfb27'`**; cumulative CFB27 catalog **72 teams**, **33,394 plays** (excluding internal test playbook; paginated query).
- `npm run build` from `sideline/` passed (seed modules + scraper only; no app code changed).

---

## 2026-07-01 — Data: CFB27 Major Missing Programs seed (Session 7)

### What

- **[`sideline/scripts/scrape-cfb27.ts`](sideline/scripts/scrape-cfb27.ts):** Permanent reusable **cfb.fan** scraper — swap the **`TEAMS`** array per session; discovers formations from team playbook pages, resolves plays via formation catalog + play-team membership, writes **`cfb27-{slug}.ts`** seed modules. Retained in-repo for Sessions 8–12 and future annual pulls (supersedes one-time tmp scraper guidance).
- **[`sideline/lib/seed/playbooks/cfb27-*.ts`](sideline/lib/seed/playbooks/):** Ten offensive **`TeamPlaybookSeed`** modules — Notre Dame, Clemson, Miami, Florida State, Colorado, TCU, Oklahoma State, Texas Tech, Iowa State, North Carolina — with **`gameVersion: 'cfb27'`**, **`source.url`** on **cfb.fan**, and name-based **`playType`** heuristics.
- Seeded into **`playbooks`** via **`npm run seed:playbook -- cfb27-{slug}`** (303 formations, 4,631 plays total).
- Seven seed files use **`TEAM_SCHEMES`** canonical classifications (e.g. Notre Dame → Power Spread, Clemson / TCU → Air Raid, Texas Tech → Veer & Shoot, North Carolina → Multiple) so the existing seed runner validation passes.

### Why

Session 7 of the CFB27 catalog rollout — marquee P4 programs dynasty players frequently pick that were missing from the initial 62-team cfb.fan scrape. Combined with Sessions 1–5 (committed) plus Session 7, **62 teams** are in the seed catalog ahead of Sessions 8–12 (remaining new cfb.fan teams).

### Status after this push

- All 10 teams verified in Supabase with **`game_version: 'cfb27'`**; cumulative CFB27 catalog **62 teams**, **28,731 plays** (excluding internal test playbook; paginated query).
- `npm run build` from `sideline/` passed (seed modules + scraper only; no app code changed).

---

## 2026-06-30 — Landing page: Game Day Workspace section + rounded section panels

### What

**Your Game Day Workspace (product positioning)**

- **[`ProductShowcase.tsx`](sideline/components/marketing/ProductShowcase.tsx)** / **[`MarketingWorkspaceIllustration.tsx`](sideline/components/marketing/MarketingWorkspaceIllustration.tsx):** Renamed **The full picture** → **Your Game Day Workspace** with preparation-focused copy; replaced generic **`AppMockup`** and callout chips with a production-style desktop workspace composite (persistent sidebar, situation dashboard, situation detail play table).

**Landing section polish**

- **[`WhatIsCallSheet.tsx`](sideline/components/marketing/WhatIsCallSheet.tsx)**, **[`HowItWorks.tsx`](sideline/components/marketing/HowItWorks.tsx)**, **[`ProductShowcase.tsx`](sideline/components/marketing/ProductShowcase.tsx)**, **[`FinalCTA.tsx`](sideline/components/marketing/FinalCTA.tsx):** Full-bleed section backgrounds moved into **`rounded-2xl`** bordered panels with outer spacing so tinted blocks match card radius elsewhere on the page.
- **[`FinalCTA.tsx`](sideline/components/marketing/FinalCTA.tsx):** **Already have an account?** sign-in line stacks on its own row below **Get Started** at all breakpoints.

### Why

Visitors should understand The Sideline as a pre-kickoff workspace—not a collection of disconnected views. Rounded section panels align the landing page with the app’s card-based visual language.

### Status after this push

- `npm run build` from `sideline/` passed.

---

## 2026-06-30 — Responsive overlay standard (drawers mobile, modals tablet/desktop)

### What

**Shared responsive shell**

- **[`ResponsiveOverlay.tsx`](sideline/components/shared/ResponsiveOverlay.tsx)** / **[`useMdUp.ts`](sideline/lib/useMdUp.ts)** / **[`designTokens.ts`](sideline/lib/constants/designTokens.ts):** Central **`md`** breakpoint behavior — bottom sheet / full-viewport drawer on mobile, centered Radix dialog at **`md+`**; shared positioning and dialog content class helpers.

**Migrated surfaces**

- **[`CreatePlaybookModal.tsx`](sideline/components/playbook/CreatePlaybookModal.tsx)**, **[`EditPlaybookModal.tsx`](sideline/components/playbook/EditPlaybookModal.tsx)**, **[`ConfirmDestructiveModal.tsx`](sideline/components/shared/ConfirmDestructiveModal.tsx)**, **[`BottomSheet.tsx`](sideline/components/shared/BottomSheet.tsx)**, **[`AddPlayDrawer.tsx`](sideline/components/playbook/AddPlayDrawer.tsx)**, **[`SituationFormModal.tsx`](sideline/components/playbook/SituationFormModal.tsx)**, **[`EditGameDetailsModal.tsx`](sideline/components/film/EditGameDetailsModal.tsx)**, **[`PlaybookEditor.tsx`](sideline/components/playbook/PlaybookEditor.tsx)**, **[`app/film/[gameId]/page.tsx`](sideline/app/film/[gameId]/page.tsx):** Form and confirm flows use shared tokens or **`ResponsiveOverlay`**; breakpoint alignment moved from **`sm`** to **`md`** where overlays were hand-rolled.

**Call sheet landing tab switch**

- **[`CallSheetEditorTabBar.tsx`](sideline/components/playbook/CallSheetEditorTabBar.tsx)** / **[`CallSheetBuilderWorkspaceChrome.tsx`](sideline/components/playbook/CallSheetBuilderWorkspaceChrome.tsx):** Removed separate **`compact`** desktop styling — **Situations / Coach View** uses one visual treatment everywhere; full width on mobile only (**`className="w-full"`**), content-sized on tablet/desktop.

### Why

Large screens should use centered modals for edit workflows while mobile keeps drawer/bottom-sheet interactions. One wrapper and token set avoids per-feature breakpoint drift and matches the New Call Sheet reference pattern.

### Status after this push

- `npm run build` from `sideline/` passed.
- Mobile drawer behavior preserved; tablet/desktop overlays centered at **`md+`**.

---

## 2026-06-30 — Call Sheet builder: situation workspace + browse side rail (Session 11)

### What

**Situation detail workspace (tablet / desktop)**

- **[`CallSheetBuilderSituationWorkspace.tsx`](sideline/components/playbook/CallSheetBuilderSituationWorkspace.tsx)** / **[`CallSheetBuilderSituationToolbar.tsx`](sideline/components/playbook/CallSheetBuilderSituationToolbar.tsx)** / **[`CallSheetBuilderSituationBrowsePanel.tsx`](sideline/components/playbook/CallSheetBuilderSituationBrowsePanel.tsx):** Split layout at **`md+`** — main play list column plus fixed **Browse Playbook** / **Add play** side rail (**`21.25rem`** via **`globals.css`** **`.app-shell-situation-browse-panel`**); mobile stack unchanged (**`md:hidden`**).
- **[`AddPlayDrawer.tsx`](sideline/components/playbook/AddPlayDrawer.tsx):** **`shell="panel"`** embeds **`PlayBrowser`** in the side rail without modal chrome; scroll lock only for modal shell.
- **[`CallSheetBuilderSituationHeader.tsx`](sideline/components/playbook/CallSheetBuilderSituationHeader.tsx):** **`layout="workspace"`** compact header at **`md+`**; mobile keeps existing page-title stack.
- **[`PlaybookEditor.tsx`](sideline/components/playbook/PlaybookEditor.tsx):** Wires workspace shell, shared **`playBrowserPanelProps`**, and dashed **Add play** row token on situation detail.

**Play-type summary pills**

- **[`SituationPlayTypeSummary.tsx`](sideline/components/playbook/SituationPlayTypeSummary.tsx)** / **[`situationPlayTypeSummary.ts`](sideline/lib/situationPlayTypeSummary.ts):** At-a-glance RUN / PASS / RPO (etc.) counts using the Tendencies bucket ladder; pills on mobile under the situation title, on **`md+`** in the toolbar row beside **Browse Playbook**.
- **[`tendenciesPlayType.ts`](sideline/lib/tendenciesPlayType.ts):** Shared **`playTypeBucketBadgeClass`** and summary order helper.

**Call sheet landing (dashboard) parity**

- **[`CallSheetBuilderWorkspaceChrome.tsx`](sideline/components/playbook/CallSheetBuilderWorkspaceChrome.tsx):** **Browse Playbook** opens the same side rail as situation detail; active-state styling on the header button; **`gap-4` / `lg:gap-6`** between main column and rail when browse is open.
- **[`CallSheetEditorTabBar.tsx`](sideline/components/playbook/CallSheetEditorTabBar.tsx)** / **[`designTokens.ts`](sideline/lib/constants/designTokens.ts):** Larger touch targets on landing toolbar (**`md:min-h-11`**, **`text-sm`**) for **Browse Playbook**, **Add Situation**, and **Situations / Coach View** tabs; browse-panel title/subtitle tokens aligned with Add Play drawer typography.

**QA**

- **[`PlaySheetQaSituationEditor.tsx`](sideline/components/qa/play-sheet/PlaySheetQaSituationEditor.tsx):** Updated for workspace + browse-panel patterns.

### Why

Tablet and desktop Call Sheet editing should feel like one workspace: browse and add-play without full-screen modals, situation context visible alongside the playbook catalog, and landing + detail views sharing the same side-rail pattern. Controls should match situation-detail sizing and design tokens.

### Status after this push

- `npm run build` from `sideline/` passed.
- Mobile builder and situation layouts preserved.

---

## 2026-06-30 — Data: CFB27 Mid G5 seed (Session 5)

### What

- **[`sideline/lib/seed/playbooks/cfb27-*.ts`](sideline/lib/seed/playbooks/):** Eleven offensive **`TeamPlaybookSeed`** modules — South Florida (USF), East Carolina, Louisiana, Troy, Marshall, Old Dominion, North Texas, Louisiana Tech, Temple, Tulsa, Southern Miss — with **`gameVersion: 'cfb27'`**, **`source.url`** on **cfb.fan**, and name-based **`playType`** heuristics.
- Seeded into **`playbooks`** via **`npm run seed:playbook -- cfb27-{slug}`** (309 formations, 5,085 plays total).
- Two teams use cfb.fan slugs that differ from the brief (`usf-off`, `southern-miss-off`); seed files are named **`cfb27-south-florida`** and **`cfb27-southern-mississippi`** but **`team`** values match **`TEAM_SCHEMES`** (`USF`, `Southern Miss`).
- Eight seed files use **`TEAM_SCHEMES`** canonical classifications (e.g. East Carolina → Veer & Shoot, Louisiana → Spread, Troy → Power Spread, North Texas / Louisiana Tech → Air Raid) so the existing seed runner validation passes.

### Why

Session 5 of the CFB27 catalog rollout — mid-tier Group of 5 programs that complete deep-rebuild coverage for dynasty players. Combined with Sessions 1–4, **52 teams** are seeded ahead of Session 6 (final 10 G5).

### Status after this push

- All 11 teams verified in Supabase with **`game_version: 'cfb27'`**; cumulative CFB27 catalog **52 teams**, **24,098 plays** (excluding internal test playbook).
- `npm run build` from `sideline/` passed (seed modules only; no app code changed).

---

## 2026-06-30 — Data: CFB27 P4 Lower + Elite G5 seed (Session 4)

### What

- **[`sideline/lib/seed/playbooks/cfb27-*.ts`](sideline/lib/seed/playbooks/):** Ten offensive **`TeamPlaybookSeed`** modules — Northwestern, Rutgers, Vanderbilt, Memphis, Tulane, Army, Navy, Appalachian State, James Madison, Coastal Carolina — with **`gameVersion: 'cfb27'`**, **`source.url`** on **cfb.fan**, and name-based **`playType`** heuristics.
- Seeded into **`playbooks`** via **`npm run seed:playbook -- cfb27-{slug}`** (304 formations, 4,590 plays total).
- Four seed files use **`TEAM_SCHEMES`** canonical classifications (Northwestern → Spread, Vanderbilt → Pistol, Tulane and Coastal Carolina → Power Spread) so the existing seed runner validation passes.

### Why

Session 4 of the CFB27 catalog rollout — remaining P4 programs plus elite G5 schools dynasty players frequently choose for underdog rebuilds (Army and Navy Option playbooks in particular). Combined with Sessions 1–3, **41 teams** are seeded ahead of Sessions 5–6 (remaining G5).

### Status after this push

- All 10 teams verified in Supabase with **`game_version: 'cfb27'`**; cumulative CFB27 catalog **41 teams**, **19,015 plays** (excluding internal test playbook).
- `npm run build` from `sideline/` passed (seed modules only; no app code changed).

---

## 2026-06-30 — Play Sheet list cards: simpler tablet/desktop row

### What

- **[`sideline/components/playbook/PlaybookCard.tsx`](sideline/components/playbook/PlaybookCard.tsx)** / **[`PlaybookCardSkeleton.tsx`](sideline/components/playbook/PlaybookCardSkeleton.tsx):** At **`md+`**, list cards show only the initial badge, sheet name, and scheme/subtitle — removed situation count, last updated, and chevron.
- Removed unused **[`sideline/lib/formatSheetUpdatedAt.ts`](sideline/lib/formatSheetUpdatedAt.ts)** helper.

### Why

Tablet and desktop **My Call Sheets** should stay scannable without extra metadata columns; the sidebar already surfaces sheet names for navigation.

---

## 2026-06-30 — Play Sheet workspace refinement (tablet/desktop) + shell nav

### What

**Tablet / desktop workspace (Session 10)**

- **[`sideline/app/globals.css`](sideline/app/globals.css)** / **[`sideline/lib/constants/designTokens.ts`](sideline/lib/constants/designTokens.ts):** Inner workspace caps (**`--app-shell-workspace-inner-max-width`**, wide builder variant), **`.app-shell-workspace-inner`**, and header CTA tokens (**`appShellHeaderPrimaryCtaClass`**) aligned with landing **Get started**.
- **[`sideline/components/playbook/PlaySheetHomeHeader.tsx`](sideline/components/playbook/PlaySheetHomeHeader.tsx)** / **[`PlaybookHome.tsx`](sideline/components/playbook/PlaybookHome.tsx):** Constrained list column, sheet count subtitle, emerald **New Call Sheet** CTA at **`md+`** only (no mobile header create button).
- **[`sideline/components/playbook/PlaybookCard.tsx`](sideline/components/playbook/PlaybookCard.tsx)** / **[`PlaybookCardSkeleton.tsx`](sideline/components/playbook/PlaybookCardSkeleton.tsx):** Horizontal row layout at **`md+`** with stats/chevron; kebab collision fix via optional **`CardKebabMenu`** positioning.
- **[`sideline/lib/formatSheetUpdatedAt.ts`](sideline/lib/formatSheetUpdatedAt.ts):** Shared relative “updated” label for list cards.
- **[`sideline/components/playbook/CallSheetBuilderWorkspaceChrome.tsx`](sideline/components/playbook/CallSheetBuilderWorkspaceChrome.tsx)** / **[`PlaybookEditor.tsx`](sideline/components/playbook/PlaybookEditor.tsx):** Builder stats header, toolbar row (tabs + **Add Situation**), separator at **`md+`**; mobile builder branch unchanged.
- **[`sideline/components/playbook/CallSheetBuilderDashboard.tsx`](sideline/components/playbook/CallSheetBuilderDashboard.tsx)** / **[`CallSheetEditorTabBar.tsx`](sideline/components/playbook/CallSheetEditorTabBar.tsx)** / **[`CallSheetSituationGrid.tsx`](sideline/components/playbook/CallSheetSituationGrid.tsx):** Desktop dashboard layout, emerald active tab fill, 3-column situation grid at **`lg+`**.
- **[`sideline/components/playbook/SituationFormModal.tsx`](sideline/components/playbook/SituationFormModal.tsx):** **`presentation="responsive"`** — full-page sheet on mobile, centered dialog with natural height on **`md+`** (no nested scroll unless content requires it).
- **[`sideline/components/playbook/CreatePlaybookModal.tsx`](sideline/components/playbook/CreatePlaybookModal.tsx):** Removed breadcrumb; full-width playbook combobox on create flow.
- **[`sideline/components/shared/PageSkeleton.tsx`](sideline/components/shared/PageSkeleton.tsx):** Play Sheet home skeleton aligned to constrained desktop layout; hamburger placeholder **`md:hidden`**.

**App shell navigation**

- **[`sideline/components/shared/BottomTabNav.tsx`](sideline/components/shared/BottomTabNav.tsx):** Mobile bottom tab bar disabled (**`BOTTOM_TAB_NAV_ENABLED = false`**); sets **`data-hamburger-nav-chrome`** for reduced bottom inset on mobile.
- **[`sideline/components/shared/AppShellChrome.tsx`](sideline/components/shared/AppShellChrome.tsx)** / **[`AppShellMenuHeader.tsx`](sideline/components/shared/AppShellMenuHeader.tsx):** Persistent **`AppShellSidebar`** at **`md+`**; hamburger drawer on mobile only (**`md:hidden`**).
- **[`sideline/lib/navigation/appShellNav.ts`](sideline/lib/navigation/appShellNav.ts):** Drawer and sidebar nav limited to **My Call Sheets**, **Review** (coming soon), and **Settings** — **Film Room** and **Tendencies** removed from app navigation.

### Why

Tablet and desktop should read as a focused Call Sheet workspace (toolbar, constrained width, list + builder hierarchy) while mobile keeps existing builder/home layouts. Navigation should be hamburger-only on mobile and sidebar on larger screens — without a bottom tab bar or Film/Tendencies sidebar entries.

### Status after this push

- `npm run build` from `sideline/` passed.
- Mobile builder and Play Sheet home layouts preserved; Film/Tendencies routes remain reachable by direct URL but are not in shell nav.

---

## 2026-06-30 — App shell: tablet/desktop sidebar + Call Sheets submenu

### What

- **[`sideline/components/shared/AppShellChrome.tsx`](sideline/components/shared/AppShellChrome.tsx):** Responsive authenticated frame — persistent left sidebar at **`md+`**, existing mobile bottom tab bar below **`md`**.
- **[`sideline/components/shared/AppShellSidebar.tsx`](sideline/components/shared/AppShellSidebar.tsx):** Session 09 sidebar with expanded **My Call Sheets** submenu (user sheets from **`GET /api/playbook`**, **New Call Sheet**, per-route active dot/fill), **Review** (Coming Soon), **Settings**, and footer **Sign out**.
- **[`sideline/lib/navigation/appShellNav.ts`](sideline/lib/navigation/appShellNav.ts)** / **[`appShellRoutes.ts`](sideline/lib/navigation/appShellRoutes.ts):** Shared sidebar + mobile tab config and shell gating (excludes marketing, auth, onboarding, **`/qa/*`**).
- **[`sideline/hooks/usePlaybookList.ts`](sideline/hooks/usePlaybookList.ts)** / **[`lib/playbookListQuery.ts`](sideline/lib/playbookListQuery.ts):** Shared React Query list fetch reused by sidebar and **`PlaybookHome`**.
- **[`sideline/components/shared/BottomTabNav.tsx`](sideline/components/shared/BottomTabNav.tsx):** Tab bar re-enabled on mobile only (**`md:hidden`**); uses **`APP_SHELL_MOBILE_TABS`**.
- **[`sideline/components/shared/AppShellMenuHeader.tsx`](sideline/components/shared/AppShellMenuHeader.tsx):** Hamburger drawer hidden at **`md+`** (sidebar replaces it).
- **[`sideline/app/globals.css`](sideline/app/globals.css):** **`--app-shell-sidebar-width`**, **`data-app-shell-sidebar`** bottom inset, **`.app-shell-frame`** / **`.app-shell-workspace`** layout classes.
- **[`sideline/components/marketing/MarketingNav.tsx`](sideline/components/marketing/MarketingNav.tsx):** Mobile hamburger **Get Started** uses primary **`Button`** (matches desktop).
- **[`DECISIONS.md`](DECISIONS.md):** Documents responsive authenticated application shell decision.

### Why

Tablet and desktop should feel like a real coaching workspace (persistent nav, Call Sheet list in sidebar) without changing mobile Film / Play Sheet / Tendencies pillars or duplicating routes.

### Status after this push

- `npm run build` from `sideline/` passed.
- Mobile bottom nav and marketing **`/landing`** behavior preserved.

---

## 2026-06-30 — Marketing: app-faithful hero + How It Works illustrations

### What

- **[`sideline/components/marketing/MarketingCallSheetIllustrations.tsx`](sideline/components/marketing/MarketingCallSheetIllustrations.tsx):** Shared marketing mocks aligned with real Call Sheet UI — situation grid cards (**`getSituationColor`**, **`SituationIconBadge`**), Coach View accordions, add-play situation editor, and shared header tokens (**`marketingPanelHeaderClass`**, **`marketingSheetTitleClass`**).
- **[`sideline/components/marketing/HeroPanels.tsx`](sideline/components/marketing/HeroPanels.tsx):** Hero floating panels now mirror production — Call Sheet Coach View accordions, 2×2 situation grid, Browse Playbook unchanged; removed generic **`PlayManagementChip`**.
- **[`sideline/components/marketing/HowItWorks.tsx`](sideline/components/marketing/HowItWorks.tsx):** Replaced generic step mocks with shared illustrations — step 01 add-play situation editor, step 02 full situation grid, step 03 Coach View; illustration shell headers use **`text-sm`** to match hero sheet subtitle.

### Why

Marketing visuals should show the actual Call Sheet builder and Coach View patterns coaches recognize, not placeholder list UI — and panel typography should stay consistent between hero and How It Works.

---

## 2026-06-29 — Data: CFB27 P4 Mid-Tier seed (Session 3)

### What

- **[`sideline/lib/seed/playbooks/cfb27-*.ts`](sideline/lib/seed/playbooks/):** Eleven offensive **`TeamPlaybookSeed`** modules — Missouri, Michigan State, Iowa, UCLA, Indiana, Kentucky, Maryland, Minnesota, Illinois, Mississippi State, Purdue — with **`gameVersion: 'cfb27'`**, **`source.url`** on **cfb.fan**, and name-based **`playType`** heuristics.
- Seeded into **`playbooks`** via **`npm run seed:playbook -- cfb27-{slug}`** (316 formations, 5,133 plays total).
- Six seed files use **`TEAM_SCHEMES`** canonical classifications (not CFB26 playbookgamer defaults) so the existing seed runner validation passes.

### Why

Session 3 of the CFB27 catalog rollout — P4 mid-tier programs that round out Power 4 conference coverage. Combined with Sessions 1–2, exceeds the release plan's top 25–30 most popular schemes target (**31 teams**).

### Status after this push

- All 11 teams verified in Supabase with **`game_version: 'cfb27'`**; cumulative CFB27 catalog **31 teams**, **14,423 plays** (excluding internal test playbook).
- `npm run build` from `sideline/` passed.

---

## 2026-06-29 — Data: CFB27 Major P4 Programs seed (Session 2)

### What

- **[`sideline/lib/seed/playbooks/cfb27-*.ts`](sideline/lib/seed/playbooks/):** Ten offensive **`TeamPlaybookSeed`** modules — Tennessee, Florida, Ole Miss, Auburn, Texas A&M, Wisconsin, Nebraska, Arkansas, South Carolina, Washington — with **`gameVersion: 'cfb27'`**, **`source.url`** on **cfb.fan**, and name-based **`playType`** heuristics.
- Seeded into **`playbooks`** via **`npm run seed:playbook -- cfb27-{slug}`** (289 formations, 4,631 plays total).

### Why

Session 2 of the CFB27 catalog rollout — major P4 programs dynasty players frequently pick for rebuilds and rivalry runs. Combined with Session 1, covers the top 20 most-used offensive playbooks.

### Status after this push

- All 10 teams verified in Supabase with **`game_version: 'cfb27'`**; cumulative CFB27 catalog **20 teams**, **9,290 plays**.
- `npm run build` from `sideline/` passed.

---

## 2026-06-29 — Data: CFB27 Blue Bloods seed (Session 1)

### What

- **[`sideline/lib/seed/playbooks/cfb27-*.ts`](sideline/lib/seed/playbooks/):** Ten offensive **`TeamPlaybookSeed`** modules — Alabama, Georgia, Ohio State, Texas, Oregon, USC, LSU, Michigan, Penn State, Oklahoma — with **`gameVersion: 'cfb27'`**, **`source.url`** on **cfb.fan**, and name-based **`playType`** heuristics.
- Seeded into **`playbooks`** via **`npm run seed:playbook -- cfb27-{slug}`** (301 formations, 4,659 plays total).
- **[`sideline/package.json`](sideline/package.json):** **`cheerio`** added for the one-shot scrape session (scraper script deleted after seeding).

### Why

CFB27 drops July 9; Blue Bloods are the highest-traffic playbooks. Session 1 of the CFB27 catalog rollout so the create-time picker can list real CFB27 teams before launch.

### Status after this push

- All 10 teams verified in Supabase with **`game_version: 'cfb27'`**.
- `npm run build` from `sideline/` passed.

---

## 2026-06-29 — Play Sheet: Create Call Sheet game selection

### What

- **[`sideline/components/playbook/CreatePlaybookModal.tsx`](sideline/components/playbook/CreatePlaybookModal.tsx):** **Select Game** field (default **CFB 27**); **Select Playbook** label; playbooks fetched with **`?game_version=`**; coach-facing empty state when no playbooks exist for the selected game.
- **[`sideline/app/api/cfb26-playbooks/route.ts`](sideline/app/api/cfb26-playbooks/route.ts):** Optional **`game_version`** query param; backward compatible when omitted (**`cfb26`**).
- **[`sideline/lib/constants.ts`](sideline/lib/constants.ts):** **`CatalogGameVersion`**, **`DEFAULT_CATALOG_GAME_VERSION`** (`cfb27`), **`CATALOG_GAME_VERSIONS`**, display labels, **`parseCatalogGameVersion`**.
- **[`sideline/components/film/TeamCombobox.tsx`](sideline/components/film/TeamCombobox.tsx):** **`disabled`** and **`emptyOptionsMessage`** props for empty catalog states.
- **[`sideline/lib/coachCopy.ts`](sideline/lib/coachCopy.ts):** **`PLAYBOOK_CREATE_NO_PLAYBOOKS_HEADLINE`** / **`BODY`**.

### Why

Play sheet creation must let coaches pick CFB 26 vs CFB 27 and show only playbooks for that catalog — no silent fallback to the other game version.

### Status after this push

- `npm run build` from `sideline/` passed.

---

## 2026-06-30 — Marketing: full landing page + auth shell parity

### What

- **[`sideline/app/(marketing)/`](sideline/app/(marketing)/):** New route group with full-bleed layout and **`/landing`** page composing marketing sections (nav, hero, Call Sheet explainer, problem, how it works, features, product showcase, why Sideline, final CTA, footer). Replaces the single-screen **[`sideline/app/landing/page.tsx`](sideline/app/landing/page.tsx)** + **`HeroSection`** entry.
- **[`sideline/components/marketing/`](sideline/components/marketing/):** Section components rebuilt on app tokens (Barlow / JetBrains Mono, slate/emerald Tailwind classes); **`AppMockup`** interactive product mockup (**`thesideline.pro`**); anchor nav (**`#features`**, **`#how-it-works`**, **`#about`**); CTAs via **`buildLoginHref`**.
- **[`sideline/components/marketing/MarketingBlueprintBackground.tsx`](sideline/components/marketing/MarketingBlueprintBackground.tsx):** Shared emerald radial glow + blueprint grid — **`variant="viewport"`** on marketing layout and login layout so the texture covers the full scroll surface (not hero-only).
- **[`sideline/lib/marketingHeroCopy.ts`](sideline/lib/marketingHeroCopy.ts):** Shared hero subtitle copy for landing + docs.
- **[`sideline/lib/constants/designTokens.ts`](sideline/lib/constants/designTokens.ts):** **`authOAuthButtonClass`** — bordered slate auth surface shared by Google OAuth and landing **Sign In** buttons.
- **[`sideline/app/login/`](sideline/app/login/):** **`layout.tsx`** adds the blueprint background; **`LoginForm`** uses **`AppCompactWordmark`**, subtitle **Build better game plans. Call smarter plays.**, and **`authOAuthButtonClass`** on the OAuth CTA.
- **[`sideline/components/marketing/MarketingNav.tsx`](sideline/components/marketing/MarketingNav.tsx)** / **[`MarketingFooter.tsx`](sideline/components/marketing/MarketingFooter.tsx):** **`AppCompactWordmark`** (hamburger-menu lockup) instead of Target icon + full wordmark.

### Why

Session 08 — replace the auth-first welcome screen with a coach-facing marketing homepage that explains the digital Call Sheet, preserves existing auth routing, and stays on the production design system (no Figma export code).

### Status after this push

- `npm run build` from `sideline/` passed.
- **`/landing`** still sets **`data-marketing-chrome`** via **`BottomTabNav`**; authenticated app routes unchanged.

---

## 2026-06-29 — Play Sheet: remove obsolete Active Call Sheet UI

### What

- **[`sideline/components/playbook/PlaybookCard.tsx`](sideline/components/playbook/PlaybookCard.tsx):** Removed **Set as Active** from the overflow menu, the active-sheet handler, and the inline **Active** badge.
- **[`sideline/components/playbook/PlaybookHome.tsx`](sideline/components/playbook/PlaybookHome.tsx):** Stopped passing active-sheet state into list cards.
- **[`sideline/components/playbook/PlaySheetActiveBadge.tsx`](sideline/components/playbook/PlaySheetActiveBadge.tsx):** Deleted (no longer used).
- **[`sideline/components/playbook/CallSheetSheetSwitcher.tsx`](sideline/components/playbook/CallSheetSheetSwitcher.tsx):** Removed active-sheet badge and **`PUT /api/playbook/active`** mutation from the QA switcher preview.
- **[`sideline/lib/coachCopy.ts`](sideline/lib/coachCopy.ts):** Removed **`PLAY_SHEET_ACTIVE_*`** and **Set as Active** menu copy.
- **[`sideline/lib/constants/designTokens.ts`](sideline/lib/constants/designTokens.ts):** Removed **`playSheetActiveBadgeClass`**.

### Why

Call sheets are opened directly now — there is no global **Active Call Sheet** concept in the product. Keeping **Set as Active** exposed obsolete behavior and extra complexity on **My Call Sheets**.

### Status after this push

- `npm run build` from `sideline/` passed.

---

## 2026-06-29 — Data: CFB27 playbook seed pipeline

### What

- **[`sideline/lib/seed/types.ts`](sideline/lib/seed/types.ts):** Optional **`gameVersion`** (`'cfb26' | 'cfb27'`) on **`TeamPlaybookSeed`**; optional **`isNewIn27`** on **`PlaySeed`** (parallel to **`isNewIn26`**).
- **[`sideline/scripts/seed-playbooks.ts`](sideline/scripts/seed-playbooks.ts):** Upserts and existing-row lookups use **`seed.gameVersion ?? CFB_CATALOG_GAME_VERSION`** so CFB26 seeds unchanged and CFB27 seeds can set **`gameVersion: 'cfb27'`**. Internal test playbooks (**`team`** prefixed with **`_`**) skip **`TEAM_SCHEMES`** validation.
- **[`sideline/lib/seed/playbooks/_template.ts`](sideline/lib/seed/playbooks/_template.ts):** CFB27 template — **`gameVersion`**, **`cfb.fan/27/playbooks/`** source URL, **`isNewIn27`** example.
- **[`DECISIONS.md`](DECISIONS.md):** **2026-06-29 — CFB27 data coexistence with CFB26** (picker filtering, onboarding default, 6-month archive sunset).

### Why

cfb.fan CFB27 playbook data is live; the seed pipeline must accept **`game_version: 'cfb27'`** before team catalog seeding can start. CFB26 and CFB27 rows coexist via the existing **`(playbook, formation, play_name, game_version)`** unique constraint.

### Status after this push

- `npm run seed:playbook -- --all --dry-run` passed (CFB26 seeds unchanged).
- CFB27 test seed validated (**`PROBE RESULT: null`**); test rows cleaned up.
- `npm run build` from `sideline/` passed.

---

## 2026-06-28 — Call Sheet: QA round 2

### What

- **[`sideline/lib/coachCopy.ts`](sideline/lib/coachCopy.ts):** **My Call Sheets** for home title and slide-out nav; **`BUILDER_SITUATION_AT_CAPACITY`** toast copy.
- **[`sideline/components/playbook/AddPlayDrawer.tsx`](sideline/components/playbook/AddPlayDrawer.tsx)**, **[`PlayBrowser.tsx`](sideline/components/film/PlayBrowser.tsx)**, **[`AddPlayBrowseRow.tsx`](sideline/components/playbook/AddPlayBrowseRow.tsx)**, **[`PlaybookEditor.tsx`](sideline/components/playbook/PlaybookEditor.tsx):** Add-play drawer stays open after each add; green checkmarks for plays already on the target situation; capacity enforcement at 25 plays.
- **[`CallSheetSituationGrid.tsx`](sideline/components/playbook/CallSheetSituationGrid.tsx)**, **`PlaybookEditor`:** Situation drag reorder persists on drop (fixed hover index; PATCH on drop; TanStack cache update).
- **[`CallSheetCoachView.tsx`](sideline/components/playbook/CallSheetCoachView.tsx):** Coach View groups plays by formation — formation column left, stacked play names right.
- Full situation cards remain tappable with standard play-count labels (no grayed-out **Full** state).

### Why

Second Call Sheet QA pass: nav copy, multi-add flow, reliable reorder, and a cleaner sideline reference layout in Coach View.

### Status after this push

- `npm run build` from `sideline/` passed.

---

## 2026-06-28 — Page-specific loading skeletons

### What

- **[`sideline/components/shared/PageSkeleton.tsx`](sideline/components/shared/PageSkeleton.tsx):** Replaces the shared film-room placeholder with route-shaped shells — **`FilmRoomSkeleton`** (header, new-game card, game rows), **`PlaySheetHomeSkeleton`** (header + create action + play sheet cards), **`TendenciesHomeSkeleton`** (header, tabs, filter pills, What's Working body).
- **[`sideline/components/shared/AppSkeleton.tsx`](sideline/components/shared/AppSkeleton.tsx):** **`GameDetailSkeleton`** mirrors game detail layout — score/meta line, stats row, action buttons, Drive Summary / Tendencies tabs, drive cards.
- **[`sideline/components/playbook/PlaybookCardSkeleton.tsx`](sideline/components/playbook/PlaybookCardSkeleton.tsx):** Uses shared **`SkeletonBlock`**; wired into play sheet home loading.
- **[`sideline/app/playbook/loading.tsx`](sideline/app/playbook/loading.tsx)**, **[`sideline/app/tendencies/loading.tsx`](sideline/app/tendencies/loading.tsx)**, **[`sideline/app/tendencies/page.tsx`](sideline/app/tendencies/page.tsx)**, **[`PlaybookHome`](sideline/components/playbook/PlaybookHome.tsx)**, **[`TendenciesHome`](sideline/components/tendencies/TendenciesHome.tsx):** Each route uses its matching skeleton instead of **`FilmRoomSkeleton`**.

### Why

Loading placeholders should match the page they represent so coaches see a stable preview of Film Room, Play Sheet, Tendencies, and game detail — not a generic film list on every tab.

### Status after this push

- `npm run build` from `sideline/` passed.

---

## 2026-06-28 — Call Sheet: add situation full-page form

### What

- **[`sideline/components/playbook/SituationFormModal.tsx`](sideline/components/playbook/SituationFormModal.tsx):** **New situation** uses **`presentation="page"`** (same full-screen overlay as edit); back label **Back to situations**.
- **[`sideline/components/playbook/PlaybookEditor.tsx`](sideline/components/playbook/PlaybookEditor.tsx):** Wires create flow to the full-page presentation.

### Why

Add and edit situation flows should feel the same — dedicated screens, not clipped bottom sheets.

### Status after this push

- `npm run build` from `sideline/` passed.

---

## 2026-06-28 — Call Sheet: custom situations (builder CRUD + full-page forms)

### What

- **[`sideline/supabase/migrations/20260628120000_play_sheet_scenario_metadata.sql`](sideline/supabase/migrations/20260628120000_play_sheet_scenario_metadata.sql):** Adds **`description`**, **`icon`**, **`color`**, **`is_locked`** to **`play_sheet_scenarios`**.
- **[`sideline/app/api/playbook/[id]/situations/`](sideline/app/api/playbook/[id]/situations/):** Create, patch, delete, and reorder routes (16 situations max; Go-To Plays locked at index 0).
- **[`sideline/lib/constants.ts`](sideline/lib/constants.ts)**, **[`situationIcons.ts`](sideline/lib/situationIcons.ts)**, **[`situationApiHelpers.ts`](sideline/lib/situationApiHelpers.ts):** **`DEFAULT_SHEET_SITUATIONS`** seeds new sheets; preset icons/colors with static Tailwind **`swatch`** classes for the color picker.
- **[`sideline/components/playbook/SituationFormModal.tsx`](sideline/components/playbook/SituationFormModal.tsx):** Full-page **New situation** and **Edit situation** overlays with back navigation, shared inputs, and delete affordance on edit.
- **[`CallSheetBuilderDashboard`](sideline/components/playbook/CallSheetBuilderDashboard.tsx)**, **[`CallSheetSituationGrid`](sideline/components/playbook/CallSheetSituationGrid.tsx)**, **[`CallSheetBuilderSituationHeader`](sideline/components/playbook/CallSheetBuilderSituationHeader.tsx)**, **[`CallSheetCoachView`](sideline/components/playbook/CallSheetCoachView.tsx)**, **[`PlaybookEditor`](sideline/components/playbook/PlaybookEditor.tsx):** Colored situation cards, edit-mode reorder, add situation CTA, situation detail header polish, Coach View dynamic colors/icons.
- **[`sideline/lib/constants/designTokens.ts`](sideline/lib/constants/designTokens.ts)**, **[`IconBackButton`](sideline/components/shared/IconBackButton.tsx):** **`appShellFieldLabelClass`**, **`appShellFormInputClass`**, square icon back button (**`size-8`**).
- **[`sideline/lib/coachCopy.ts`](sideline/lib/coachCopy.ts):** Delete confirmation — *This will remove this situation. This action cannot be undone.*

### Why

Coaches need named, colored situation buckets they can customize; add and edit should occupy the full screen like other builder flows, with form styling consistent across the app.

### Status after this push

- `npm run build` from `sideline/` passed.

---

## 2026-06-28 — Call Sheet builder: add-play flow QA fixes

### What

- **[`sideline/components/playbook/AddPlayDrawer.tsx`](sideline/components/playbook/AddPlayDrawer.tsx):** Drawer header shows **Add play: {situation}** when opened from a situation bucket; generic **Add play** for dashboard **Browse Playbook**; **`closeOnPick`** keeps the browser open after pick in browse mode.
- **[`sideline/components/playbook/PlaybookEditor.tsx`](sideline/components/playbook/PlaybookEditor.tsx):** **Go-To Plays** gets the same **Add play** affordances as other situations (disabled at 15/15). **Browse Playbook** no longer auto-assigns to Run Game — pick opens a **What's this play for?** dialog reusing **`CallSheetSituationGrid`** with full buckets disabled; success toast **Added to {situation}**; user stays in the play browser.
- **[`sideline/components/playbook/CallSheetSituationGrid.tsx`](sideline/components/playbook/CallSheetSituationGrid.tsx):** Optional **`getOptionState`** for disabled tiles and custom status labels (e.g. **Full**).
- **[`sideline/lib/coachCopy.ts`](sideline/lib/coachCopy.ts):** Parameterized builder copy for situation headers, browse prompt, add confirmation, and full indicator.

### Why

Coaches need clear context when adding calls, a direct path into Go-To Plays, and an explicit situation choice when browsing the full playbook — not silent assignment to Run Game.

### Status after this push

- `npm run build` from `sideline/` passed.

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
- **Ops:** Load into **`playbooks`** with **`npm run seed:playbook -- <slug> [slug…] | --all`** (**`scripts/seed-playbooks.ts`**); compare DB to seeds with **`npm run verify:playbook -- …`** after upsert. Canonical **`play_type`** for stored rows still flows through **`resolveSeedPlayType`** → **`mapToCanonicalPlayType`** → **`RUN` / `PASS` / `RPO`** per **`DECISIONS.md`** **2026-05-02 — Seed playbook script**.

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
- **Seed scripts:** **`scripts/seed-playbooks.ts`** **`mapToCanonicalPlayType`** maps full **`SeedPlayType`** labels (**`Option`**, **`Play Action`**, **`Screen`**, etc.) to **`RUN` / `PASS` / `RPO`** for **`playbooks`** upserts when seeds omit explicit **`playType`**.

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
- [`sideline/app/api/playbook/[id]/plays/route.ts`](sideline/app/api/playbook/[id]/plays/route.ts): Enrich **`suggestions`** with **`resolveCfbDisplayPlayType`** after **`buildSuggestions`** (same **`playbooks`** map as sheet rows).
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
- [`sideline/lib/tendenciesServer.ts`](sideline/lib/tendenciesServer.ts): **`attachPlayTypes`** prefers **`deriveCfbPlayTypeFromName`** over a catalog **`playbooks.play_type`** hit when the derived raw is **Screen**, **Play Action**, **RPO** (`rpo_read`), or **Option** (`option_qb_run`), so generic sheet labels (e.g. quick pass) do not hide those tendency buckets; existing **`shouldOverrideCfbPassLabelToRun`** still runs after.
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

- [`sideline/app/api/cfb26-plays/route.ts`](sideline/app/api/cfb26-plays/route.ts): Replaced strict `game_version` equality checks with case-insensitive matching (`.ilike("game_version", CFB_CATALOG_GAME_VERSION)`) across list/search/formation queries so production catalog rows load even when `playbooks.game_version` casing is inconsistent.
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
- **Catalog / shared reads**: **`playbooks`**, **`team_offensive_playbooks`**, **`team_defensive_schemes`**, and **`scheme_play_weights`** use **`SELECT`** policies with **`using (true)`** so anon reads used by setup and tendencies stay available; writes remain service-role only where applicable.
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

- Added shared play-type resolution helpers so Film and Playbook use the same matching ladder as Tendencies (`playbooks` lookup by normalized keys, then stored value, then safe fallback).
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

- **QA18:** Implicit drive completion for the fast logger (no End Drive / no in-header dismiss); sticky header and `PlayBrowser` full-bleed `bg-slate-900` treatment; formation browser as one scroll with sticky group headers then formation rows (superseded by QA19 chip grid); chevron consistency; Supabase migration normalizing `playbooks.play_type` to `RUN`/`PASS`/`RPO` with a check constraint; `PlayRow` / `inferPlayType` guard removing `OTHER`; film page dropped the empty-drive confirm modal.
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

- **`GET /api/cfb26-plays`** — Queries `playbooks` by playbook: list formations grouped by formation type, list plays for a formation, or search (≥2 chars) with grouped results; formation types ordered (Pistol, Gun, Goal Line, then alphabetical).
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
