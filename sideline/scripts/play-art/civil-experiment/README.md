# Civil.GG URL Hit-Rate Experiment

Isolated diagnostic: does Civil.GG’s inferred CFB27 URL convention generalize across the **465 verified USC** play-art mappings?

**This session only measures hit rate.** It does not integrate Civil into ingest, matching, or the frontend.

## Convention under test

```
https://fatgvrcdozmbkxcwpwsc.supabase.co/storage/v1/object/public/college_plays_output/{play}-{type}-{set}-{version}.webp
```

Normalization (baseline only): `toLowerCase()` + remove spaces. Hyphens and other punctuation are left as-is.

### Mapping Sideline metadata → Civil fields

| Civil field | Source |
|-------------|--------|
| play | Manifest `play_name` (USC trusted entries) |
| formation type | Seed `formationType` (`lib/seed/playbooks/cfb27-usc.ts`) |
| formation set | Full formation name with type prefix stripped (`Gun Bunch Ace Offset` + `Gun` → `Bunch Ace Offset`) |
| version | `27` |

## Source of truth for the 465

1. `lib/generated/play-art-manifest.json` — USC entries (`TRUSTED_PLAYBOOKS`)
2. `lib/seed/playbooks/cfb27-usc.ts` — `formationType` lookup by formation name

## Run (from `sideline/`)

```bash
NODE_PATH=./node_modules npx tsx ./scripts/play-art/civil-experiment/test-hit-rate.ts
```

Options:

```bash
# Smoke test
... --limit 20

# Rebuild markdown from existing JSON (no network)
... --skip-fetch
```

- **HEAD only** (no WebP download)
- **100ms delay** between requests (default)
- **5s timeout** per request

## Outputs

| File | Role |
|------|------|
| `reports/hit-rate-results.json` | Full per-URL results + aggregate counts |
| `reports/failure-patterns.md` | Miss catalog by type / set / name traits |
| `reports/hit-rate-report.md` | Summary + recommendation |
| `reports/manual-verification.md` | 10-hit browser QA checklist |
| `reports/manual-verification-sample.json` | Same 10 URLs as JSON |

## Status-code note

Civil’s public Supabase bucket returns **HTTP 400** (not 404) for missing objects. The experiment counts **400 and 404 as miss**, **200 as hit**, anything else as **error**.

## Recommendation thresholds

| Hit rate | Recommendation |
|----------|----------------|
| >90% | Strategic asset — design integration |
| 60–90% | Useful complement — test Air Force + slug exceptions |
| <60% | Not worth pursuing |

## Results (USC, 2026-08-24)

| Metric | Value |
|--------|-------|
| Tested | 465 |
| Hits | 463 (**99.6%**) |
| Misses | 2 |
| Errors | 0 |
| Manual QA | 10/10 correct |
| Recommendation | **strategic asset** |

Misses: `H STICK` (Gun Spread Y-Flex Wk), `HB SPLIT 0` (Goal Line Normal) — alternate slugs also 400; likely Civil coverage gaps.

## Out of scope

- Changes to existing play-art scripts / matcher / ingest
- Downloading images
- Supabase writes / frontend
- Air Force (USC only this session)
- Special-case slug rules before measuring baseline failure rate
