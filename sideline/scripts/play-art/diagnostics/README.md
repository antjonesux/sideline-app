# Play-art extraction diagnostics

Diagnose DOCX strip classification and per-formation crop counts **without** modifying `extract-docx.ts`.

## Prerequisites

- DOCX files under `scripts/play-art/source/`
- Matching references under `scripts/play-art/references/`
- Optional: `tesseract` on PATH (for play-name OCR in California deep dive)

## Commands

From `sideline/`:

```bash
# California DOCX ZIP / relationship structure
npx tsx scripts/play-art/diagnostics/docx-inspector.ts \
  --source="scripts/play-art/source/Multiple & Pro Style/California.docx" \
  --out="scripts/play-art/diagnostics/reports/california-docx-structure.md"

# Full extraction audit (California focus + Air Force + USC)
npx tsx scripts/play-art/diagnostics/extraction-audit.ts

# Single playbook only
npx tsx scripts/play-art/diagnostics/extraction-audit.ts --playbook=california
npx tsx scripts/play-art/diagnostics/extraction-audit.ts --playbook=air-force
npx tsx scripts/play-art/diagnostics/extraction-audit.ts --playbook=usc
```

## Outputs

| Report | Contents |
|--------|----------|
| `reports/california-docx-structure.md` | Media count, embed order, rels cross-ref |
| `reports/california-extraction-trace.md` | Per-formation strip/card counts + Bunch X Nasty deep dive |
| `reports/air-force-extraction-audit.md` | Per-formation extracted vs seed |
| `reports/usc-extraction-audit.md` | Same for USC |
| `reports/extraction-audit-summary.md` | Cross-playbook aggregate + root-cause notes |

## Optional probes

```bash
# OCR every formation header; compare DOCX order vs seed/reference order
npx tsx scripts/play-art/diagnostics/probe-header-order.ts california
npx tsx scripts/play-art/diagnostics/probe-header-order.ts air-force
npx tsx scripts/play-art/diagnostics/probe-header-order.ts usc

# Deep OCR of California strips 0–11 (wrong positional pairing at head of DOCX)
npx tsx scripts/play-art/diagnostics/probe-california-head.ts
```

## Notes

- Instrumentation **shadows** `loadOrderedSourceStrips` / gutter classification; it does not patch production extraction.
- Under-count (`rawCards < expected`) fails closed in production — same gate California hit when seed order ≠ DOCX order.
- Over-count (`rawCards > expected`) is where production **silently** drops trailing card regions (and near-duplicate name bands).
- **Primary California finding:** Vault DOCX formation order ≠ seed/reference order. Bunch X Nasty’s 15 cards are intact at DOCX header #26; positional slot 1 was paired with Wing Slot Offset (12).
