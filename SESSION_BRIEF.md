# Session Brief — Pass 7: Tendencies Play Type Sync Bugs

**Objective:**  
Fix play type breakdown in tendencies so offensive plays show the correct count and defensive play types display correctly — both in game-specific tendencies (Film Room) and overall tendencies.

**Done means:**
- [x] Offensive play type breakdown shows correct count matching game stats calls
- [x] Defensive play type breakdown displays RUN / PASS / RPO distribution
- [x] Both fixes work in game-specific tendencies (Film Room Tendencies tab)
- [x] Both fixes work in overall tendencies page
- [x] Plays logged before the defensive play type feature still display correctly
- [x] No regressions to game stats counts, yards, or other tendencies metrics
- [x] `npm run build` clean

**Handoff notes:**

### Root cause — offensive count mismatch
- **Primary:** `buildTendenciesGamePayload` only counted catalog-`matched` plays in `play_type_distribution`, while GAME STATS `play_count` counted all logged calls. Unmatched plays (name-ladder only) were dropped from the chart.
- **Amplifier:** Game tendencies offense path called `fetchCfbPlayTypeMap` with no options → defaulted to CFB26 catalog while most sessions are CFB27, so almost nothing matched.

### Defensive play types
- No new endpoints — extended `attachPlayTypes` + existing game/predictability/overview routes.
- Defense prefers stored `logged_plays.play_type` (RUN/PASS/RPO via `normalizeOpponentPlayType`); older null rows fall through to catalog/name → usually **Other**.
- Offense null `play_type` is fine — still resolved via catalog + name ladder; stored type is last-resort fallback only.
