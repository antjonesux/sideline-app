# SVG Auto-Trace Prototype — Fidelity Assessment

**Date:** 2026-08-24  
**Tool:** `@visioncortex/vtracer@1.0.0-alpha.3`  
**Sample:** 20 trusted USC Vault crops (manifest `playbook=USC`)  
**Comparison page:** `output/comparison.html`  
**Preview grids:** `output/previews/*.png`

## Aggregate

| Grade | Count | % |
|-------|------:|--:|
| Clean | 0 | 0% |
| Minor cleanup | 6 | 30% |
| Major cleanup | 14 | 70% |
| Unusable | 0 | 0% |

**Recommendation: Do not proceed** with VTracer (or auto-trace alone) as a drop-in replacement for owned PNG play art.

## Why not proceed

1. **No clean traces.** At app display sizes (~400px) and 2× zoom, SVGs are never visually interchangeable with the Vault rasters.
2. **Controller glyphs fail systematically.** CFB play cards encode positions with button icons (□ △ ✕ ○ / R1). Auto-trace turns these into illegible blobs — unacceptable for coach-facing art.
3. **SVG is larger, not smaller.** Mean SVG ≈ 42.6 KB vs mean original JPG ≈ 23.7 KB (~1.8×). Line-art size win does not materialize when the field shell + anti-alias fringes are traced.
4. **Cleanup ROI fails the brief gate.** Major plays need icon/label rebuilds, not “5–30s polish.” At >1 minute/play (often 3–10+ minutes for glyph restoration), converting USC’s ~465 verified mappings is not justified vs keeping rasters.

## Effort estimate

| Band | Plays (sample) | Est. operator time / play | Notes |
|------|----------------:|--------------------------:|-------|
| Minor | 6 | 30–90 s | Straighten a few paths; accept soft yard numbers or strip field |
| Major | 14 | 3–10+ min | Rebuild icons from sprites or re-author labels; fix colors |
| Clean | 0 | — | — |

**USC full book (~465):** even optimistic 50% minor @ 1 min + 50% major @ 5 min ≈ **~23 hours** of operator time, plus tooling — without reaching glyph-perfect quality unless icons are replaced programmatically.

## Failure modes (ranked)

1. **Small icon glyphs / PASS·RUN badges** — destroyed or illegible  
2. **Yard numbers + thin field hash marks** — traced as noisy paths or lost  
3. **Color drift** — saturated reds/pinks desaturate or reassign (esp. dense passes / motion)  
4. **Arrowhead softening** — points round off under simplify  
5. **Route wobble** — anti-alias halos become path jitter on thin strokes  
6. **Blocking rectangles merge** — screen / jailbreak schemes blob together  

## Play types

| Best | Worst |
|------|-------|
| Sparse runs / simple pulls (Outside Zone, Inside Zone, Strong Toss, Counter Y Lead, HB Power, HB Counter) | Dense passes with labeled receivers (Curl Combo, Smash Corners, Mesh, Slants) |
| | Motion + multi-color overlays (Orbit Alert Counter, Fake Jet HB Wheel) |
| | Heavy screen blocking (HB Slip Screen, Jailbreak Screen) |

## Preprocessing findings

| Technique | Result |
|-----------|--------|
| Diagram crop `40,72,546×250` | Necessary — removes chrome; keep |
| 12-color palette quantization | Helps clustering slightly; does not fix glyphs |
| 2× Lanczos upscale | Better than 1× (D calib); 3× added paths without glyph rescue |
| “Ink” mode (near-white → alpha) | **Wrong for Vault cards** (dark field, not white BG) — discarded |
| Binary / BW clustering | Collapses multi-color routes — unusable |

## VTracer config used (final)

```
clustering: color-cluster
hierarchical: stacked
mode: spline
filterSpeckle: 8
colorPrecision: 6
layerDifference: 16
cornerThreshold: 60
lengthThreshold: 4
spliceThreshold: 45
simplify: 2
pathPrecision: 2
maxColors: 12
optimize: 2
```

Calibration winner vs A/B/C/D: **E** (higher speckle + simplify) — fewer spurious paths; still not production-clean.

## Alternatives

- **Potrace / binary AutoTrace:** not batch-tested after VTracer results. Color football diagrams need per-layer color separation; binary would drop route hues — expected worse for this art.
- **Illustrator Image Trace:** not run (manual ceiling). Given glyph/text failure is structural to raster resolution (~546×250 diagram), Illustrator would still struggle without icon replacement.
- **Hybrid (recommended if SVG is revisited):** clean SVG **field shell** + **sprite icons** for known controller glyphs + auto-trace **only saturated route ink**. That is a different product than “VTracer the PNG.”

## Handoff

- Stick with **owned raster PNGs** + SIDELINE.PRO watermark for Vault art.
- Keep cfb.fan hotlink fallback for unmatched plays.
- Do **not** build SVG ingest/storage/frontend pipeline on this evidence.
- If SVG ownership is revisited: design **hybrid Path (template shell + sprites + route ink)**, not whole-card auto-trace.
