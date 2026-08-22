# Owned play-art ingestion (operator workflow)

Offline pipeline for mapping purchased playbook DOCX play-art to Sideline-owned assets.
No OCR. Formation and play names come **only** from the canonical reference JSON.

## Pilot playbook

| Field | Value |
|-------|-------|
| Playbook | **USC** |
| Game version | `cfb27` |
| Side | `offense` |
| Seed module | `lib/seed/playbooks/cfb27-usc.ts` |
| Reference | `scripts/play-art/references/cfb27-offense-usc.json` |
| Source DOCX | `scripts/play-art/source/cfb27-offense-USC.docx` (gitignored) |

## Commands (from `sideline/`)

### Build canonical reference from seed

```bash
npm run play-art:reference -- --seed cfb27-usc
```

### Inspect DOCX structure

```bash
npm run ingest:play-art -- \
  --reference scripts/play-art/references/cfb27-offense-usc.json \
  --source scripts/play-art/source/cfb27-offense-USC.docx \
  --structure-report
```

### Validate only (no publish)

```bash
npm run ingest:play-art -- \
  --reference scripts/play-art/references/cfb27-offense-usc.json \
  --source scripts/play-art/source/cfb27-offense-USC.docx \
  --validate-only
```

### Full ingest (stage → validate → publish)

```bash
npm run ingest:play-art -- \
  --reference scripts/play-art/references/cfb27-offense-usc.json \
  --source scripts/play-art/source/cfb27-offense-USC.docx
```

On validation failure: **published assets and manifest are not modified** (staging is cleared).

On success:

- Assets → `public/play-art/cfb27/offense/usc/...`
- Manifest → `lib/generated/play-art-manifest.json`
- Report → `scripts/play-art/reports/usc-validation.json`

## Processing playbook #2

1. Seed: `lib/seed/playbooks/cfb27-{slug}.ts`
2. `npm run play-art:reference -- --seed cfb27-{slug}`
3. Source DOCX at `scripts/play-art/source/...`
4. Same `ingest:play-art` command with matching `--reference` and `--source`

No application code changes required.

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
| `map-positional.ts` | Positional mapping |
| `validate.ts` | Validation gates + console report |
| `staging.ts` | Stage assets/manifest before publish |
| `output.ts` | Manifest merge helpers |

## App resolution

`resolvePlayArtUrl()` in `lib/playArtUrl.ts`: owned manifest → cfb.fan → null.
