# OBS video → play-art source preparation (diagnostic)

Converts an OBS recording of the CFB play-selection screen into cropped play
cards + OCR identity signals for **catalog comparison**.

This does **not** publish assets or replace DOCX ingest. Positional/screen order
is **not** play identity.

## Filename contract (authoritative)

```
{game-version}-{side}-{playbook-slug}.mp4
```

Examples:

- `cfb27-offense-go-go.mp4`
- `cfb27-defense-3-3-5-tite.mp4`

Fail-closed if game, side, or playbook cannot be resolved exactly against
`lib/seed/playbooks/`. Directory side (`source-video/offense|defense/`) must
agree with the filename when present.

## Commands

From `sideline/`:

```bash
npm run play-art:video -- --source=scripts/play-art/source-video/offense/cfb27-offense-go-go.mp4
npm run play-art:video -- --source=... --dry-run
```

## Output

```
scripts/play-art/video-staging/{game}/{side}/{slug}/
  frames/
  samples/
  source-cards/
  art-crops/
  report.json
```

Staging is gitignored.
