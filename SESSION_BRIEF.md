# Session brief — CFB26 playbook seeds (batch 3)

**Status:** Closed — batch landed with generator + docs reconciled (2026-05-04).

## Goal

Ship **additional** offensive **`TeamPlaybookSeed`** modules under **`sideline/lib/seed/playbooks/{slug}.ts`**, sourced from **cfb.fan** CFB26 playbooks, aligned with **`DECISIONS.md`** (2026-05-02 — Bulk CFB26 offensive playbook seed catalog) and **`BUILD_CONTRACT.md`** repo map.

## Scope (in)

- Seed `.ts` files for **batch 3** (60 teams: Mountain West, Pac-12, AAC, CUSA, Sun Belt, and related FBS slugs listed in **`sideline/lib/seed/cfb26-playbook-seed-generator.md`**).
- **`sideline/scripts/generate-cfbfan-playbook-seeds.ts`**: `TEAMS` array matches those slugs and **`urlSlug`** overrides where cfb.fan paths differ from file slugs.
- Operator docs + changelogs for traceability.

## Scope (out)

- No app router, API, or UI changes.
- No **`DECISIONS.md`** / **`BUILD_CONTRACT.md`** architecture edits beyond a single cross-link where noted in changelog + generator doc.

## References

- **`sideline/lib/seed/cfb26-playbook-seed-generator.md`** — how to run the generator, **`TEAMS`** / **`urlSlug`** table, HTML fragility notes.
- **`sideline/scripts/seed-playbooks.ts`** — `npm run seed:playbook` upsert to **`cfb26_plays`**.
