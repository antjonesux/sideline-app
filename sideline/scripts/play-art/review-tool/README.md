# Play-Art REVIEW Operator Tool

Local keyboard-driven UI for confirming Matcher V3.2 REVIEW cases.

Confirmations write to `scripts/play-art/matching-overrides/{slug}.json`. On the next matcher run those crops PASS via `operator-override`. Session progress lives under `review-tool/state/` so you can quit and resume.

## Run

From `sideline/`:

```bash
npm run play-art:review -- --playbook=air-force
npm run play-art:review -- --playbook=usc

# Skip diagnostic (sample 30 skipped cases; does not modify review state)
npm run play-art:review -- --playbook=air-force --mode=diagnostic
npm run play-art:review -- --playbook=air-force --mode=diagnostic --seed=42
```

Open the printed URL (default `http://127.0.0.1:4300`). If 4300 is busy the server tries 4301+.

Requires an existing matching report:

- `scripts/play-art/reports/cfb27-offense-air-force-matching.json`
- `scripts/play-art/reports/cfb27-offense-usc-matching.json`

## Keyboard (review mode)

| Key | Action |
|-----|--------|
| `1` / `2` / `3` | Confirm candidate |
| `Enter` / `Space` / `→` | Confirm matcher ★ pick |
| `S` | Skip |
| `N` | Formation play picker (when top 3 are wrong) |
| `←` | Undo last action (one level) |
| `Q` | Save state and quit server |

## Keyboard (diagnostic mode)

| Key | Action |
|-----|--------|
| `F` | Formation mismatch (crop header ≠ matcher formation) |
| `C` | Correct formation, wrong top 3 |
| `A` | Ambiguous / can't tell |
| `O` | Other (optional note prompt) |
| `←` | Undo last categorization |
| `Q` | Write report summary and quit |

Diagnostic reports land in `review-tool/reports/diagnostic-{playbook}-{timestamp}.json`.

## Layout

- Top: owned Vault crop (large)
- Middle: up to 3 cfb.fan reference candidates with scores
- Bottom: always-visible shortcuts
- Header: `X / Y reviewed`, average time, ETA (or categorized counts in diagnostic)

## Confirm write path

```
scripts/play-art/matching-overrides/cfb27-offense-{playbook}.json
```

Shape (existing matcher format):

```json
{
  "Flexbone Close": {
    "source-10:middle": "WR DIG"
  }
}
```

This is the operator confirmation path the matcher already reads. USC content-hash reuse (`trusted-hash.ts` + published manifest) is separate and not written by this tool.

## State

```
scripts/play-art/review-tool/state/{playbook}.json
```

Gitignored. Restarting the server resumes at the next unreviewed / unskipped case. Diagnostic mode reads this file and does **not** modify it.

## Verify after a batch

```bash
npm run play-art:ingest -- \
  --reference scripts/play-art/references/cfb27-offense-air-force.json \
  --source "scripts/play-art/source/Option & Spread Option/Air Force.docx" \
  --validate-only
```

REVIEW count should drop by the number of confirmed (non-skipped) cases.
