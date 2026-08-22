# SESSION BRIEF — Film Room Pass 2: game detail shell + drive management

**Objective:**  
Migrate the Film Room game detail shell and drive management into the new app shell, and decompose the monolithic `[gameId]/page.tsx` into focused components.

**Why this matters:**  
This is the container that Passes 3 and 4 build inside. The play logger and in-game tendencies need a clean, decomposed game detail shell to wire into.

**In scope:**  
- `app/film/[gameId]/page.tsx` — thin orchestrator
- `app/film/[gameId]/layout.tsx` — Suspense boundary (unchanged)
- `GameDetailHeader.tsx`, `DriveList.tsx`, overlay/dialog shells
- Existing drive components: `DriveSetupForm`, `DriveStartingFieldPanel`, `DriveInlineScores`, `DriveCardOutcomeBadge`, `filmDriveDetailCardClasses`, `GameStatsInline`
- Drive API routes (unchanged): `games/[id]/drives`, `drives/[id]`

**Out of scope:**  
- Pass 1 session list/creation; Pass 3 logger improvements; Pass 4 tendencies content; CSV import; guided onboarding; schema changes

**Done means:**  
- [x] `[gameId]/page.tsx` decomposed into focused components  
- [x] Game detail header: matchup, score, stats strip, drive/end-game actions  
- [x] Tab navigation: "Drive Summary" (default) and "Tendencies"  
- [x] Drive list: outcome badges, scores, expandable play tables, CRUD  
- [x] Create/delete drive, edit starting field, inline scores preserved  
- [x] `PlayLoggerV2` and `FilmGameTendenciesBody` still wired through decomposition  
- [x] No guided onboarding references in Pass 2 files  
- [x] `npm run build` passes  

**Handoff notes:**  
- **Files touched:** `app/film/[gameId]/page.tsx`, `components/film/{GameDetailHeader,DriveList,FilmDriveSetupOverlay,FilmPlayLoggerOverlay,FilmEndGameScoreDialog}.tsx`, `lib/filmGameDetailHelpers.ts`, `CHANGELOG.md`, `SESSION_BRIEF.md`
- **New components:** `GameDetailHeader`, `DriveList`, `FilmDriveSetupOverlay`, `FilmPlayLoggerOverlay`, `FilmEndGameScoreDialog`; helpers in `filmGameDetailHelpers.ts`
- **Props/interfaces for Pass 3:** `FilmPlayLoggerOverlay` wraps `PlayLoggerV2` with same props as before (`gameId`, `driveId`, `playbook`, `drive`, `onRefresh`, `sheetId`, `loggerOpenFlowId`, play counts, `allGameCoachCalls`, `onPossessionEndedAfterLog`). Page owns `showLogger`, `activeDrive`, `openForCreate(driveId)`.
- **Props/interfaces for Pass 4:** Tendencies tab renders `<FilmGameTendenciesBody gameId={gameId} />` when tab active; no prop changes needed.
- **Open risks / gaps:** Game detail header uses inline Add Drive / End Game buttons (not kebab edit/delete — those remain on session list cards). `DriveList.tsx` is ~257 lines (slightly above ~200 JSX guideline). Page orchestrator still ~616 lines total (logic retained in page per data-flow rules).
- **Notes for Pass 3:** Logger overlay is `FilmPlayLoggerOverlay`; slot opens via `openForCreate` from drive cards or post–drive-setup. Pass 3 can refine logger UX without touching drive list structure.
- **Notes for Pass 4:** Tendencies tab lazy-mounts `FilmGameTendenciesBody` when selected; invalidation already flows through page `refresh()` → `tendenciesQueryKeys.all`.
