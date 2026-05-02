# Design system audit (Phase 1 only)

Audit scope: `sideline/` Next.js app (`components/`, `app/`). No code changes were made during this phase.

```ts
/*
================================================================================
FULL DEVIATION CATALOG (Phase 1 — audit only; no fixes applied)
Grouped by category. Line numbers from grep on 2026-04-20; re-verify after edits.
================================================================================

--- Category: Inline styles (dynamic or otherwise) ---
sideline/components/tendencies/FormationFrequency.tsx:23
  style={{ width: `${Math.min(100, r.pct)}%` }} on progress bar inner div
sideline/components/tendencies/PlayTypeDistribution.tsx:47
  style={{ width: `${width}%` }} on bar segment
sideline/components/tendencies/RankedRow.tsx:49
  style={{ width: `${pct}%` }} on progress bar inner div
sideline/components/shared/DropdownMenu.tsx:130-134
  style={{ top/bottom/right }} on portaled menu (positioning)

--- Category: Hardcoded hex / arbitrary non-Tailwind palette in className ---
sideline/app/film/[gameId]/page.tsx:83
  border-[#2A2E3A] bg-[#1C1F28] text-[#A0A3AD] on badge span
sideline/components/shared/Breadcrumb.tsx:18,32
  text-[#A0A3AD] (nav and separator)
sideline/components/shared/DropdownMenu.tsx:116
  text-[#A0A3AD], hover:text-[#F5F5F0], hover:bg-white/[0.04]
sideline/components/film/FilmGameCard.tsx:52
  text-[#10B981] / text-[#C0392B] for W/L score coloring
sideline/components/import/ImportPreviewDrives.tsx:62
  text-[#10B981] / text-[#C0392B] / text-[#A0A3AD] for yards
sideline/components/import/ResultBadge.tsx:7,9
  border-[#2A2E3A] bg-[#1C1F28] text-[#A0A3AD]
sideline/components/tendencies/RankedRow.tsx:40
  bg-[#C0392B] for non-emerald bar fill

--- Category: Unicode / emoji used as icons (vs shared SVG / icon components) ---
sideline/app/film/[gameId]/page.tsx:546 — Chevron "∧" / "∨"
sideline/app/film/[gameId]/page.tsx:694,777 — Close ✕ in span
sideline/app/film/[gameId]/page.tsx:722 — Close ✕ button text
sideline/components/playbook/PlaybookEditor.tsx:406 — ✕
sideline/components/playbook/AddPlayDrawer.tsx:58 — ✕
sideline/components/playbook/CreatePlaybookModal.tsx:101 — ✕
sideline/components/playbook/EditPlaybookModal.tsx:110 — ✕
sideline/components/film/EditGameDetailsModal.tsx:283 — ✕
sideline/components/shared/ConfirmDestructiveModal.tsx:56 — ✕
sideline/components/film/atoms/PlayRow.tsx:106 — ✕
sideline/components/game-plan/PlayTableRow.tsx:51,60,71 — ✓ / ✕
sideline/components/import/TemplateDownload.tsx:88 — ✓
sideline/components/shared/BottomTabNav.tsx:7-9 — 🎞 📋 📊
sideline/components/film/play-logger/PlayLogFeedRow.tsx:21-22 — "1ST ↓", "TD ↑"
sideline/app/film/import/save/page.tsx:323 — "← Back to preview"
sideline/components/tendencies/WorkingListPagination.tsx:27,38 — "← Previous" / "Next →"

--- Category: Non-primary icon library imports ---
  None (no @heroicons / lucide / react-icons in package.json). Deviation = SVG vs unicode vs emoji.

--- Category: Border radius inconsistencies ---
sideline/components/shared/DropdownMenu.tsx:109 — trigger rounded-md
sideline/app/film/[gameId]/page.tsx:541 — chevron button rounded-md
sideline/components/film/atoms/PlayRow.tsx:60 — row rounded-lg (inner card)
sideline/components/playbook/PlaybookEditor.tsx:402 — rounded-t-2xl sm:rounded-xl
sideline/app/film/[gameId]/page.tsx:767 — sm:rounded-xl panel
sideline/components/tendencies/ScoutingReport.tsx, ScoutingFormationsReport.tsx — rounded-xl border-slate-800

--- Category: Card / surface background & border inconsistencies ---
sideline/components/film/play-logger/PlayLogFeed.tsx:33 — layered app-card + explicit classes
sideline/components/film/atoms/PlayRow.tsx:60 — bg slate-800/900 template
sideline/components/tendencies/ScoutingReport.tsx, ScoutingFormationsReport.tsx — border-slate-800 outer
sideline/components/film/FilmGameCard.tsx:56 — hover:border-slate-600
sideline/components/film/DriveStartingFieldPanel.tsx:50,61 — bg-slate-900/50 border-slate-800/80
sideline/app/film/[gameId]/page.tsx:551 — expanded body bg-slate-800/50
sideline/components/film/YardageSheet.tsx:160 — footer strip bg/border

--- Category: Inconsistent spacing on equivalent elements ---
sideline/components/tendencies/TopPlaysList.tsx:42 — px-3 py-1 sm:px-4 vs app-card-pad
sideline/components/tendencies/MotionUsage.tsx:12 — app-card p-4
sideline/components/tendencies/PlayTypeDistribution.tsx:39 — app-card p-4
sideline/components/import/ImportPreview.tsx:77 — app-card flex p-1
sideline/components/shared/AppSkeleton.tsx — mixed p-3 / p-4 / heights
sideline/components/tendencies/AmIPredictable.tsx:47,133 — p-4 / p-3

--- Category: Typography — arbitrary text-[Npx] (representative; many more lines in same files) ---
sideline/app/film/[gameId]/page.tsx:83
sideline/components/film/atoms/PlayRow.tsx (9px–13px)
sideline/components/film/YardageSheet.tsx
sideline/components/film/PlayLoggerV2.tsx
sideline/components/shared/FormationPlaySearch.tsx
sideline/components/game-plan/PlayTypeBadge.tsx:14
sideline/components/import/ResultBadge.tsx, TemplateDownload.tsx, ImportPreviewDrives.tsx
sideline/components/shared/Toast.tsx:37
sideline/components/tendencies/* (GameStatsGrid, GameSelector, TopFormationsList, WorkingRankMetrics, AmIPredictable, ReconsiderPlays, FormationFrequency, RankedRow, ScoutingReportSection, MotionUsage, TopPlaysList, WorkingListPagination, etc.)

--- Category: Typography — text-white vs text-slate-100 ---
  Widespread: app/layout.tsx body; film/[gameId]/page; YardageSheet; PlayLoggerV2; DriveSetupForm; playbook/*; tendencies/*; FormationPlaySearch; globals .app-card-title / .btn-primary also use text-white.

--- Category: Button inconsistencies vs .btn-* utilities ---
  Ad-hoc emerald buttons: DriveSetupForm, YardageSheet, film/[gameId] quarter toggles, ResultGrid, SituationList, GameSelector, TendenciesFilters, etc. (mixed uppercase/tracking/font-heading)

--- Category: Arbitrary shadow ---
sideline/components/film/YardageSheet.tsx:274 — shadow-[0_0_18px_rgba(16,185,129,0.25)]

--- Category: SVG integer width/height vs h-/w-* ---
  DropdownMenu, CardKebabMenu, TeamCombobox, PlayLogFeedRow, TendenciesFilters, PlaybookFilter, etc.

================================================================================
END CATALOG
================================================================================
*/
```

