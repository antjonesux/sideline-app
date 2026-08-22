# SESSION BRIEF — Film Room Pass 3: play logger integration

**Objective:**  
Wire the play logger (`PlayLoggerV2`, `PlayBrowser`, `YardageSheet`) into the decomposed game detail shell from Pass 2 and verify the full logging loop works end-to-end.

**Why this matters:**  
The play logger is the core coaching loop — play lookup → select → ball spot → result → log must feel fast and seamless during the play clock.

**In scope:**  
- `PlayLoggerV2`, `PlayBrowser`, `YardageSheet`, logger hooks/lib (unchanged internals)
- `app/film/[gameId]/page.tsx` — logger integration point only
- `FilmPlayLoggerOverlay.tsx` — overlay wrapper
- `DriveList.tsx` → logger wiring via `onOpenLogger` / active drive

**Out of scope:**  
- Pass 1 session list/creation; Pass 2 shell restructure; Pass 4 tendencies; CSV import; new logger features; API/schema changes

**Done means:**  
- [x] Logger opens for active/open drives via overlay (`Log a call` / post–drive-setup)
- [x] Browse, My Sheet, and Situational paths wired through `PlayLoggerV2`
- [x] POST/DELETE plays, game state advancement, drive-ending behavior via page `refresh()` + invalidation
- [x] Logger state resets when switching drives (`key={activeDrive.id}` on overlay mount)
- [x] `PlayBrowser` shared interface unchanged for Call Sheet Builder
- [x] `npm run build` passes  

**Handoff notes:**  
- **Files touched:** `components/film/FilmPlayLoggerOverlay.tsx` (`key={activeDrive.id}` for drive-switch reset), `CHANGELOG.md`, `SESSION_BRIEF.md`
- **Prop changes to `PlayLoggerV2`:** None — same interface as Pass 2 (`FilmPlayLoggerOverlay` passes through unchanged)
- **Wiring issues encountered:** Pass 2 already wired the logger; Pass 3 was Scenario A (verification). One polish fix: remount logger on drive change so yardage/suggestion state does not leak when `openForCreate` targets a different drive without closing the overlay.
- **Open risks / gaps:** Logger is overlay-only (not inline in drive card) — matches Pass 2 design. Play deletion from drive table uses page-level confirm modal; logger stream delete is separate in-overlay path. Manual QA of full Browse → Yardage → log loop recommended in browser with a real game session.
- **Notes for Pass 4:** Tendencies tab already lazy-mounts `FilmGameTendenciesBody`; invalidation flows through page `refresh()` → `tendenciesQueryKeys.all`. No logger changes needed for Pass 4.
