# Owned Play Art Pilot — USC Ingest Report

**Generated:** 2026-08-22  
**Playbook:** USC (CFB27 offense)  
**Pipeline status:** Extraction fixed; validation **PASS**; assets **published**  
**Build:** `npm run build` passes  

---

## Summary

USC owned play art is live. The DOCX stores wide **2048×355** strips (formation headers or up to three play cards). Extraction classifies strips by gutter geometry, crops cards, and maps them positionally against a DOCX-ordered reference. Add Play resolves USC via the owned manifest; other playbooks keep the cfb.fan fallback.

---

## Source reality (measured)

| Metric | Value |
|--------|-------|
| Embedded images | **182** |
| Formation-header strips | **26** |
| Play strips | **156** |
| Generated play cards | **465** |
| Strip dimensions | **2048 × 355** (all images) |
| Published JPEG cards | **626 × 355** |

### Classification (no OCR)

Exactly **2** wide black gutters (≥70px, luminance ≤25) → **play-strip**; otherwise → **formation-header**.

### Crop geometry (shared)

| Card | x | y | width | height |
|------|---|---|-------|--------|
| Left | 0 | 0 | 626 | 355 |
| Middle | 711 | 0 | 626 | 355 |
| Right | 1422 | 0 | 626 | 355 |

Trailing unused slots on a formation’s final strip are not published (reference count drives consumption).

---

## Reference vs seed

| | Seed rebuild | Published pilot reference |
|--|--------------|---------------------------|
| Formations | 27 | **26** |
| Plays | 468 | **465** |

**Why:** The DOCX order is UI/button order, not alphabetical seed order. **Hail Mary** is absent from the source DOCX entirely. The committed reference at `references/cfb27-offense-usc.json` matches DOCX order and counts. Do **not** overwrite it with a raw `play-art:reference` seed rebuild without re-aligning play order to the DOCX.

---

## Validation & publish

- Structure report / validate-only / full ingest: **PASS**
- Deliberate extra reference play: exits **non-zero**, publishes nothing, manifest untouched
- Published assets: **465** under `public/play-art/cfb27/offense/usc/`
- Manifest entries: **465** USC records in `lib/generated/play-art-manifest.json`

---

## Commands (from `sideline/`)

```bash
npm run ingest:play-art -- \
  --reference scripts/play-art/references/cfb27-offense-usc.json \
  --source scripts/play-art/source/cfb27-offense-USC.docx \
  --structure-report

npm run ingest:play-art -- \
  --reference scripts/play-art/references/cfb27-offense-usc.json \
  --source scripts/play-art/source/cfb27-offense-USC.docx \
  --validate-only

npm run ingest:play-art -- \
  --reference scripts/play-art/references/cfb27-offense-usc.json \
  --source scripts/play-art/source/cfb27-offense-USC.docx
```

---

## App behavior

- USC Add Play browse → owned art from manifest
- Non-USC / missing mapping → cfb.fan → null
- No Add Play UI redesign in this pilot

---

## Reuse for playbook #2

Same strip profile (**2048×355**, three-card gutters) should reuse the shared crop/classify rules. Still required per playbook:

1. Place licensed DOCX under `scripts/play-art/source/`
2. Build a **DOCX-ordered** reference (seed order alone is not enough)
3. Confirm header/play-strip counts vs reference formation counts
4. Run structure → validate-only → full ingest

```bash
npm run ingest:play-art -- \
  --reference scripts/play-art/references/cfb27-offense-{slug}.json \
  --source scripts/play-art/source/cfb27-offense-{TEAM}.docx
```

Do not ingest playbook #2 until visual QA on USC is signed off.

---

## Known caveats

1. Hail Mary not in DOCX → not in owned set (cfb.fan fallback if catalog still lists it).
2. Some UI strip counts differ from seed; pipeline uses reference counts and drops unused trailing cards.
3. **Wildcat U Off Trips:** UI shows **6** cards including a mirrored second **DIY REVERSE**; catalog/reference has **5** unique plays. Extraction drops the duplicate title-band card, then maps: BLAST WK → DIY REVERSE → QB WRAP → POWER → POWER EXTRA. Visual QA verified 2026-08-22.
4. Licensed DOCX remains gitignored under `scripts/play-art/source/`.
