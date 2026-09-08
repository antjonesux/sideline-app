# Session Brief — Pass 2: Public Playbooks SEO URL Migration

**Objective:**  
Migrate public playbooks to the evergreen URL `/playbooks/college-football` with game version resolved server-side, so the route is SEO-optimized for college football playbook searches without hardcoding a game year.

**Done means:**  
- [x] `/playbooks/college-football` serves the public playbooks landing page
- [x] All nested public playbook routes live under `/playbooks/college-football/...`
- [x] Old public playbook URLs 301 redirect to new paths
- [x] Game version is resolved server-side — no version in the URL
- [x] All internal links updated (landing page, nav, breadcrumbs, any CTAs)
- [x] Page metadata includes "College Football" and relevant SEO terms
- [x] No duplicate pages at old and new URLs
- [x] `npm run build` clean

**Handoff notes:**  
- **Game version resolution:** `resolvePublicPlaybookGameVersion()` in `sideline/lib/publicPlaybooksServer.ts`. React `cache`’d; walks `CATALOG_GAME_VERSIONS` (newest-first: cfb27, cfb26) and returns the first version with ≥1 `playbooks` row; falls back to `PUBLIC_PLAYBOOK_GAME_VERSION`. When CFB28 is added at the front of `CATALOG_GAME_VERSIONS` and seeded, it is picked automatically. Sync constant + `publicPlaybookSeoYear()` live in `sideline/lib/publicPlaybooksPaths.ts` for client play-art / copy (keep aligned with preferred latest when that catalog is seeded).
- **Redirects:** Permanent 301s in `sideline/next.config.ts` (same pattern as `/import` → `/film/new`). No middleware/`proxy.ts` SEO redirects. Matcher uses `(?!college-football)` so the new tree does not redirect into itself.
- **Path helper:** `sideline/lib/publicPlaybooksPaths.ts` — `PUBLIC_PLAYBOOKS_BASE_PATH`, `publicPlaybooksHref`, `publicPlaybooksHrefWithSide`. Nested pages pass `searchParams.side` into `nextFromUrl` so defense context survives auth CTAs.
- **External links:** Discord bio, README, social posts, or other off-repo bookmarks that still say `/playbooks` need manual updates; the app 301 covers old in-product and bookmarked paths.
- **API:** `/api/public/playbooks*` unchanged.
