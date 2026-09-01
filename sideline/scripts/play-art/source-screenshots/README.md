# First-class screenshot sources for play-art

Game-captured play-selection screenshots are a first-class play-art source
(alongside DOCX and OBS video).

## Layout (directory namespace is authoritative)

```
source-screenshots/
└── {game}/                 # e.g. cfb27
    ├── offense/
    │   └── {playbook-slug}/
    │       ├── screenshot-001.png
    │       └── IMG_1234.png
    └── defense/
        └── {playbook-slug}/
```

Example: `source-screenshots/cfb27/offense/texas/` → CFB27 / Offense / Texas.

Do **not** rename individual screenshots. Folder path alone sets game, side, and playbook.

## Screenshot expectations

- Prefer **PNG** (JPG/JPEG accepted)
- Same layout as OBS: `obs-1920x1080-top-band-v1` (1920×1080, three play cards)
- One formation screen per file (up to 3 cards)
- Duplicates across screens are fine — identities dedupe by catalog

## Commands

From `sideline/`:

```bash
npm run play-art:screenshot -- --source=scripts/play-art/source-screenshots/cfb27/offense/texas
npm run play-art:screenshot-batch
npm run play-art:screenshot-batch -- --force
```

## Identity contract

directory namespace + formation OCR + play OCR + exact catalog resolution

No positional identity, no play-art:review, no external visual publish gate.

## Staging output

```
screenshot-staging/{game}/{side}/{slug}/
  screens/
  source-cards/
  art-crops/
  report.json
  coverage.json
  recapture-queue.json
  RECAPTURE_CHECKLIST.md   # when incomplete
```

Staging is gitignored. Operator PNGs in this tree may be gitignored; keep folder layout in repo.

## Related

- OBS video: `source-video/` + `play-art:video`
- Video gap fills: `manual-supplements/` + `play-art:supplement`
- DOCX: unchanged visual-matcher path
