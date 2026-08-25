# Owned play-art ingestion (operator workflow)

Offline pipeline for mapping purchased playbook DOCX play-art to Sideline-owned assets.
Formation **section boundaries** still come from DOCX gutter geometry + reference play counts.
Formation **labels** are assigned by OCR of each crop’s printed header (tesseract), with
positional labels as fallback. Play identity still comes from visual matching — not OCR.

## Prerequisites

- Node 20+
- **tesseract** on PATH (`brew install tesseract`), or set `TESSERACT_PATH`
- Optional: `PLAY_ART_SKIP_FORMATION_OCR=1` skips per-crop header validation only (section-header OCR remains required; positional pairing removed)

## Ingesting a new playbook

### Single-command (recommended)

```bash
npm run play-art:ingest -- --source="scripts/play-art/source/{Scheme}/{Team}.docx"
```

Examples:

```bash
npm run play-art:ingest -- --source="scripts/play-art/source/Multiple & Pro Style/California.docx"
npm run play-art:ingest -- --source="scripts/play-art/source/Run & Shoot/Run & Shoot.docx"
```

Everything else is auto-derived:

- Team/scheme slug from the DOCX filename (`California.docx` → `california`)
- Seed slug: `cfb27-{slug}` (override with `--game`)
- Reference path: `scripts/play-art/references/cfb27-offense-{slug}.json`
- Reference file itself (built from the seed module if missing)

Team playbooks and scheme playbooks (`Multiple.docx`, `Pro Style.docx`, `Run & Shoot.docx`, etc.) are both valid targets — same command shape.

### Manual (backward-compatible)

```bash
npm run play-art:reference -- --seed=cfb27-usc
npm run play-art:ingest -- \
  --reference=scripts/play-art/references/cfb27-offense-usc.json \
  --source="scripts/play-art/source/Air Raid/cfb27-offense-USC.docx"
```

### Flags

| Flag | Role |
|------|------|
| `--source=<docx>` | Primary input; derives seed + reference |
| `--seed=<slug>` | Explicit seed (reference build or derive override) |
| `--team=<slug>` | Team/scheme slug → `{game}-{team}` |
| `--game=cfb27` | Game version prefix (default `cfb27`) |
| `--reference=<path>` | Explicit reference JSON (skips auto-derive) |
| `--no-auto-reference` | Fail if derived reference is missing |
| `--overrides=<path>` | Formation-scoped REVIEW override JSON |
| `--approve-review` | Allow publish with REVIEWs remaining |

Filename → slug rules live in `scripts/play-art/lib/slug-utils.ts`. Basename exceptions (e.g. `Miami FL` → Miami) live in `scripts/play-art/source-aliases.json`.

## Pilot playbook

| Field | Value |
|-------|-------|
| Playbook | **USC** |
| Game version | `cfb27` |
| Side | `offense` |
| Seed module | `lib/seed/playbooks/cfb27-usc.ts` |
| Reference | `scripts/play-art/references/cfb27-offense-usc.json` |
| Source DOCX | `scripts/play-art/source/Air Raid/cfb27-offense-USC.docx` (gitignored; nested folders OK) |

## Commands (from `sideline/`)

### Build canonical reference from seed

```bash
npm run play-art:reference -- --seed=cfb27-usc
npm run play-art:reference -- --source="scripts/play-art/source/Multiple & Pro Style/California.docx"
```

### Inspect DOCX structure

```bash
npm run play-art:ingest -- \
  --source="scripts/play-art/source/Air Raid/cfb27-offense-USC.docx" \
  --structure-report
```

### Validate only (no publish)

```bash
npm run play-art:ingest -- \
  --source="scripts/play-art/source/Air Raid/cfb27-offense-USC.docx" \
  --validate-only
```

### Full ingest (stage → validate → publish)

```bash
npm run play-art:ingest -- \
  --source="scripts/play-art/source/Air Raid/cfb27-offense-USC.docx"
```

On validation failure: **published assets and manifest are not modified** (staging is cleared).

On success:

- Assets → `public/play-art/cfb27/assets/<sha256>.jpg` (content-addressed; shared across playbooks)
- Manifest → `lib/generated/play-art-manifest.json` (logical mappings with `asset_id` + `asset_path`)
- Report → `scripts/play-art/reports/{playbook}-validation.json`
- Legacy playbook-scoped trees under `public/play-art/cfb27/offense/<team>/` are removed after a successful publish

## Processing playbook #2+

Preferred: single-command ingest (see above). Manual path:

1. Seed: `lib/seed/playbooks/cfb27-{slug}.ts`
2. `npm run play-art:reference -- --seed=cfb27-{slug}`
3. Source DOCX at `scripts/play-art/source/...`
4. Full ingest with visual matching (default):

```bash
npm run play-art:ingest -- \
  --reference=scripts/play-art/references/cfb27-offense-air-force.json \
  --source="scripts/play-art/source/Option & Spread Option/Air Force.docx"
```

When REVIEW items remain, inspect `scripts/play-art/reports/{slug}-matching.json` and either:
- add formation-scoped overrides in `scripts/play-art/matching-overrides/{slug}.json`, or
- re-run with `--approve-review` after operator QA