---

## 1A — Ground truth (canonical sources)

### Primary sources (read in full)

1. **`sideline/tailwind.config.js`** — minimal extension:
   - **Font families (Tailwind theme):** `font-mono` → `var(--font-jetbrains-mono)`; `font-sans` → `var(--font-barlow)`; `font-display` → `var(--font-barlow-condensed)`.

2. **`sideline/app/globals.css`** — authoritative for colors, component shells, typography utilities, buttons:
   - **Page background:** `body` / backdrop `background-color: rgb(2, 6, 23)` → Tailwind **`slate-950`** (`#020617`).
   - **Focus ring:** `outline: 2px solid #10b981` → **`emerald-500`**.
   - **`.app-card`:** `rounded-xl border border-slate-700 bg-slate-900`.
   - **`.app-card-interactive`:** `rounded-xl border border-slate-700 bg-slate-900 p-4` + hover `hover:border-emerald-600/50 hover:bg-slate-800/70`.
   - **`.app-shell`:** `rounded-xl border border-slate-700 bg-slate-900 p-4 sm:p-6`.
   - **`.app-accordion-header-row`:** `border-b border-slate-800/90 bg-slate-800` (defined but **not referenced** in TSX as of this audit).
   - **`.app-dropdown-panel`:** `rounded-lg border border-slate-700 bg-slate-950`.
   - **Typography utilities:** `.app-page-title`, `.app-section-title`, `.app-modal-title`, `.app-card-title`, `.app-game-title`, `.app-editor-title`, `.app-field-label`, `.app-drive-number` (`text-amber-400`).
   - **Buttons:** `.btn-primary` / `.btn-secondary` / `.btn-destructive` use **`rounded-lg`**, **`bg-emerald-600`** (primary), **`border-slate-700`** (secondary), **`text-white`** on primary, **`font-heading`** / **`font-body`** mix.
   - **Inputs:** `.app-input` / `.app-input-compact`: **`rounded-lg`**, **`border-slate-700`**, **`bg-slate-900`**.

