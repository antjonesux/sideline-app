# Manual Screenshot Supplements

Diagnostic-only path for filling OBS video extraction gaps.

## Structure (required)

```
scripts/play-art/manual-supplements/
└── {game}/
    └── {side}/          # offense | defense
        └── {playbook-slug}/
            ├── screenshot-001.png
            └── ...
```

Example:

```
manual-supplements/cfb27/offense/go-go/screenshot-001.png
```

The folder path is the **sole namespace authority**. Do not drop screenshots into a shared root folder.

## Screenshot expectations

- Prefer **PNG** (JPG/JPEG also accepted)
- Same layout as OBS video: `obs-1920x1080-top-band-v1` (1920×1080, three play cards)
- One formation screen per file (up to 3 cards)

## Commands

```bash
# After video diagnostics (or alone against existing video-staging report)
npm run play-art:supplement -- --source=scripts/play-art/manual-supplements/cfb27/offense/go-go

# Video run auto-discovers the matching supplement folder
npm run play-art:video -- --source=scripts/play-art/source-video/offense/cfb27-offense-go-go.mp4
```

## Behavior

- Validates namespace fail-closed
- Crops / OCR / catalog-validates with the same logic as video cards
- Dedupes against video + other supplements by formation + play name
- Never overwrites or weakens existing validated video results
- Regenerates combined coverage + `recapture-queue.json` (still-missing only)
- Writes `supplement-report.json` and `combined-coverage.json`
- **Does not publish** / no manifest / overrides / omits / trusted-hash changes

Operator PNGs in this tree may be gitignored; keep the folder layout in repo.
