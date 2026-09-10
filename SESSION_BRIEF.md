# Session Brief — Pass 6a: Film Room Logger Scoring Bugs

**Objective:**  
Fix two bugs in the Film Room play logger: the post-TD XP/2PT selector not appearing (modal auto-closes), and the inability to add or edit scores on drives.

**Done means:**
- [x] After logging a touchdown, XP/2PT selector appears before drive closes
- [x] XP Made / XP Missed / 2PT Made / 2PT Missed result options work correctly after TD
- [x] Score updates correctly after XP/2PT completion
- [x] Coach can set score when creating a new drive
- [x] Coach can edit score on a completed drive (from the drive card or detail)
- [x] Coach can edit score on an in-progress drive
- [x] Manual score override takes precedence over derived score when set
- [x] Running game score in the header reflects manual overrides
- [x] No regressions to non-scoring drives, FG-only drives, punt drives
- [x] `npm run build` clean

**Handoff notes:**

### Bug 1 root cause — TD auto-close race
`possessionEndedFromSnapAndTag` treats `TOUCHDOWN` as possession-ending. The post-TD XP/2PT hold lived *after* `onRefresh()` + score adjust, and optimistic TD was cleared *before* refresh — so for a frame `mergedPlays` had no TD, `driveNeedsPostTdAttempt` flipped false, and the coach could land in a closed/ended drive with no selector. Fix: set `showPostTdSelector` immediately on offensive TD, refresh before clearing optimistic, never call `onPossessionEndedAfterLog` on offensive TD (only after XP/2PT), and keep `Log a call` available when `driveNeedsPostTdAttempt` is true.

### Manual vs derived scores
`resolveDriveRunningScores` in `filmPostTdFlow.ts`: persisted `score_mine` / `score_opponent` win when non-null; `computeCumulativeDriveScores` fills only when null. `adjustDriveScore` now updates local drive state so TD + XP bumps stack and the header tracks immediately.

### Score edit entry points
1. **Drive setup** (`FilmDriveSetupOverlay` / `DriveSetupForm`) — seed + edit on create
2. **Drive card** expanded detail (`DriveInlineScores` in `DriveList`) — in-progress or completed
3. **Post-drive modal** (`FilmUpdateScoreDialog`) — after possession end (FG/punt/turnover/XP/2PT close)
4. **Header** — reflects resolved running score (manual wins)
5. **End Game** — seeds from the same resolve helper

### DriveInlineScores
No API changes required; callers now pass resolved persisted scores instead of derived-first values.

### Review note (non-blocking)
Drive `PUT` still coerces null scores to `0` (pre-existing). New games always set numeric scores on create; legacy null rows fall back to derived until first save.