No application code changes required.


## Visual play-art matching V3 (default)

Positional DOCX order is **not** used for canonical play identity. Within each known formation:

```
owned crops + cfb.fan references
→ normalize diagram region
→ register (bounded scale 0.96–1.04 + ±6px translation) to formation baseline
→ subtract baseline → play signatures
→ variance-weight residuals/edges
→ residual + edge + foreground + registered + color-ink + spatial signals
→ composite score matrix
→ Hungarian one-to-one assignment
→ independent PASS/REVIEW/FAIL confidence
→ V3 REVIEW only: geometry resolver (ink mask → components → spatial/L-R/direction + per-hue warm/cool/other)
→ geometry-pass or remain REVIEW (fail-closed)
```

| Module | Role |
|--------|------|
| `match-play-art.ts` | Matcher V3.2 orchestration + confidence (assignment ≠ PASS) |
| `image-similarity-v3.ts` | Scale registration, variance weight, color-ink, spatial |
| `image-geometry-v3.ts` | V3.2 geometry resolver + per-hue scoring (REVIEW only) |
| `image-similarity-v2.ts` | Shared normalize/baseline/edge primitives |
| `image-similarity.ts` | Legacy V1 RMSE helper (diagnostics) |
| `trusted-hash.ts` | Reuse verified USC owned-asset hashes |
| `reference-image.ts` | Temporary cfb.fan reference fetch/cache |
| `matching-report.ts` | Operator + JSON reports |
| `matching-overrides.ts` | Formation-scoped REVIEW/FAIL overrides |
| `map-positional.ts` | Legacy/debug positional mapping (`--positional`) |
| `debug-match.ts` | `play-art:debug-match` visual diagnostics |
| `debug-geometry.ts` | `play-art:debug-geometry` + per-hue artifacts |
| `debug-per-hue.ts` | Pre-work per-hue / hue-histogram diagnostic |
| `geometry-calibration-set.ts` | Verified + ambiguous geometry calibration samples |
| `calibrate-matcher-v2.ts` | Signal calibration against USC verified pairs |

### Preprocessing / registration

- Diagram region on 626×355 cards: `x=40, y=72, w=546, h=250`
- Resize to 96×96 grayscale + contrast normalize
- Register owned crop to formation baseline via scale `{0.96,0.98,1.0,1.02,1.04}` × ±6px translation (no mirror/rotate)

### Formation baseline + play signature

- Baseline = per-pixel median of all cfb.fan references in the formation
- Variance weight = per-pixel stddev across formation refs (floor 0.15)
- Signature = `|image − baseline|` with floor 12 (suppresses shell)
- Edges = Sobel on thresholded signature
- Color-ink = saturated non-gray mask (routes/arrows)
- Spatial = left/right residual mass balance (orientation-preserving)

### Composite weights (V3)

| Signal | Weight |
|--------|--------|
| residual (variance-weighted) | 0.32 |
| edges (variance-weighted) | 0.28 |
| foreground Dice | 0.14 |
| color-ink overlap | 0.12 |
| spatial L/R | 0.10 |
| registered full-frame | 0.04 |

### Confidence thresholds (unchanged from V2 — calibrated on USC)

| Status | Rule |
|--------|------|
| **FAIL** | registration failed, composite < 0.55, or (local-best but residual < 0.80 and edges < 0.65) |
| **PASS** | trusted-hash / override / normalized-exact, or visual-v3 with score ≥ 0.78, margin ≥ 0.035, local-best, reg quality ≥ 0.62, signal agreement ≥ 0.70, **or** geometry-v3.2 on a prior REVIEW with strong geometry separation (optional per-hue margin boost) |
| **REVIEW** | otherwise (including any negative margin) |

### Geometry resolver V3.1 (REVIEW only)

Runs only after V3 leaves a crop in REVIEW. Builds a play-ink mask (variance-weighted residual ∪ color ink), then compares:

- 4×3 spatial grid
- L/R / far-side / backfield / LOS / downfield occupancy
- gradient orientation histogram + path energy
- connected-component centroids / topology
- endpoint signature (diagnostic-weighted)

| Gate | Value |
|------|-------|
| confirm path (agrees with V3 local-best) | score ≥ 0.88, margin ≥ 0.012 |
| switch path (geometry reassigns) | score ≥ 0.82, margin ≥ 0.055 |
| orientation agreement | ≥ 0.72 |
| spatial agreement | ≥ 0.70 |
| V3↔geometry conflict | remain REVIEW |
| negative V3 margin | never auto-PASS |

```bash
npm run play-art:debug-geometry -- --playbook usc --formation "Gun Trips" --crop source-138:left
npm run play-art:debug-geometry -- --sample-set
```

**Assignment never implies PASS.** Negative margin never auto-PASSes for visual or geometry methods.

Publish is fail-closed on **FAIL**. **REVIEW** blocks until overrides or `--approve-review`.

### Trusted-hash

USC published mappings are trusted. Identical SHA-256 crop bytes for the same game version + side + formation + canonical play resolve as `trusted-hash` without approximate scoring. Air Force provisional / `--approve-review` mappings are **not** trusted.

