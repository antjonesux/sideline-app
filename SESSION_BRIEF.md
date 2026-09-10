# Session Brief — Pass 8: Success Rate Definition Alignment

**Objective:**  
Align success rate calculation with the industry-standard 50/70/100 definition, fix eligibility filtering, and surface it correctly with side-aware colors and per-type breakdowns on Game Stats and Overall Tendencies.

**Done means:**
- [x] Success rate uses integer floor thresholds (50/70/100)
- [x] SACK always unsuccessful, TD always successful, turnover always unsuccessful
- [x] FG, XP, 2PT, kneel, spike excluded from success rate denominator
- [x] Overall Calls count unchanged
- [x] `computeSuccessRate` returns null when fewer than 5 eligible plays
- [x] Film Game Tendencies shows success rate with side-aware colors (offense green-high, defense green-low)
- [x] Film Game Tendencies shows offense as "Success", defense as "Opponent Success"
- [x] Film Game Tendencies shows `—` when null / not enough plays
- [x] Film Game Tendencies shows RUN / PASS / RPO success breakdown with counts: `38.5% (10/26)`
- [x] Overall Tendencies hero shows success rate with side-aware colors
- [x] Overall Tendencies hero shows defense as "Opponent Success"
- [x] Tooltip copy present on success rate stat
- [x] `npm run build` clean

**Handoff notes:**

### Definition
- Shared rule: `sideline/lib/loggedPlaySuccess.ts` (`isStandardSuccessfulPlay` / `isSuccessPlay`)
- Integer floors: 1st `floor(dist/2)`, 2nd `floor(dist*7/10)`, 3rd/4th `yards >= dist`
- Overrides: TD success; TURNOVER/INT/FUMBLE fail; SACK fail; FIRST_DOWN success (single count)

### Eligibility (success denom only)
- `isSuccessRateEligiblePlay` in `sideline/lib/successRateStats.ts`
- Excludes: punt, Special Teams formation rows, FIELD_GOAL / XP_* / TWO_PT_*, kneel/spike play names
- Does **not** change Calls / `play_count`

### Aggregation
- `computeSuccessRate` / `successRateByCoarsePlayType` in `successRateStats.ts`
- Min sample 5 → `rate: null`
- Wired into game payload, overview, predictability `overall_success_rate`

### Presentation
- `successRateTextClass(rate, side)` — offense ≥45 green; defense ≤35 green
- Labels via `coachCopy`: Success / Opponent Success + tooltip
