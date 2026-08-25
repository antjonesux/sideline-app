# Session Brief — Review Tool Playbook Auto-Discovery

**Objective:**  
Replace the review tool's hardcoded playbook list with dynamic discovery based on which playbooks have actually been ingested, so any new playbook works automatically without touching the tool.

**Why this matters:**  
The review tool errors on `--playbook=california` even though California is fully ingested and has a valid matcher report. It only recognizes `air-force` and `usc` from a hardcoded list. Every new playbook (playbook #4, #5, and the ~20 in the batch queue) will hit the same wall. Twenty manual patches to the same file is a smell — the review tool should reflect what's ingested, not require sync updates.

**In scope:**  
- `sideline/scripts/play-art/review-tool/server.ts` — replace hardcoded playbook list with discovery
- Better error message when playbook not found (list available playbooks)
- Optional `--list` flag to show available playbooks
- Optional: same treatment for any similar hardcoded lists elsewhere in the review tool

**Out of scope:**  
- Ingestion pipeline changes
- Matcher changes  
- Review tool UI changes
- State file format changes
- Any changes outside the review-tool directory

**Existing patterns to reuse:**  
- Matcher report file naming convention (`cfb27-offense-{playbook}-matching.json` or similar — verify actual pattern)
- Existing filesystem access patterns in the review tool

**Constraints:**  
- `npm run build` must pass
- Air Force and USC must continue to work (backward compat)
- California must work after the fix (validation)
- No breaking changes to the review tool's CLI or state files

**Relevant decisions:**  
- Playbook identity is established at ingestion time by the auto-derive slug session — the review tool should discover, not define

**Done means:**  
- [x] Hardcoded playbook list replaced with filesystem discovery
- [x] Unknown playbook error lists actually available playbooks
- [x] `--playbook=california` works
- [x] `--playbook=air-force` still works  
- [x] `--playbook=usc` still works
- [x] `--playbook=nonexistent` produces clear error listing valid options
- [x] `npm run build` passes

**Handoff notes:**  
- **Discovery source:** matcher reports under `scripts/play-art/reports/` matching `cfb27-offense-{slug}-matching.json` (offense-first pipeline; intentionally not cfb26/defense to keep CLI slugs unique). Chosen because reports only exist after ingest+match.
- **Path resolution:** reference = `references/{reportSlug}.json`; DOCX via existing `discoverAndResolveSources()` matching seed `cfb27-{slug}`. Removed dependency on `PLAYBOOK_PATHS` from `matcher-v3-sample-set` (that file stays for matcher V3 diagnostics only).
- **Other hardcoded lists in review-tool:** none for allow-lists — `state.ts` / overrides / diagnostic paths already take a dynamic slug. Only `parsePlaybookArg` + CLI help were hardcoded.
- **`--list`:** implemented with `playCount` from matching report.
- California: **34 REVIEW**; Air Force / USC: **0 REVIEW** (queue clear).
- Reviewer note addressed: discovery narrowed to cfb27 offense (not bare-slug across game/side).
