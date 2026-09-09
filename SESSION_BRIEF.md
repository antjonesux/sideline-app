# Session Brief — Pass 5: Scheme & Styles Display

**Objective:**  
Seed team style data and display it under playbook headers — offensive style on offensive playbook pages, team list on defensive playbook pages.

**Why this matters:**  
When a coach clicks into a playbook, the first question is "what kind of offense/defense is this?" For offense, showing the style (e.g. "Spread", "Veer & Shoot") immediately orients the user. For defense, knowing which teams run a given scheme (e.g. "3-4 Zone") helps coaches find playbooks that match their defensive philosophy.

**In scope:**

### Part 1 — Data
- Seed offensive style per team (e.g. Alabama → Multiple, Auburn → Veer & Shoot) for all ~134 CFB27 teams
- Seed defensive style per team (e.g. Alabama → 3-4 Zone, Auburn → 3-3-5 Tite) for all ~134 CFB27 teams
- Associate styles with game version (CFB27 now, CFB28 later)
- No conference data — exclude from schema and seeding

### Part 2 — Display

**Offensive playbooks (team-specific):**
- Show the team's offensive style under the playbook header (e.g. "Spread" under Oklahoma's playbook)
- One style per team — simple text or badge

**Defensive playbooks (scheme-specific):**
- Show a comma-separated list of teams that use that defensive scheme under the playbook header
- Example: under "3-4 Zone" header → "Air Force, Alabama, Liberty, Oregon State, Temple"
- Keep it as a simple comma-separated text list, not chips or badges

**Both apply to public and in-app playbook pages.**

**Out of scope:**  
- Conference data
- Displaying the full summary table (formation %, run/pass splits)
- Filtering or searching playbooks by style
- Any changes to play data itself

**Done means:**  
- [x] Style data (offense, defense) is seeded for all CFB27 teams
- [x] Offensive playbook pages show the team's offensive style under the header
- [x] Defensive playbook pages show a comma-separated list of teams using that scheme under the header
- [x] Both public and in-app playbook pages display styles
- [x] Missing style data results in no display (graceful fallback)
- [x] Team lists on defensive pages are alphabetically sorted
- [x] `npm run build` clean (run before handoff complete)

**Handoff notes:**

### Where style data lives
- **Tables (extended, not new):** `team_offensive_playbooks` and `team_defensive_schemes`
- **Schema:** composite PK `(team_name, game_version)`; offense columns `playbook_name`, `scheme_style`, `game_version`; defense columns `defensive_scheme`, `game_version`
- **Migration:** `sideline/supabase/migrations/20260908210000_team_styles_game_version.sql`
- **CFB27 source:** `sideline/lib/seed/team-styles/cfb27-team-styles.ts` (PlaybookGamer Team Styles; no conference)
- **CFB26 legacy:** still in `sideline/supabase/seed-team-schemes.sql`, tagged `cfb26` by `npm run seed:teams`
- **Lookup helpers:** `sideline/lib/teamStylesLookup.ts`

### Team name matching
Verified 138/138 PlaybookGamer rows against CFB27 offense catalog seeds and 31/31 defense schemes against defense playbook seeds.
**Manual mapping:**
- `"Miami FL"` → `"Miami"` (catalog / Sideline playbook name)
- `"Miami OH"` → `"Miami OH"` (exact; no change)

### Display wiring
- Shared browse surface: `BrowsePlaybookDetail` + `PublicPlaybookDetailHeader` (public + signed-in)
- Catalog API payload adds `offensive_style` / `defensive_teams` via `fetchPublicPlaybookCatalog`
- Team-offense only shows style; alternative offense books show nothing; defense shows sorted team list or nothing

### Ops
1. Apply migration `20260908210000_team_styles_game_version.sql`
2. Run `npm run seed:teams` from `sideline/`
