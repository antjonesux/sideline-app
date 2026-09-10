# Session Brief — Pass 6b: Defensive Logging — Touchdown Result + Play Type

**Objective:**  
Add defensive touchdown as a result option and run/pass/RPO play type tagging to defensive play logging.

**Done means:**
- [x] Defensive play logging shows Touchdown as a result tag option
- [x] Touchdown + Interception and Touchdown + Fumble are valid combinations
- [x] Defensive TD triggers post-TD scoring flow (XP/2PT)
- [x] Defensive play logging includes RUN/PASS/RPO play type selection
- [x] Play type is required on defensive plays
- [x] Play type stores to `logged_plays.play_type` same as offensive plays
- [x] Validation rules updated: Touchdown is standalone unless combined with Interception or Fumble
- [x] No regressions to existing defensive result tag behavior
- [x] No regressions to offensive logging
- [x] `npm run build` clean

**Handoff notes:**

### Defensive TD validation rules (`defensiveResultTags.ts`)
- **Blunt standalone:** Incomplete, Penalty, Punt — selecting one clears all others
- **Touchdown:** keeps only Interception and/or Fumble (pick-six / scoop-and-score); drops Incomplete/Punt/Penalty/Sack
- **Interception:** alone → `[INTERCEPTION]`; with TD already on → `[INTERCEPTION, TOUCHDOWN]`
- **Sack + Fumble** still coexist; Sack clears Touchdown
- **`deriveDefensiveStoredResultTag`:** `TOUCHDOWN` wins over `TURNOVER` so pick-six ends as TD and triggers XP/2PT

### Scoring
- Defensive TD / XP / 2PT credits **`score_mine`** (your D scored), matching `adjustDriveScore`
- `computeCumulativeDriveScores` now always adds scoring points to mine; opponent points stay manual
- Side-of-ball: defense drive + TD = pick-six/scoop-and-score for the coach

### Opponent play type
- Required RUN/PASS/RPO chips on `DefensiveLogSheet` (Pass 4 chip UI, `includeAll={false}`)
- Persisted on `logged_plays.play_type`; API fails closed if defense POST/PUT lacks a valid opponent type
- Conversion snaps (XP/2PT) on defense **carry forward** the TD play’s opponent play type
- Catalog MAN/ZONE/BLITZ/MATCH badge on the call remains display-only from play name

### Tendencies
- Stored `play_type` is now real RUN/PASS/RPO on defense. Tendencies UI breakdowns for defensive opponent play type are **out of scope** (follow-up). `attachPlayTypes` may still re-derive from defensive catalog names in some paths — verify before shipping a tendencies defense play-type chart.
