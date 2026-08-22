# SESSION BRIEF — Film Room Pass 4: in-game tendencies integration

**Objective:**  
Wire the in-game tendencies panel (`FilmGameTendenciesBody`) into the Tendencies tab of the decomposed game detail shell, verify all sub-components render correctly, and confirm query invalidation refreshes tendencies after plays are logged.

**Why this matters:**  
This is the payoff surface — the data that tells the coach "what am I doing and is it working?" Without tendencies, logging plays is just data entry. This pass closes the coaching loop: log plays → see analysis.

**In scope:**  
- `FilmGameTendenciesBody.tsx` — in-game tendencies panel
- Wiring into the Tendencies tab in `app/film/[gameId]/page.tsx`
- Query invalidation after play log/delete via page `refresh()`
- Sub-components: `PlayTypeDistribution`, `TopPlaysList`, `TopFormationsList`, `ReconsiderPlays`, `WorkingListPagination`

**Out of scope:**  
- Pass 1 session list/creation; Pass 2 shell restructure; Pass 3 play logger; top-level `/tendencies` page; modifications to `components/tendencies/` or tendencies lib/API

**Done means:**  
- [x] Tendencies tab renders `FilmGameTendenciesBody` with correct `gameId`
- [x] Play type distribution, top plays, top formations, reconsider plays, situation breakdowns wired via existing component
- [x] Loading skeleton (`TendenciesSectionSkeleton`) and empty states handled in body
- [x] Query invalidation: page `refresh()` → `tendenciesQueryKeys.all` after log/delete (Pass 3 path)
- [x] No modifications to shared `components/tendencies/` files or tendencies API/lib
- [x] `npm run build` passes  

**Handoff notes:**  
- **Files touched:** `CHANGELOG.md`, `SESSION_BRIEF.md` (documentation only — Scenario A verification)
- **Wiring issues encountered:** None. Pass 2 already lazy-mounts `FilmGameTendenciesBody` under the Tendencies tab with `{detailTab === "tendencies" ? <FilmGameTendenciesBody gameId={gameId} /> : null}`.
- **Query invalidation behavior confirmed:** Page `refresh()` invalidates `tendenciesQueryKeys.all`, which covers `tendenciesQueryKeys.game(gameId)`. Logger (`PlayLoggerV2`) and drive-table delete both call `onRefresh={refresh}` after POST/DELETE. No Pass 4 code changes required.
- **Open risks / gaps:** Manual browser QA recommended for data-dependent branches (empty state, pagination, reconsider list threshold). Tendencies tab lazy-mounts on first visit — invalidation while on Drive Summary tab will refetch when coach switches to Tendencies.
- **Notes for post-migration work:** Film Room 4-pass migration complete. Consider removing any legacy Film routes or dead code identified in audit docs if not already done.