### Diagnostics

```bash
npm run play-art:debug-match -- --playbook air-force --formation "Gun Split" --crop source-129:middle
npm run play-art:debug-match -- --sample-set
npm run play-art:debug-match -- --probe-only
```

Artifacts → `scripts/play-art/reports/matcher-v3-debug/` (never under `public/`).

### Regression benchmark (USC pure visual)

```bash
npm run ingest:play-art -- \
  --reference scripts/play-art/references/cfb27-offense-usc.json \
  --source scripts/play-art/source/Air\ Raid/cfb27-offense-USC.docx \
  --regression
```

`--regression` skips trusted-hash so the run measures pure visual recovery vs the published manifest.

## Visual play-art matching V2 (superseded)

V2 used translation-only registration and grayscale residual/edge signals without variance weighting or color-ink. Kept in `image-similarity-v2.ts` for diagnostics/comparison.
## Classification assumptions (USC pilot source model)

Document-order walk of embedded images in `word/document.xml` (no OCR):

- Every embedded image is a **2048×355** strip.
- **Play strips**: exactly two wide black gutters (≥70px) → crop into three cards at `x=0 / 711 / 1422`, `w=626`.
- **Formation headers**: all other strips (checkpoint boundaries only; names never read from pixels).
- **Consumption**: gather all play strips until the next header; reference play counts decide how many left→middle→right crops to keep.
- **Extras**: when a formation yields more card regions than reference plays, drop near-duplicate play-title bands first (game flip slots), then trailing unused regions. Never publish extras.

Names come **only** from the reference JSON. Mismatched strip counts or leftover strips fail closed (no positional recovery).

**Note:** USC’s committed reference is DOCX-ordered (`26` formations / `465` plays). A raw seed rebuild (`27` / `468`, alphabetical) will not match the DOCX — do not overwrite without re-aligning.

### Debug one formation’s mapping

```bash
NODE_PATH=./node_modules npx tsx ./scripts/play-art/debug-formation-map.ts \
  --reference scripts/play-art/references/cfb27-offense-usc.json \
  --source scripts/play-art/source/cfb27-offense-USC.docx \
  --formation "Wildcat U Off Trips" \
  --write-crops
```

## Module layout

| File | Role |
|------|------|
| `ingest-playbook.ts` | CLI orchestrator |
| `build-reference.ts` | Reference JSON from seed |
| `reference.ts` | Load / validate reference |
| `extract-docx.ts` | DOCX extraction + classification |
| `match-play-art.ts` | Matcher V3.1 (default) |
| `image-similarity-v3.ts` | Scale registration, variance, color-ink, spatial |
| `image-geometry-v3.ts` | Geometry resolver for REVIEW cases |
| `image-similarity-v2.ts` | Shared normalize/baseline/edge primitives |
| `image-similarity.ts` | Legacy V1 RMSE helper |
| `trusted-hash.ts` | Verified owned-asset hash reuse |
| `map-positional.ts` | Positional mapping (legacy / `--positional`) |
| `reference-image.ts` | cfb.fan reference fetch/cache for matching |
| `matching-report.ts` | Operator matching reports |
| `matching-overrides.ts` | REVIEW override validation |
| `debug-match.ts` | Visual diagnostics (`play-art:debug-match`) |
| `debug-geometry.ts` | Geometry diagnostics (`play-art:debug-geometry`) |
| `geometry-calibration-set.ts` | Verified geometry calibration samples |
| `matcher-v3-sample-set.ts` | Diagnostic sample definitions |
| `matcher-v3-quality-report.ts` | Formation + hard-case reports |
| `calibrate-matcher-v2.ts` | Calibration harness |
| `content-hash.ts` | SHA-256 asset IDs + shared paths |
| `source-discovery.ts` | Recursive DOCX discovery + name resolution |
| `discover-sources.ts` | `play-art:discover` CLI |
| `source-aliases.json` | Explicit basename → team exceptions |
| `validate.ts` | Validation gates + console report |
| `staging.ts` | Stage assets/manifest before publish |
| `output.ts` | Manifest merge helpers |

## App resolution

`resolvePlayArtUrl()` in `lib/playArtUrl.ts`: owned manifest → cfb.fan → null.


## Source discovery

Recursively scan licensed DOCX sources and resolve names against CFB27 seeds (read-only — does not ingest or rename files):

```bash
npm run play-art:discover
```

Statuses: `MATCH` · `ALIAS` · `UNRESOLVED` · `AMBIGUOUS`

Aliases live in `scripts/play-art/source-aliases.json` (exceptions only). Prefer exact normalized matches; do not fuzzy-guess ambiguous names.

## Content-addressed assets

Final play-card bytes are hashed with **SHA-256** (Node `crypto`) at ingest time only.

Physical storage:

`public/play-art/{gameVersion}/assets/{sha256}.jpg`

Manifest entries remain one logical row per playbook + formation + play, each pointing at `asset_id` / `asset_path`. Identical bytes across playbooks share one physical file. Application lookup is unchanged (game version + side + playbook + formation + play → `asset_path`).
