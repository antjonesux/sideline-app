# Changelog - 2026-04-16 (v2)

## Summary

- Seeded `Texas A&M` offensive playbook data into `cfb26_plays` using the live source and verified counts.
- Corrected `TEAM_SCHEMES` mapping for `Texas A&M` to `Pro Style`.
- Updated tendencies playbook filter behavior to use logged game playbooks only.

## Data Seeding

- Added `sideline/lib/seed/playbooks/texas-am.ts`.
- Verified seed/DB parity:
  - Formations: `29`
  - Plays: `403`
  - `is_new_in_26`: `26`

## Tendencies Filter Behavior

- `sideline/lib/tendenciesServer.ts`
  - Unified playbook resolution through `playbookForGame` (`offensive_playbook` fallback to `my_playbook`).
  - Updated filtering and distinct-playbook queries to reflect logged game data.
  - Restricted dropdown source to logged game playbooks only.
- `sideline/components/tendencies/TendenciesHome.tsx`
  - Opponent derivation now uses resolved game playbook logic for consistency.

## Supabase Schema Notes

- `sideline/supabase/schema.sql` includes `cfb26_plays` RLS/read-policy setup notes for anon-read compatibility.
