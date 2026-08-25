# SVG Auto-Trace Prototype (VTracer)

Isolated experiment: can VTracer turn **verified USC Vault** play-art crops into SVGs good enough to replace owned rasters?

**Answer (2026-08-24): No — do not proceed** with whole-card auto-trace. See [`assessment.md`](./assessment.md).

## Quick start

From `sideline/`:

```bash
# Install once (already a devDependency)
npm install

# Optional: calibrate first 3 plays × config matrix
npm run play-art:svg-prototype -- --calibrate

# Trace the 20-play sample + write HTML
npm run play-art:svg-prototype
```

Open:

`scripts/play-art/svg-prototype/output/comparison.html`

Operator-only. Not under `public/`. Not uploaded to Supabase.

## What this uses

| Item | Source |
|------|--------|
| Identities | `lib/generated/play-art-manifest.json` entries with `playbook: "USC"` (trusted-hash playbook) |
| Bytes | `public/play-art/cfb27/assets/{sha256}.jpg` |
| Diagram crop | `40,72,546×250` on 626×355 cards (same as matcher V2/V3) |
| Tracer | `@visioncortex/vtracer@1.0.0-alpha.3` (WASM Node binding — no Rust/CLI required) |

Does **not** modify matcher, ingest, trusted-hash store, or frontend.

## Layout

| File | Role |
|------|------|
| `sample-set.ts` | 20 verified USC plays (5 pass / 5 run / 4 option / 3 motion / 3 blocking) |
| `preprocess.ts` | Crop → optional ink → palette → Lanczos upscale |
| `render-comparison.ts` | HTML comparison builder |
| `trace-sample.ts` | CLI: calibrate or full run |
| `assessment.json` | Per-play grades merged into HTML on re-run |
| `assessment.md` | Aggregate recommendation |
| `output/` | Gitignored diagnostics (SVGs, inputs, comparison.html, previews) |

## Final tracing parameters

Preprocess: `mode=full`, `colors=12`, `scale=2` (Lanczos3). Ink/white-BG mode discarded (Vault cards are dark-field).

VTracer:

```
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

## Sample substitutions

- No USC play named `TRAP` → `COUNTER Y LEAD` for pull/lead blocking detail  
- “Curl Flats” → `CURL COMBO`

## Constraints honored

- Prototype-only directory  
- Vault verified crops only (no cfb.fan tracing)  
- No production path / Storage / watermark / frontend changes  
- `npm run build` must remain green (script is offline tooling)
