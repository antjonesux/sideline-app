# CFB26 offensive playbook seed generator (cfb.fan)

## Purpose

**`scripts/generate-cfbfan-playbook-seeds.ts`** fetches public CFB26 offensive playbook pages from **cfb.fan** and writes **`lib/seed/playbooks/{fileSlug}.ts`** modules (`TeamPlaybookSeed`). Loading into Supabase uses the existing seed script (**`npm run seed:playbook`**) — see repo-root **`DECISIONS.md`** (2026-05-02 — Bulk CFB26 offensive playbook seed catalog) and **`BUILD_CONTRACT.md`**.

## Run

From **`sideline/`**:

```bash
NODE_PATH=./node_modules tsx ./scripts/generate-cfbfan-playbook-seeds.ts
```

Requires network access. Respect **cfb.fan** rate limits; the script sleeps between formation fetches.

## `TEAMS` and `urlSlug`

The **`TEAMS`** array in the generator is the **source of truth** for which files this script (re)generates. Each entry has:

- **`fileSlug`** — filename stem (`playbooks/{fileSlug}.ts`).
- **`team`** — must match a key in **`lib/playbooks/scheme-classifications.ts`** **`TEAM_SCHEMES`** (used for **`scheme`** on the seed).
- **`urlSlug`** (optional) — path segment on cfb.fan when it differs from **`fileSlug`** (`https://cfb.fan/26/playbooks/{urlSlug}-off/`).

### Batch 3 (2026-05-04) — 60 teams

| fileSlug | team (display) | urlSlug override |
|----------|----------------|------------------|
| california | California | `cal` |
| fiu | Florida International | `florida-international` |
| middle-tennessee | Middle Tennessee | `mid-tenn-state` |
| sam-houston | Sam Houston | `sam-houston-state` |

All other batch-3 rows use **`urlSlug` = `fileSlug`**.

Alphabetical **`fileSlug`** list: akron, appalachian-state, arizona, arizona-state, arkansas-state, ball-state, boise-state, boston-college, buffalo, california, central-michigan, charlotte, clemson, coastal-carolina, east-carolina, fiu, florida-atlantic, florida-state, fresno-state, georgia-southern, georgia-state, hawaii, jacksonville-state, kennesaw-state, louisville, marshall, memphis, middle-tennessee, nc-state, nevada, new-mexico, new-mexico-state, north-texas, northwestern, old-dominion, pittsburgh, rutgers, sam-houston, san-diego-state, smu, south-alabama, stanford, syracuse, temple, toledo, troy, tulane, uab, unlv, usf, utah, utah-state, utep, utsa, virginia, virginia-tech, wake-forest, washington, western-michigan, wyoming.

## Fragility

Parsing uses **HTML structure** on cfb.fan (formation `href`s, `play-tile__header`, `h1` titles). If the site changes markup, the script may return **no formations** or **empty plays** until selectors are updated. After any bulk regen, run **`npm run seed:playbook -- --dry-run`** (or per slug) and spot-check **`GET /api/cfb26-playbooks`** after a real upsert.

## Post-run checks

- **`npm run build`** from **`sideline/`**
- **`npm run seed:playbook -- <slug> --dry-run`** for a sample of teams, especially those with **`urlSlug`** overrides
- **`npm run verify:playbook`** after DB upsert when validating catalog drift
