# SESSION BRIEF — QA41 Add Play + Situation Detail Refinement (follow-up)

**Objective:**  
Continue QA41 polish: balance situation-detail horizontal padding, collapse to one vertical scrollbar, and vertically center the PLAY table-header label.

**Why this matters:**  
Prior QA41 shipped rail/CTA/art hierarchy; remaining padding, dual scrollbars, and header label alignment still make the situation workspace feel unfinished.

**In scope:**  
- Equal L/R inset on situation-detail primary content (shell tokens)  
- One visible vertical scrollbar (remove redundant scroll owner; document decision adjust)  
- Vertically center PLAY in `PlayTableHeader`  
- Preserve Add Play rail alignment, pinned search, mobile drawer  

**Out of scope:**  
- Sidebar collapse (separate QA41 sidebar session)  
- Schema / API / Coach View / capacity / mutations  

**Constraints:**  
- Prefer app-shell spacing tokens; no cosmetic scrollbar hiding; `npm run build` must pass  

**Done means:**  
- [x] Equal visual L/R padding (Add Play open and closed)  
- [x] One vertical scrollbar; plays + Add Play results reachable; search pinned  
- [x] PLAY vertically centered; Add Play CTA still right-aligned  
- [x] Build + review  

**Handoff notes:**  
- Padding: with Add Play closed, inner uses `px-[var(--app-shell-px)]` + `mx-auto` / max-width. With Add Play open, workspace bleeds past main padding on **both** sides; situation column uses the same `--app-shell-px` L/R with `gap-0` (no stacked left-only main pad, no md/lg column gap).  
- Scroll: page/`html` is the sole vertical owner on situation detail; removed height-lock + column `overflow-y-auto`. Panel Add Play uses `pageScrollResults` + sticky search. Modal unchanged. Decision logged 2026-08-21 in `DECISIONS.md`  
- PLAY: header label cells `flex items-center` so content centers inside `md:min-h-12` row cells from the table wrapper  
- Remaining visual QA: confirm sticky search at tablet/wide desktop with long catalogs; confirm no clipping when rail open  
