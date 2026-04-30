# Sideline — build contract

How we build **The Sideline**: a coach-first film and call-logging assistant (positioning: *Study your game. Call it smarter.*) — Next.js app in `sideline/`. This doc aligns humans and AI agents with **what the repo does today**, not generic best practices.

---

## Product intent

- **Coach-first tool:** fast sideline logging, readable drives, tendencies that answer “what do I call here?” without analyst jargon.
- **Three pillars** (bottom nav): **Film Room** (`/film`), **Game Plan** (`/playbook`), **Tendencies** (`/tendencies`).
- **Authenticated home (`/`):** **`app/page.tsx`** gates with **`HomeOnboardingGate`**. If the coach already has logged plays (sum of game **`play_count`** is above zero), the client **`replace`**s to **`/film`** automatically; otherwise **`/`** shows stepped onboarding (coaches may leave via the playbook CTA **`Link`** to Game Plan without that redirect). **Unauthenticated** visitors to **`/`** (and other protected routes per **`proxy.ts`**) are **`redirect`**ed to **`/landing`** with an optional encoded **`next`** query when a safe internal return URL exists. **`/signup`** is a real redirect to **`/login?register=1`** (not a placeholder page). Authenticated visits to **`/landing`** redirect to **`next`** (when allowed) or **`/film`** so marketing stays unauth-first.
- **Mental model:** *game* → *drives* → *calls* (logged plays). Play names and formations come from the coach’s sheet vocabulary; CFB26 catalog (`cfb26_plays`) supplies canonical metadata (especially **RUN / PASS / RPO**).

---

## Source-of-truth order

1. **Running code** under `sideline/` (layouts, APIs, components).
2. **Repo-root `.cursorrules`** — typography, UX principles, copy/terminology, TS strictness, dark-mode and layout rules, scaffolding, state/data patterns.
3. **`CHANGELOG.md`** (root) and **`sideline/CHANGELOG.md`** (file-level detail) — what shipped and why.
4. **`BUILD_CONTRACT.md` / `DECISIONS.md`** — alignment; they must not contradict 1–2 without an explicit product decision.

If `.cursorrules` and an older code path disagree, **prefer the layout and pages that actually ship** (see UI contract below) and note drift in the session brief rather than “fixing” unrelated files.

---

## Convention vs recommendation

If the repo shows inconsistent patterns:
- follow the most common current implementation
- do not invent a new pattern mid-task
- note the inconsistency in the session brief instead of fixing unrelated files

Only establish a new convention when the change is intentional and scoped.

---

## Repo map

| Location | Role |
|----------|------|
| `sideline/` | Next.js app: `npm run dev`, `npm run build`, `npm run lint` |
| `sideline/app/` | App Router pages and `api/` routes |
| `sideline/app/landing/` | Marketing welcome — static hero (showcase image, copy, CTAs into auth via **`buildLoginHref`** — create-account and sign-in preserve optional **`next`**; **`/signup`** remains a redirect to **`/login?register=1`**); primary unauth entry before sign-in |
| `sideline/components/shared/` | Cross-feature UI (nav, tables, modals, toasts) |
| `sideline/components/film/`, `playbook/`, `tendencies/`, … | Feature UI |
| `sideline/lib/` | Types, Supabase helpers, engines (`gameStateEngine`, `driveOutcome`, `fieldPosition`), `playTypeResolution`, copy helpers |
| `sideline/store/` | Zustand (toast, game session, import, persisted prefs) |
| `sideline/hooks/` | Shared hooks (e.g. formation groups, play suggestions) |
| Repo root | `.cursorrules`, `CHANGELOG.md`, this contract, `DESIGN_AUDIT.md` (audit only) |

---

## Architecture rules

- **Next.js App Router** — server components where default; interactive surfaces use `"use client"`.
- **Data access:** Supabase and heavy transforms belong in **`lib/`** and **route handlers**, not in leaf UI (per `.cursorrules`). Client pages use `fetch` / TanStack Query to `/api/*`.
- **Types:** shared domain types live in **`sideline/lib/types.ts`** (`GameSession`, `Drive`, `LoggedPlay`, sheet rows, etc.).
- **Game truth:** field position and progression use **`fieldPosition`**, **`gameStateEngine`**, **`driveOutcome`** — do not duplicate possession/yard logic in components for “one-off” behavior.
- **Play type truth:** one resolution ladder via **`playTypeResolution`** (and `tendenciesServer` helpers) so Film, Game Plan, import, and Tendencies stay on **RUN / PASS / RPO** (see `DECISIONS.md`).

