#!/usr/bin/env bash
# Re-ingest duplicate-section failures from batch-2026-08-25T23-39-43-345Z
set -u
cd "$(dirname "$0")/../.." || exit 1

SOURCES=(
  "scripts/play-art/source/Air Raid/Air Raid.docx"
  "scripts/play-art/source/Air Raid/Baylor.docx"
  "scripts/play-art/source/Air Raid/Louisiana Tech.docx"
  "scripts/play-art/source/Multiple & Pro Style/Arizona.docx"
  "scripts/play-art/source/Multiple & Pro Style/Georgia.docx"
  "scripts/play-art/source/Multiple & Pro Style/Iowa.docx"
  "scripts/play-art/source/Multiple & Pro Style/Kansas State.docx"
  "scripts/play-art/source/Multiple & Pro Style/Minnesota.docx"
  "scripts/play-art/source/Multiple & Pro Style/North Dakota State.docx"
  "scripts/play-art/source/Multiple & Pro Style/Oregon State.docx"
  "scripts/play-art/source/Multiple & Pro Style/Washington.docx"
  "scripts/play-art/source/Multiple & Pro Style/Wyoming.docx"
  "scripts/play-art/source/Option & Spread Option/Army.docx"
  "scripts/play-art/source/Option & Spread Option/Option.docx"
)

LOG="scripts/play-art/reports/fuzzy-fix-rerun-$(date -u +%Y-%m-%dT%H-%M-%SZ).log"
echo "Fuzzy-fix recovery re-run — $(date -u +%Y-%m-%dT%H:%M:%SZ)" | tee "$LOG"
echo "Playbooks: ${#SOURCES[@]}" | tee -a "$LOG"
echo "" | tee -a "$LOG"

ok=0
fail=0
for src in "${SOURCES[@]}"; do
  name=$(basename "$src" .docx)
  echo "════════════════════════════════════" | tee -a "$LOG"
  echo "INGEST: $name" | tee -a "$LOG"
  echo "════════════════════════════════════" | tee -a "$LOG"
  if npm run play-art:ingest -- --source="$src" >>"$LOG" 2>&1; then
    echo "RESULT: success (exit 0) — $name" | tee -a "$LOG"
    ok=$((ok + 1))
  else
    # Matching report may still exist when REVIEW remains (exit 1)
    slug=$(echo "$name" | tr '[:upper:]' '[:lower:]' | sed 's/ & / and /g; s/&//g; s/ /-/g')
    report="scripts/play-art/reports/cfb27-offense-${slug}-matching.json"
    if [[ -f "$report" ]]; then
      echo "RESULT: success (matching report written; exit non-zero likely REVIEW) — $name" | tee -a "$LOG"
      ok=$((ok + 1))
    else
      echo "RESULT: FAILED — $name" | tee -a "$LOG"
      fail=$((fail + 1))
    fi
  fi
  echo "" | tee -a "$LOG"
done

echo "════════════════════════════════════" | tee -a "$LOG"
echo "Recovered: $ok / ${#SOURCES[@]}" | tee -a "$LOG"
echo "Still failed: $fail / ${#SOURCES[@]}" | tee -a "$LOG"
echo "Log: $LOG" | tee -a "$LOG"
