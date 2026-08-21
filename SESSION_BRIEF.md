# SESSION BRIEF — QA41 Collapsible Sidebar Groups

**Objective:**  
Add independent collapse/expand controls for the My Call Sheets and My Schemes groups in the persistent tablet/desktop application sidebar.

**Why this matters:**  
Both groups can become long as coaches create more content. Collapse controls reduce sidebar clutter while keeping primary navigation structure visible.

**In scope:**  
- Make My Call Sheets collapsible  
- Make My Schemes collapsible  
- Independent local UI state per group  
- Accessible expand/collapse affordance (`aria-expanded`)  
- Preserve New Call Sheet / New Scheme and active-route behavior  

**Out of scope:**  
- Call Sheet / Add Play changes  
- Route / schema / API changes  
- Persistence of collapsed state  
- Sidebar width / full sidebar collapse  
- Mobile navigation redesign  

**Constraints:**  
- Local component state only (no Zustand / localStorage / Context)  
- Prefer existing Lucide icons and AppShellSidebar patterns  
- Scope primarily to `md+` persistent sidebar; do not break mobile hamburger nav  
- `npm run build` must pass  

**Done means:**  
- [x] My Call Sheets expands and collapses  
- [x] My Schemes expands and collapses independently  
- [x] Headers remain visible when collapsed; nested links hide  
- [x] New Call Sheet / New Scheme and active nav still work  
- [x] Controls keyboard-accessible with `aria-expanded`  
- [x] Build + sideline review approved  

**Handoff notes:**  
- State: local `useState(true)` inside `CallSheetsNavGroup` and `SchemesNavGroup` (independent; no persistence)  
- Mobile: `AppShellSidebar` is `md:flex` only — disclosure bypasses mobile; hamburger (`CallSheetViewerMenu`) unchanged  
- When collapsed, group header uses section builder-path active (`isPlaySheetBuilderPath` / `isSchemeBuilderPath`) so nested routes keep a visible active cue  
- Follow-up: optional later auto-expand the group containing the active route when collapsed  
