# Changelog

All notable changes to The Sideline are documented here. Updated on every push.

---

## 2026-04-17

**What:** Shipped a broad mobile QA and design-system consistency pass across film, playbook, import, and tendencies flows, including modal behavior, spacing alignment, scouting card updates, play logger overrides, and global scrollbar/background polish.

**Why:** Repeated 390px viewport QA found layout drift, inconsistent component patterns, and interaction friction that made key game-day workflows harder to scan and operate quickly on mobile.

**Decisions:** Centralized shared styling through existing global button/type utilities and page layout wrappers, kept legacy scenario aliases server-side for backward compatibility while preserving full labels in UI, and retained safe-area-aware bottom spacing as a stricter equivalent of fixed `pb-24`.

**Status after this push:** Mobile UX is now materially more consistent across pages and modals, edit/action patterns are standardized, tendencies/playbook scenario handling is aligned, and the app builds cleanly after the full audit pass.

---

## 2026-04-16 (evening)

**What:** Seeded 10 additional team playbooks, corrected scheme classifications for Duke/Georgia/Ohio State, added recommendation engine and playbook classification helpers.

**Why:** Only WSU and Texas A&M had playbook data. Needed more teams seeded so the playbook picker and tendencies filters have real data to work with. Scheme corrections came from cross-referencing cfb.fan with the in-game scheme tags.

**Decisions:** Duke is Spread (not Veer & Shoot) - cfb.fan classifies it differently than the community wiki. Went with cfb.fan since that matches the in-game data. Ohio State is Multiple O - the "Spread" label was from an older source.

**Status after this push:** 11 teams seeded. Tendencies playbook filter now only shows playbooks from logged games. Recommendation engine scaffolded but not yet connected to the Playbook UI.

---

## 2026-04-16 (afternoon)

**What:** Seeded Texas A&M playbook (29 formations, 403 plays), fixed tendencies filter to use logged game playbooks only.

**Why:** Needed a second fully-verified playbook beyond WSU to test multi-playbook flows. Tendencies dropdown was showing all 134 teams which made it unusable - restricted to only teams you've actually logged games against.

**Decisions:** Used `offensive_playbook` with fallback to `my_playbook` for playbook resolution. This handles both the new field name and legacy data from before the field was added.

**Status after this push:** Texas A&M fully seeded and verified (formation/play counts match cfb.fan). Tendencies filters working correctly with multi-playbook data.

---

## 2026-04-15

**What:** Design system enforcement (three-font rule), typography audit, UX feedback system (toasts, breadcrumbs), film workflow updates, tendencies/playbook API refinements.

**Why:** QA pass revealed inconsistent fonts (4+ different font families in use), no user feedback on actions (buttons clicked with no response), and several API routes returning inconsistent response shapes. This was a consistency pass to bring everything in line before adding new features.

**Decisions:** Locked to Barlow Condensed / Barlow / JetBrains Mono. Banned all other fonts. Added `.cursorrules` enforcement so Cursor follows the system on all future code. Toast system uses Zustand store so any component can trigger a notification.

**Status after this push:** Typography consistent across all pages. Toast system operational. Film cards enriched with inline stats. Two production hotfixes applied for TypeScript strict mode failures.
