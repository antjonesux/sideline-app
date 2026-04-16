# Changelog - 2026-04-16 (v3)

## Summary

- Added new seeded offensive playbook data files for additional teams.
- Updated `TEAM_SCHEMES` mappings to match latest scheme classifications.
- Removed obsolete temporary scrape output and superseded the prior v2 changelog with this v3 release note.

## Playbook Seed Data Added

- Added:
  - `sideline/lib/seed/playbooks/air-raid.ts`
  - `sideline/lib/seed/playbooks/duke.ts`
  - `sideline/lib/seed/playbooks/georgia.ts`
  - `sideline/lib/seed/playbooks/houston.ts`
  - `sideline/lib/seed/playbooks/maryland.ts`
  - `sideline/lib/seed/playbooks/ohio-state.ts`
  - `sideline/lib/seed/playbooks/oregon.ts`
  - `sideline/lib/seed/playbooks/rice.ts`
  - `sideline/lib/seed/playbooks/texas-state.ts`

## Scheme Classification Updates

- `sideline/lib/playbooks/scheme-classifications.ts`
  - Added `Air Raid` -> `Air Raid`.
  - Updated:
    - `Duke`: `Veer & Shoot` -> `Spread`
    - `Georgia`: `Multiple` -> `Pro Style`
    - `Ohio State`: `Spread` -> `Multiple O`

## Cleanup

- Removed `sideline/tmp_texas_am_scrape_report.json`.
- Replaced `CHANGELOG-2026-04-16-v2.md` with `CHANGELOG-2026-04-16-v3.md`.