### Reference component (substitute for `GameDetailsScreen`)

**`GameDetailsScreen` does not exist in the repo.** The closest “drive accordion card” is in **`sideline/app/film/[gameId]/page.tsx`** (drive list): outer wrapper uses **`app-card overflow-hidden rounded-xl`**; header row **`border-b border-slate-800/60 px-4 py-3`**; expand chevron uses Unicode **`∨` / `∧`** (lines ~546); drive label **`text-amber-400`** with mono/bold/uppercase.

### Palette summary (named Tailwind / CSS)

| Role | Token / class | Approx value |
|------|----------------|--------------|
| Page bg | `slate-950` / body rgb | `#020617` |
| Card surface (`.app-card`) | `bg-slate-900` | `#0f172a` |
| Accordion header (utility) | `bg-slate-800` | `#1e293b` |
| Borders (cards) | `border-slate-700` | per Tailwind slate-700 |
| Dividers | `border-slate-800`, often with opacity (e.g. `/60`, `/80`, `/90`) | — |
| Muted text | `text-slate-400`–`600` | — |
| Primary headings / titles (utilities) | `text-white` or `text-slate-100` (both appear) | — |
| Drive accent | `text-amber-400` (`.app-drive-number`) | — |
| Primary CTA | `bg-emerald-600`, hover `bg-emerald-500` | — |

### Typography (semantic mapping from CSS)

- **Body default:** Barlow (`font-sans` / `font-body` in utilities).
- **Headings / card titles:** Barlow Condensed (`font-heading` / `font-display` in utilities); global `h1–h3` uppercase, `letter-spacing: 0.08em`, `font-weight: 700`.
- **Mono / data:** JetBrains Mono (`font-mono`).
- **Sizes:** Utilities use `text-3xl`–`text-xs`; many components also use **arbitrary `text-[Npx]`** (see catalog).

### Border radius (canonical from CSS utilities)

- **Cards / shells:** **`rounded-xl`** (`.app-card`, `.app-shell`, `.app-card-interactive`).
- **Buttons, inputs, dropdown panel:** **`rounded-lg`** (`.btn-*`, `.app-input`, `.app-dropdown-panel`).
- **Skeleton:** `rounded-md` (`.app-skeleton`).

### Spacing (canonical patterns)

- **`.app-card-pad`:** `p-4`.
- **Drive accordion header (reference):** `px-4 py-3`.
- **Primary/secondary buttons:** `px-4 py-2.5` (and variants with `py-4` for `.btn-primary-lg`).

---

## 1B — Icon library

### `package.json` (`sideline/package.json`)

- **No** `@heroicons/react`, **no** `lucide-react`, **no** `react-icons`.

### Primary “icon system” in practice

- **Inline `<svg>`** (stroke/fill, various `width`/`height` in px — e.g. 14, 16, 18) in shared components: `DropdownMenu`, `CardKebabMenu`, `FormationPlaySearch`, `TeamCombobox`, `BackNavLink`, `DragHandleIcon`, `PlayLoggerV2`, tendencies filters, etc.
- **Unicode / emoji** for UI affordances where no shared component exists (chevrons, close, check, tab labels) — see **1C**.
- **Inconsistency:** mix of SVG icons, raw Unicode, and emoji tab icons; no single importable icon package.

---

## 1C — Deviation catalog

The full file-and-line catalog is in the **`/* ... */` comment block** at the **top of this file** (immediately under the title).

## Notes for Phase 2 (enforcement)

- **Canonical radius conflict:** User brief suggests **`rounded-lg`** for all cards; **`globals.css` `.app-card`** uses **`rounded-xl`**. Enforcement should either update globals + majority surfaces together or treat **`rounded-xl`** as canonical for `app-card` and only align ad-hoc cards.
- **Canonical card bg conflict:** User brief lists **`bg-slate-800`** for cards; **`.app-card` uses `bg-slate-900`**. Majority pattern in CSS utilities is **`bg-slate-900`** for card shells; **`bg-slate-800`** appears on nested rows/panels.
- **Progress bars:** Removing `style={{ width: ...% }}` may require Tailwind arbitrary values with inline style anyway, or a different pattern (CSS variable). Flag in Phase 2.
- **DropdownMenu positioning:** Replacing dynamic `top`/`right`/`bottom` without `style` may require CSS anchor positioning or a library — verify behavior if enforcing “zero inline styles” literally.

---

*Phase 1 complete. Phase 2 should not re-audit in the same file without updating this document.*
