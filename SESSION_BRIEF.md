# SESSION BRIEF — QA41 Add Play + Situation Detail Refinement

**Objective:**  
Polish the situation-detail Add Play experience: align the header Add Play CTA with remove actions, remove the remaining right-side rail gap, put play name/actions above play art, and match the selected formation heading to active sidebar nav styling.

**Why this matters:**  
QA41 confirms larger play art works; remaining issues are visual alignment and workspace polish that make the layout feel unfinished.

**In scope:**  
- Right-align situation `PlayTableHeader` Add Play with remove × column  
- Expand Add Play rail to the available app-shell right edge (no arbitrary fixed-width bump)  
- `AddPlayBrowseRow` hierarchy: name → actions → art (keep QA40 art size)  
- Selected formation heading reuses active sidebar nav tokens/classes  

**Out of scope:**  
- Sidebar collapse/expand  
- Schema / API / scraper / Coach View / situation-row art / capacity / mutations  
- Full PlayBrowser or dashboard redesign  

**Constraints:**  
- Extend existing components; preserve mobile drawer, independent scroll, pinned search; `npm run build` must pass  

**Done means:**  
- [x] Header Add Play right edge aligns with remove ×  
- [x] No unused gap to the right of Add Play on wide desktop  
- [x] Play name/actions above large art  
- [x] Formation heading matches active nav styling (visible `AddPlayDrawer` header)  
- [x] Build + sideline review approved  

**Handoff notes:**  
- Rail: `--app-shell-situation-browse-panel-width` mins retained; panel `flex-grow`s within 42/46/50% caps; `--with-browse` bleeds past `.app-shell-main` right padding + centering gap to the app-shell workspace edge  
- Active-nav source: `appShellNavItemActiveTextClass` (`text-white`) + nav typography in `AddPlayDrawer` plays-step header — no emerald pill background; sidebar still uses full `appShellNavItemActiveClass`  
- Remaining visual QA: confirm bleed at md/lg/xl and long formation name truncation beside the back control  
