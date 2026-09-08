# Session Brief — Pass 1: Mobile Nav & Layout Fixes

**Objective:**  
Fix mobile nav layout and public playbook page gaps — hamburger menu gets its own top row, footer sticks, breadcrumbs and full-width select land.

**Why this matters:**  
Users on mobile can't navigate away from public playbooks after login, and the hamburger sharing a row with other elements makes the top of every page feel cramped. These are the first things a new user hits.

**In scope:**  
- Hamburger menu moved to a dedicated top row on mobile across all main pages (playbooks, call sheets, schemes, film room, tendencies, settings)
- Public playbooks pages: add hamburger menu for authenticated users (match call sheets pattern)
- Footer pinned to bottom on all public playbook pages (home, team details, formation details, play details)
- Call sheets: game version select full-width on mobile
- Public playbooks landing: breadcrumbs show Home > Playbooks

**Out of scope:**  
- SEO URL migration (`/playbooks/college-football`) — that's Pass 2
- Scheme/styles display under playbook headers
- Play type filters, sticky formation headers, in-formation search
- Any new components or features — this is layout and nav only

**Existing patterns to reuse:**  
- Hamburger menu component already used on call sheets — extend to all main pages, do not create a second hamburger
- Footer pattern from landing page or existing shared layout
- Breadcrumb component if one exists; if not, keep it minimal (text links, not a new shared primitive)
- Mobile layout conventions from `sideline/app/layout.tsx` (bottom padding, max-width, safe area)

**Constraints:**  
- `npm run build` from `sideline/` must pass; no `any`
- Hamburger top row must clear the content below it (no overlap)
- Bottom nav z-index stacking unchanged — hamburger row should not fight `BottomTabNav`
- Dark-only styling; follow existing Tailwind/design token patterns
- No placeholder UI — every change must be functional in this pass

**Relevant decisions:**  
- Film game card edit modal and stacking — z-index and overlay conventions (DECISIONS.md 2026-04-21)
- Design system and coach copy in `.cursorrules` (DECISIONS.md 2026-04-18)

**Done means:**  
- [x] Hamburger menu renders in its own top row on mobile on all main pages
- [x] Authenticated users see hamburger on public playbook pages
- [x] Footer visible at bottom of all public playbook pages without overlapping content
- [x] Game version select fills container width on mobile (call sheets)
- [x] Public playbooks landing breadcrumbs show Home > Playbooks
- [x] No layout overlap with `BottomTabNav`
- [x] `npm run build` clean

**Handoff notes:**  
- **Hamburger top row:** Extended `AppShellMenuHeader` — mobile menu sits in its own `md:hidden` row above the title/trailing row. No new wrapper. Consumers (call sheets, film, schemes, settings) inherit automatically. `TendenciesHome` migrated onto `AppShellMenuHeader` (was a local same-row hamburger). Skeleton updated in `PageSkeleton.tsx`.
- **Public playbooks hamburger:** Added in `PublicPlaybooksBrowseFrame` for signed-in users only — reuses `CallSheetMenuButton` + `CallSheetViewerMenu` (no second hamburger component, no props changes to those primitives). Not added to `AppShellChrome` (avoids double-mount with page headers).
- **Footer:** Shared approach in `PlaybooksPageShell` — always renders `MarketingFooter` inside `min-h-dvh flex flex-col` with children in `flex-1`. No page-specific footer overrides. Home pinned frame changed from `h-dvh` → `min-h-0 flex-1` so it fills the shell above the footer instead of fighting viewport height.
- **Breadcrumbs:** `publicPlaybooksBreadcrumbTrail` always prepends Home (`/landing` signed-out, `/playbook` signed-in). Landing trail is `[{ label: "Playbooks" }]` → Home > Playbooks. Deep routes inherit Home prefix as well (reverses 2026-08-28 “no Home when signed in”).
- **Call sheets version select:** `CallSheetsVersionFilter` mirrors Film — `w-full md:max-w-xs`.
