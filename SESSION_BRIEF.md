# Session Brief — Reference Download Resilience + Slug Fixes

**Objective:**  
Fix the cascade FAIL behavior where a single reference-image download failure marks an entire formation as FAIL, correct the Y-Flex slug double-hyphen bug, and investigate the `01-trap.jpg` 403 pattern to determine whether it's a slug issue or genuinely missing cfb.fan art.

**Why this matters:**  
California's 44 FAIL cases weren't matcher failures — they were network-error cascades. One 403 on a reference download aborts scoring for the entire formation, marking every crop as FAIL. This affects every future playbook: any transient network error, missing cfb.fan asset, or slug bug turns into cascading FAILs. Batching is unsafe until this is fixed. The Y-Flex slug bug likely accounts for one of the three cascades directly. The two other cascades both hit `01-trap.jpg`, which suggests either a systematic slug issue with numbered plays or a specific cfb.fan asset gap worth understanding.

**In scope:**  
- Reference download logic: degrade per-candidate on failure, not per-formation
- Scoring: run against whatever candidates succeeded, not blocked by missing candidates
- Y-Flex slug construction: verify against cfb.fan's convention, patch if needed
- Diagnostic on 01-trap pattern: is this systematic (numbered plays) or specific asset gaps?
- California re-run to verify FAIL count drops
- Air Force and USC re-run to confirm no regression

**Out of scope:**  
- Matcher scoring changes
- Review tool changes
- Extraction pipeline changes (formation OCR from prior session stays as-is)
- New playbook ingestion beyond validation runs
- Batch script (still deferred until this fix ships)
- Ampersand slug normalization (separate session)
- Retry logic for network errors (fail-once-then-continue is fine; retry is over-engineering for this fix)

**Existing patterns to reuse:**  
- Existing cfb.fan URL construction with known slug exceptions (`cal-off`, `usf-off`, `southern-miss-off`, and the `3--4` double-hyphen for numeric ranges)
- Existing matcher scoring against candidate pool
- Existing per-crop REVIEW status handling

**Constraints:**  
- `npm run build` must pass
- California FAIL count must drop from 44 to near-zero (small residual acceptable if some crops legitimately have no available candidates)
- Air Force and USC results must not regress (PASS counts stay same or improve)
- No silent fallback if all candidates fail for a formation — error out clearly for that formation
- Fail once per URL and move on — no aggressive retry logic

**Relevant decisions:**  
- 2026-08-25 OCR-based section matching (previous session, unchanged)
- Fail-closed on unrecoverable errors, degrade gracefully on partial failures
- cfb.fan URL slug conventions per known exceptions dictionary

**Done means:**  
- [x] Reference download failures degrade individual candidates, not entire formations
- [x] Crops score against whatever candidates successfully downloaded
- [x] Crop with zero available candidates becomes REVIEW (with note), not FAIL
- [x] Y-Flex slug convention verified against cfb.fan browser test
- [x] Y-Flex slug fixed if wrong — **N/A: `y--flex` is correct on cfb.fan**
- [x] 01-trap pattern investigated (systematic vs specific)
- [x] California re-run: FAIL count reported (target: 0-3, was 44) — **0 FAIL**
- [x] Air Force re-run: PASS/REVIEW unchanged — **468/0/0**
- [x] USC re-run: PASS/REVIEW unchanged — **465/0/0**
- [x] `CHANGELOG.md` entry added
- [x] `npm run build` passes

**Handoff notes:**  
- California: **433 PASS / 34 REVIEW / 0 FAIL** (was 390 / 33 / 44); auto **92.7%**; downloads **467 succeeded / 0 failed**. Cascade formations (Tight Y Off Flex, Deuce Close, Trey Y-Flex Str) now score; Trey has 16 PASS + 1 REVIEW.
- **01-trap root cause:** Hypothesis A (URL convention) — seed/`normalizePlayName` collapsed `0 1 TRAP` → `01 TRAP` → `01-trap.jpg`, but cfb.fan serves `0-1-trap.jpg`. Not a missing asset. Fix: `normalizePlayNameBase` in reference build + URL path.
- **Y-Flex:** `gun-trey-y--flex-str/` returns 200; single-hyphen 404. Keep global hyphen→`--` slug rule.
- Numbered plays: only spaced single-digit hole pairs (`0 1`, `5 6`) need spaces preserved; intact tokens like `45 QUICK BASE` / `22 Z IN` stay unsplit. Some seeds already write `56 TRAP` (cfb.fan `56-trap.jpg`) — preserving seed spacing is required.
- Pipeline safer for batch on download-resilience axis; CA still has 34 REVIEW for operator/override path before publish.
