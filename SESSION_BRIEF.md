# Session Brief — My Tendencies dashboard

**Objective:**
Ship **My Tendencies** as a standalone top-level surface with a dashboard-style hero stats row, page-level Offense/Defense toggle, and reuses the existing `WhatsWorking` and `AmIPredictable` tab content underneath.

**Why this matters:**
Tendencies were parked off the nav during the call sheet reframe. With Film Room back, coaches have per-game tendencies inside each game — but no way to see cross-game patterns without typing `/tendencies` into the URL. This closes the coaching loop: log plays → review game → study tendencies across the season.

**In scope:**
- `sideline/lib/navigation/appShellNav.ts` — add My Tendencies nav item (route stays `/tendencies`)
- `sideline/components/tendencies/TendenciesHome.tsx` — new page header, hero stats row, Offense/Defense toggle
- New `sideline/components/tendencies/MyTendenciesHeroStats.tsx` — 4-card stat row
- New `GET /api/tendencies/overview` — games logged, win rate, avg YPP, run/pass split, filtered by side of ball
- `sideline/app/api/tendencies/top-plays/route.ts`, `top-formations/route.ts`, `predictability/route.ts` — accept `side_of_ball` param, filter aggregations accordingly
- `sideline/components/tendencies/WhatsWorking.tsx`, `AmIPredictable.tsx` — accept `sideOfBall` prop, thread through queries
- `sideline/lib/tendenciesQueryKeys.ts` — include `sideOfBall` in cache keys
- `sideline/lib/coachCopy.ts` — rename "Plays to Reconsider" → "Calls to Reconsider"

**Out of scope:**
- Removing the `/tendencies` route or renaming it (keep URL stable)
- Redesigning individual tab content beyond adding `sideOfBall` filtering
- The `FilmGameTendenciesBody` component in game detail (already has its own offense/defense toggle)
- Changing app shell layout, `max-w-*` tokens, or introducing new page-level layout patterns beyond what the existing shell allows
- Adding new charts or visualizations to `PlayTypeDistribution` or `ScoutingReportSection`
- Onboarding empty state changes (existing "No games logged" state stays)
- Nav icon change for other items

**Existing patterns to reuse:**
- Offense/Defense toggle pattern: `sideline/components/film/tendencies/FilmGameTendenciesBody.tsx` (game detail already has this — copy the visual pattern and side_of_ball plumbing)
- Stat card pattern: `sideline/components/tendencies/GameStatsGrid.tsx` (Card component, label + value + description)
- Key rate card pattern: `KeyRateCard` inside `sideline/components/tendencies/AmIPredictable.tsx` (`min-h-[132px]`, mono label, heading value, body description) — hero stats mirror this style
- Filter pill pattern: `sideline/components/tendencies/TendenciesFilters.tsx` (rounded-full border pills, emerald active state)
- Nav item pattern: existing entries in `sideline/lib/navigation/appShellNav.ts` (ClipboardList, Headset, Video, Settings — add Activity from lucide-react)
- Query key structure: `sideline/lib/tendenciesQueryKeys.ts` (extend with sideOfBall segment)
- Tendencies aggregation: `sideline/lib/tendenciesServer.ts` (reuse for overview endpoint)

**Constraints:**
- `npm run build` from `sideline/` must pass; no `any`, no `@ts-ignore`
- No new placeholder routes or coming-soon UI
- Coach-facing copy follows `.cursorrules` terminology (calls, tendencies, play caller)
- Dark-only, follows existing color tokens
- `/tendencies` URL stays the same; only the nav label reads "My Tendencies"
- Offense/Defense toggle is a page-level filter — all child queries (hero stats, top plays, top formations, predictability) filter by the selected side
- Defense view shows appropriate empty state when no defensive plays exist (mirror game-detail behavior)

**Relevant decisions:**
- `DECISIONS.md` 2026-04-21 — Coaching tool, not logging tool. Cross-game tendencies are a first-class coaching insight.
- `DECISIONS.md` 2026-04-20 — Single play-type resolution (`playTypeResolution`); overview endpoint must use the same ladder.
- `BUILD_CONTRACT.md` — API mutations tighten toward `{ data }` / `{ error }` contract where reasonably possible; extend existing patterns, don't fork.
- Changelog 2026-08-24 — Film Room game-detail tendencies already have offense/defense toggle with `side_of_ball` filter on `/api/tendencies/game/[id]`. Cross-game endpoints don't yet accept it.

**Done means:**
- [ ] My Tendencies nav item visible in sidebar with Activity icon, active state works
- [ ] `/tendencies` renders new header, subtitle with games count, Offense/Defense toggle, hero stats row, tab bar, filter pills, and existing tab content
- [ ] Hero stats show Games Logged, Win Rate (W-L split), Avg YPP, Run/Pass split — all respecting the Offense/Defense toggle
- [ ] Switching to Defense filters all sections (hero stats, top plays, top formations, predictability, calls to reconsider)
- [ ] Defense view shows empty state when no defensive plays logged
- [ ] "Calls to Reconsider" copy replaces "Plays to Reconsider" across shared components
- [ ] All existing tendencies functionality preserved (filters, playbook filter, pagination, scouting report)
- [ ] Mobile layout: hero stats collapse to 2×2 grid, filter pills wrap
- [ ] `npm run build` passes

**Handoff notes:**
- Files touched:
  - `sideline/lib/navigation/appShellNav.ts` — My Tendencies nav (Activity)
  - `sideline/lib/coachCopy.ts` — `APP_SHELL_MY_TENDENCIES_MENU_LABEL`, `TENDENCIES_CALLS_TO_RECONSIDER`, `TENDENCIES_NO_DEFENSIVE_PLAYS`
  - `sideline/components/tendencies/TendenciesHome.tsx` — header, toggle, hero, defense empty
  - `sideline/components/tendencies/MyTendenciesHeroStats.tsx` (new)
  - `sideline/components/tendencies/TendenciesSideOfBallToggle.tsx` (new)
  - `sideline/components/tendencies/TendenciesFilters.tsx` — `sideOfBall` in query string
  - `sideline/components/tendencies/WhatsWorking.tsx`, `AmIPredictable.tsx` — `sideOfBall` prop
  - `sideline/app/api/tendencies/overview/route.ts` (new)
  - `sideline/app/api/tendencies/top-plays|top-formations|predictability/route.ts` — `side_of_ball`
  - `sideline/lib/tendenciesServer.ts` — drive-side play fetch, overview summary, `resolveTendenciesGamePool`
  - `sideline/lib/tendenciesQueryKeys.ts` — `overview`
  - `CHANGELOG.md`
- Overview endpoint response shape:
  ```json
  { "data": { "games_logged": 12, "wins": 8, "losses": 4, "win_rate_pct": 67, "avg_yards_per_play": 5.4, "run_pct": 42, "pass_pct": 58 } }
  ```
- side_of_ball defaulting behavior: omitted → `"offense"` via `parseSideOfBallFilter` (same as game-detail).
- Query key migration: `side_of_ball` is part of `buildTendenciesQueryString`, so existing `topPlays` / `topFormations` / `predictability` keys segment on the full qs (no stale cross-side cache). New `overview(qs)` key.
- Follow-ups: playbook filter on defense still matches the game's **offensive** playbook (dropdown source unchanged). Defense empty replaces hero+tabs per brief (header + toggle remain). Game-detail `FilmGameTendenciesBody` still says "PLAYS TO RECONSIDER" (explicitly out of scope).
