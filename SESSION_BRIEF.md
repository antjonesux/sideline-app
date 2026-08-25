# Session Brief — Ampersand Slug Normalization

**Objective:**  
Normalize ampersand characters in DOCX filenames to a safe slug form (`&` → `-and-`) with internal mapping to cfb.fan's actual URL convention, so playbooks like `Run & Shoot.docx` and `Veer & Shoot.docx` ingest cleanly with escape-safe, readable identifiers.

**Why this matters:**  
The current slug builder produces literal `&` characters in slugs (`run-&-shoot`), which is fragile — shell escaping issues, URL encoding surprises, and unreadable filenames on some systems. The seed file `cfb27-run-&-shoot.ts` is also awkward. Fixing this before batching is trivial; fixing it after 20 playbooks have been ingested is a rename cascade. Prior verification confirmed cfb.fan uses `run-shoot-off/` (drops ampersand), so slug normalization needs to convert `&` to `-and-` internally while mapping to the correct cfb.fan URL at scrape time.

**In scope:**  
- `sideline/scripts/play-art/lib/slug-utils.ts` — normalize `&` to `-and-` in slug derivation
- Slug exceptions dictionary — add mapping for `-and-` slugs → cfb.fan's actual URL slug
- Test on `Run & Shoot.docx` end-to-end (ingest → matcher → verify)
- Regression check on Air Force, USC, California (no ampersands, should be unchanged)

**Out of scope:**  
- Matcher changes
- Review tool changes  
- Extraction pipeline changes
- New batch script
- Ingesting playbooks beyond validation

**Existing patterns to reuse:**  
- Existing cfb.fan slug exceptions dictionary (`cal-off`, `usf-off`, `southern-miss-off`)
- Existing slug construction from prior auto-derive session

**Constraints:**  
- `npm run build` must pass
- No breaking changes to Air Force / USC / California (slugs shouldn't change)
- Verify cfb.fan URL convention before implementing (don't guess)
- If existing `cfb27-run-&-shoot.ts` seed exists, migrate it to `cfb27-run-and-shoot.ts`

**Relevant decisions:**  
- Slug rules: `&` → `-and-`, matching common web slugification (also aligns with `Y-Flex` staying as `y-flex` — no invented double-hyphens for non-numeric ranges)
- cfb.fan URL construction handles exceptions via a mapping dictionary, not by hoping slug derivation matches

**Done means:**  
- [x] cfb.fan verification: URL for Run & Shoot / Veer & Shoot confirmed
- [x] Slug derivation: `Run & Shoot` → `run-and-shoot`
- [x] Seed slug: `cfb27-run-and-shoot`
- [x] cfb.fan URL mapping produces correct scrape URL
- [x] `Run & Shoot.docx` ingests successfully (or documented cfb.fan gap if the reference doesn't exist)
- [x] Air Force / USC / California unchanged
- [x] If old `cfb27-run-&-shoot.ts` seed exists, renamed to `cfb27-run-and-shoot.ts`
- [x] `CHANGELOG.md` entry added
- [x] `npm run build` passes

**Handoff notes:**  
- cfb.fan: `run-shoot-off` / `veer-shoot-off` = 200; `-and-` variants = 404. Mapping stays in seed `source.url` (already correct).
- Bare `&` stripped for A&M-style names (`Texas A&M` → `texas-am`) to match existing `cfb27-texas-am.ts`.
- Other source ampersands: folder names `Option & Spread Option`, `Multiple & Pro Style`; DOCX `Texas A&M.docx` (not ingested this session).
- Run & Shoot: 246 PASS / 42 REVIEW / 0 FAIL (288). Veer & Shoot: 221 / 31 / 0 (252). AF 468/0/0, USC 465/0/0 unchanged.