---

## Film / Game Plan / Tendencies (relationships)

- **Film Room** — creates and edits **`game_sessions`**, **`drives`**, **`logged_plays`**. Primary UX: **`PlayLoggerV2`** (tabs: **Browse** = inline `PlayBrowser`; **Situational** = suggestions from **`buildSituationAwareCallingSuggestions`** (`lib/filmLoggerCallingSuggestions.ts`) plus one explainer line from **`filmLoggerYouveBeenCallingHint`** in **`lib/coachCopy.ts`** (*“Based on what you've called on {situationLine} at {fieldLine}”* — no separate **“You’ve been calling…”** label); **My Sheet** = optional when the game has a bound play sheet — horizontal **scrollable** situation chips (**all** scenarios on the sheet, Game Plan–style **n/max**), plays for the selected chip (**`PlayRow`**, same card pattern as Situational), subtitle **“Based on {sheet name} play sheet”** — uses TanStack + existing **`GET /api/playbook/[id]`** for chip data and **`GET /api/playbook/[id]/plays?scenario=…`** for rows), **`YardageSheet`**, drive setup, game detail tabs (e.g. drives vs in-game tendencies body). Uses TanStack Query invalidation and toasts (`store/toastStore`, `lib/coachCopy`).
- **Game Plan** — play sheets / editor under `app/playbook/`; reuses **film patterns** where the changelog says so (e.g. `AddPlayDrawer` + `PlayBrowser`, modal shell parity with Film).
- **Tendencies** — reads logged games; playbook filter via URL `?playbook=`; tabs **What’s Working** / **Am I Predictable?**; uses `playbookForGame`, `tendenciesQueryKeys`, `/api/games`, `/api/playbooks/list`, and tendencies-specific APIs under `app/api/tendencies/`.
- **Shared spine:** **`cfb26_plays`** joins playbook language to canonical play types; **`playTypeResolution`** keeps API responses and badges aligned across features.

---

## Component and file rules

- **One component per file**; filename matches exported component (PascalCase).
- **Feature vs shared:** `components/[feature]/` vs `components/shared/` — reuse shared primitives (`DataTable`, `DropdownMenu`, `ResultBadge`, `drivePlayTableColumns`, skeletons) instead of cloning.
- **API routes:** `sideline/app/api/.../route.ts` — kebab-case path segments (e.g. `top-plays`, `cfb26-plays`).
- **Zustand:** `sideline/store/*.ts` for cross-route client state and toasts.
- **No placeholder routes** — per `.cursorrules`, do not add pages that are only “Coming soon”; ship real UI in the same change or do not add the route.

---

## UI / UX reuse rules

- **Dark-only app** — `html` has `dark`; use `dark:` tokens / design tokens from `.cursorrules` and `globals.css` / `constants/designTokens` as elsewhere in the app.
- **shadcn/ui (Radix primitives)** for **tabs, dropdowns, selects, buttons**, and **dialogs** used for shared confirmations and settings-style shells (**`Dialog`** / **`ConfirmDestructiveModal`**, etc.); tokens from `globals.css` / CSS variables; dark-only styling required (see `.cursorrules`).
- **Legacy full-bleed overlays:** some Film flows (**`app/film/[gameId]/page.tsx`**) still use **hand-rolled `fixed` + high `z-index` sheets** (e.g. **drive setup**, **full-screen logger**). **End game (final score)** confirmation uses **Radix `Dialog`**. New work should **prefer `Dialog`** when touching those surfaces; do not copy the legacy pattern elsewhere without an explicit brief.
- **Kebab / overflow menus:** Film drive rows use **`components/shared/DropdownMenu`** (declarative items + **`dropdownMenuRegistry`** so only one menu stays open in dense lists). Game and play sheet cards that need arbitrary menu rows and controlled open state next to modals use **`CardKebabMenu`** with **`@/components/ui/dropdown-menu`** children. Match the surface already using one of these two paths; do not add a third menu shell.
- **Scroll and bottom nav:** root **`sideline/app/layout.tsx`** is authoritative — `main` uses `max-w-3xl`, horizontal padding, and **`pb-[calc(7rem+env(safe-area-inset-bottom,0px))]`** so content clears the fixed tab bar. Feature pages should not shrink bottom padding at `sm:` breakpoints in ways that overlap the nav. **Marketing chrome** (`/landing`, sign-up shell, etc.): **`BottomTabNav`** sets **`data-marketing-chrome`** on `html` and **`globals.css`** forces **`main`** bottom padding to **`0`** where needed so full-height marketing layouts are not undercut by the tab-bar offset (intentional exception to the default `main` padding rule).
- **Bottom tab nav** — `z-40` in `BottomTabNav`; modals/overlays must stack above it (see recent film modal portal work in changelog).
- **Feedback:** writes show success/error toasts; destructive actions confirm; loading uses skeletons shaped like content (per `.cursorrules`).
- **Known deviations:** `DESIGN_AUDIT.md` lists inconsistencies; new work should **move toward** the design system, not add new one-off patterns.

---

## API and data integrity rules

- **Target contract** (from `.cursorrules`): explicit `.select()` columns, handle Supabase `error`, prefer `{ data: … }` / `{ error: … }` with correct HTTP status for **new or heavily touched** routes.
- **Legacy reality:** some routes still return **raw arrays** (e.g. `GET /api/games`) or feature-specific keys (`{ formations }`, `{ playbooks }`). When editing an endpoint, **tighten toward** the contract if you can do it without breaking all callers in the same PR; do not mass-refactor unrelated APIs “for consistency” in drive-by changes.
- **Mutations:** after POST/PUT/DELETE, invalidate the relevant TanStack Query keys (see existing `tendenciesQueryKeys` and patterns on `film/[gameId]`).
- **Imports:** CSV flow under `film/import` and `/api/import/*` — preserve validation/execute semantics documented in changelog when touching import.

---

## Copy rules

- **Canonical voice and terminology** — repo-root **`.cursorrules`** (“UX Copy & Terminology”, stats fragments, empty states, errors, exact nav strings).
- **Shared short errors** — `sideline/lib/coachCopy.ts` for toasts/alerts (no DB/API leakage).
- **Film logger situational explainer** — **`filmLoggerYouveBeenCallingHint`** in **`sideline/lib/coachCopy.ts`** (template: *“Based on what you've called on … at …”*). **`buildSituationAwareCallingSuggestions`** still scores **this game’s** logged coach calls using **scenario, field zone, down, distance**, recency, volume, and **play-name keyword** bias, and may **append catalog plays** when fewer than the limit of scored calls exist — when editing copy, avoid overstating precision relative to that engine (see **`DECISIONS.md`** **2026-04-29**).
- **Scouting / coaching paragraphs** — `sideline/lib/scoutingCoachingCopy.ts` is the intentional exception to “fragments only” for longer scenario copy.

---

## Performance rules

- Avoid **N+1** Supabase round-trips in new APIs; prefer one query with explicit selects/joins where the schema allows.
- Reuse existing **React Query** `staleTime` patterns for list endpoints when adding queries.
- Do not introduce speculative multi-layer caching or new global state stores without a concrete need.

---

## AI agent rules

1. Read **this file**, **`DECISIONS.md`** before coding.
2. Work inside **`sideline/`** for app changes; run **`npm run build`** from `sideline/` before considering a task done.
3. **No `any`**, no `@ts-ignore` / `@ts-expect-error` (per `.cursorrules`).
4. **One scoped task** — no drive-by refactors or unrelated files.
5. **Changelog** — on push, follow `.cursorrules` (root `CHANGELOG.md`); do not duplicate changelog prose inside these OS docs.
6. When unsure between two patterns, **find a second usage in the repo** and match it.

---

## Agent collaboration rules

### Surface ownership

- One agent owns one feature surface at a time (e.g. Film, Playbook, Tendencies, Auth).
- Do not have two agents modifying the same surface concurrently.
- Shared component changes belong to the agent whose task requires them unless explicitly handed off.

### Handoff requirement

When work moves between agents, include:
- files touched
- decisions made (and why)
- patterns reused
- open risks or gaps

The next agent should extend the work, not reinterpret it.

### Conflict resolution

If two valid approaches exist:
- prefer the one that matches existing repo patterns
- prefer the one that preserves the coaching loop
- prefer the simpler implementation

Do not introduce alternate patterns unless explicitly required and documented.

---

## Definition of good work

- `npm run build` passes with zero TS errors.
- Coach-visible behavior matches feedback/empty-state rules; copy follows `.cursorrules`.
- Film / tendencies / playbook stay on the **shared play-type and layout** paths where applicable.
- No new orphan UI or API shapes without updating callers and, when appropriate, DECISIONS/changelog.

---

## When to update this file

Update `BUILD_CONTRACT.md` only when:
- a new consistent pattern is intentionally introduced
- an existing pattern is formally replaced
- a rule here is proven to be incorrect or harmful

Do not update this file for one-off implementation details.