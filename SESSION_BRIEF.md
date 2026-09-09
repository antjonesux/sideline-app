# Session Brief — Pass 3: Play Browsing UX

**Objective:**  
Make browsing and adding plays to a call sheet faster — sticky formation headers, in-formation search, and reuse the add situation modal for editing.

**Why this matters:**  
Coaches browse long formation lists when building call sheets. Losing the formation header while scrolling forces constant back-and-forth, and there's no way to search within a formation. Editing a situation should feel the same as adding one — same modal, pre-filled.

**In scope:**  
- **Sticky formation header** when adding plays to a call sheet — the formation name row should stick to the top of the scroll area as the user scrolls through plays within that formation
- **In-formation search** — add a search input within an expanded formation so coaches can filter plays by name without scrolling the full list
- **Edit situation** — tapping to edit a situation on a call sheet should open the same modal used when adding a situation, pre-filled with the current situation's values

**Out of scope:**  
- Play type filters (Pass 4)
- Sticky headers in the public playbook browse or play logger — this is call sheet add-play only
- Changes to the situation data model or available situation options
- Any new API endpoints

**Existing patterns to reuse:**  
- `PlayBrowser` component and `useFormationGroups` hook — these power the add-play flow already
- `AddPlayDrawer` and its modal shell pattern (DECISIONS.md 2026-04-19)
- The existing add situation modal component — reuse it for edit by accepting an optional pre-filled situation prop
- Toast and feedback patterns from `useToastStore` / `coachCopy.ts`

**Constraints:**  
- `npm run build` from `sideline/` must pass; no `any`
- Sticky header must work within the existing scroll container — do not change the container-based scroll architecture at md+ (sidebar, main content, and add-play rail scroll independently)
- The formation search input should filter the play list client-side, not trigger a new API call
- Edit situation modal must be the same component as add situation — not a copy. Accept props to differentiate add vs edit mode
- Dark-only styling; follow existing Tailwind/design token patterns
- No drive-by refactors to PlayBrowser or formation group logic beyond what these three changes require

**Relevant decisions:**  
- Game Plan add play mirrors Film — `AddPlayDrawer` reuses film modal pattern and embeds `PlayBrowser` (DECISIONS.md 2026-04-19)
- Container-based scroll architecture at md+ — sidebar, main content, and add-play rail scroll independently

**Done means:**  
- [x] Formation header sticks to top of scroll area when scrolling through plays in the add-play flow
- [x] Search input visible within an expanded formation; typing filters the play list in real time
- [x] Tapping edit on a situation opens the add situation modal pre-filled with current values
- [x] Saving from the edit modal updates the situation (not creates a duplicate)
- [x] Sticky header does not break scroll behavior on mobile or at md+ breakpoint
- [x] `npm run build` clean

**Handoff notes:**  
- **Sticky:** Panel shell (`AddPlayDrawer` `shell="panel"`) uses `position: sticky; top: 0` on the formation chrome inside the existing `SituationSideRail` scrollport — no new scroll wrapper / no change to md+ independent rail scroll. Modal shell keeps formation title + search in a shrink-0 header **outside** the nested `PlayBrowser` play scroller (layout pin, not sticky).
- **Add vs edit situation:** Same `SituationFormModal`; differentiate with existing `mode: "create" | "edit"`. Edit passes `initialValues` from `activeBlock` and `onSubmit={onUpdateSituation}` (PATCH). Presentation aligned to `"responsive"` for both create and edit.
- **In-formation search:** Query state lives in `AddPlayDrawer` (`formationPlayQuery`); passed as optional `formationPlayFilter` to `PlayBrowser`, which filters `selectedPlays` → `visiblePlays` via `matchesFormationPlaySearch`. **`useFormationGroups` unchanged.**
