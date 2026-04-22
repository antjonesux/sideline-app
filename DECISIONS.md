# Sideline — decision log

Lightweight record of **meaningful** product and architecture choices visible in the repo today. Entries are grounded in **CHANGELOG** and **code**; nothing here is invented history.

Format: **Date** · **Decision** · **Why** · **Impact**

---

---

## 2026-04-22

**Tendencies filter dropdowns portaled to escape tab-content stacking context**  
**Decision:** The opponent (`TendenciesFilters`) and playbook (`PlaybookFilter`) dropdown menus portal to `document.body` with `fixed` positioning at `z-[70]`. Portal behavior is provided by the shared `usePortalDropdown` hook.  
**Why:** The `.tab-content` fadeIn animation on `TendenciesHome` creates a CSS stacking context that trapped the absolutely-positioned menus regardless of local z-index.  
**Impact:** Both Tendencies filter menus now render and layer correctly above formation lists and cards on both sub-tabs.

---

## 2026-04-21

**The Sideline is a coaching tool, not a logging tool**  
**Decision:** Product is positioned as a coaching loop that improves play-calling, not a generic data logger.  
**Why:** Value comes from insights and behavior change, not data entry.  
**Impact:**  
- onboarding must show insight quickly  
- features prioritize decision-making over data capture  
- marketing and copy reflect coaching identity  

---

## 2026-04-21

**Game Day Mode is the pre-launch priority**  
**Decision:** Live-game logging and play-calling support is the primary product surface before launch. Film Room Mode is a post-launch expansion.  
**Why:** Game Day Mode is already functional and aligns with current logging flow. Film Room Mode requires rapid-fire logging to be viable.  
**Impact:**  
- pre-launch work focuses on logger and play sheet integration  
- Film Room features (batch logging) are P1 post-launch  
- avoids splitting focus too early  

---

## 2026-04-21

**Play sheet must be integrated into the logger**  
**Decision:** Play sheet calls are surfaced directly inside the logger as primary selection input.  
**Why:** The user’s game plan should be visible at the moment of decision, not in a separate tab.  
**Impact:**  
- logger hierarchy prioritizes YOUR CALLS  
- reduces search friction  
- enables plan-vs-execution tracking  

---

## 2026-04-21

**Plan vs execution is a core product insight**  
**Decision:** The gap between sheet calls and actual calls is a first-class metric.  
**Why:** This mirrors real coaching behavior and creates meaningful, actionable feedback.  
**Impact:**  
- future logging may track on-sheet vs off-sheet  
- Tendencies will surface discipline metrics  
- drives behavior change, not just reporting  

---

## 2026-04-21

**Defensive cascade on game delete**  
**Decision:** `DELETE /api/games/[id]` deletes dependent `logged_plays` and `drives` before `game_sessions`, not relying solely on FK cascade in every environment.  
**Why:** Cascade behavior can drift across DBs; coaches need reliable game removal.  
**Impact:** Film game list and cleanup flows stay robust; any new child tables of `game_sessions` must be included in this path or given a guaranteed FK cascade.

---

## 2026-04-21

**Film game card edit modal and stacking**  
**Decision:** `EditGameDetailsModal` supports controlled open state and portals at a higher overlay; `FilmGameCard` opens it from menu actions without nesting modal triggers inside dropdown items; `BottomTabNav` uses lower z-index so overlays win.  
**Why:** Dropdown/modal stacking and nav chrome were fighting each other.  
**Impact:** New modals from film cards should follow the same controlled + portal pattern.

---

## 2026-04-21

**Turnover semantics for drives and logging**  
**Decision:** `INTERCEPTION` and `FUMBLE` are treated as turnover tags alongside `TURNOVER` in drive outcome paths; logger preserves explicit `TURNOVER` where applicable.  
**Why:** Consistent possession-ended and drive-summary behavior for coaches.  
**Impact:** Any new result tags must plug into `driveOutcome` / logger mapping consistently.

---

## 2026-04-21

**TD yardage, ending field, and drive table SPOT**  
**Decision:** Touchdown logging aligns yards and ending position with goal-plane semantics; `gameStateEngine` exposes `absoluteYardAfterLoggedPlay`; drive play tables show a **SPOT** column with scroll-safe table wrappers.  
**Why:** Same-line TD spots were logging misleading yards; coaches need a readable post-play field line on small screens.  
**Impact:** Yardage and table code must stay aligned with `fieldPosition` / engine helpers—not re-derived ad hoc in UI.

---

## 2026-04-21

**Drive setup starting yard input**  
**Decision:** Starting yard line uses controlled string numeric input with validation (1–50) instead of coercing empty `number` inputs to a default.  
**Why:** Coaches could not naturally clear and re-type the line.  
**Impact:** Similar numeric fields should avoid `Number("") || default` patterns that fight in-progress edits.

---

## 2026-04-20

**Single play-type resolution across features**  
**Decision:** Shared `playTypeResolution` (with `tendenciesServer` / `cfb26_plays` map, stored `logged_plays.play_type`, name fallback) is the ladder for canonical **RUN / PASS / RPO**; migrations backfill and constrain `logged_plays.play_type`.  
**Why:** Film, Game Plan, import, and Tendencies showed different badges/filters from divergent lookups and case-sensitive playbook matching.  
**Impact:** Any new surface that shows or persists play type must use this stack; changing the ladder requires coordinated API + UI + migration thinking.

---

## 2026-04-19

**Film default logger is `PlayLoggerV2`**  
**Decision:** Fast logger with suggestions, `PlayBrowser`, and `YardageSheet` as the default path; legacy logger removed. Drive completion is implicit (no separate “End Drive” in header); empty-drive confirm modal removed.  
**Why:** Multi-step logger was too slow for live sideline use.  
**Impact:** New logging UX must extend `PlayLoggerV2` patterns, not reintroduce parallel flows.

---

## 2026-04-19

**Drive outcome persistence gap**  
**Decision:** Drive outcome is derived from plays and refresh behavior; **no** `drives.result` column in current schema—changelog notes future persistence when schema supports it.  
**Why:** Avoid blocking the logger UX on a schema the app did not yet have.  
**Impact:** Do not assume a persisted drive result row exists; closing the gap is an explicit schema + API + UI change.

---

## 2026-04-19

**Game Plan add play mirrors Film**  
**Decision:** `AddPlayDrawer` reuses the film modal pattern and embeds `PlayBrowser` instead of a separate stacked search drawer; add play does not show scenario/formation aggregate stats inside that picker.  
**Why:** Coaches asked for parity with Film browse; picker stays focused on selection.  
**Impact:** New Game Plan pickers should reuse `PlayBrowser` / modal shell unless there is a strong reason documented here.

---

## 2026-04-18

**Design system and coach copy in `.cursorrules`**  
**Decision:** Global typography (Barlow family + JetBrains Mono), dark-only Preline-first UI rules, page layout contract, and **UX Copy & Terminology** live in repo-root `.cursorrules`; shared toast strings in `coachCopy.ts`.  
**Why:** One visual and verbal standard across Film, Game Plan, and Tendencies.  
**Impact:** UI and copy changes default to updating shared components and `.cursorrules`, not one-off strings per page.

---

## 2026-04-22

**Game Plan suggestion scenario pools**  
**Decision:** For sparse Game Plan tabs (`4 Minute`, `2 Point`, `3rd & Short`, `4th Down`, `Backed Up`), the suggestion query pools situationally related logged scenarios (e.g. `4 Minute` includes `2 Minute` clock-offense data; `2 Point` includes `Goal Line` / `Red Zone`). This is logged-data only — no `cfb26_plays` catalog backfill. When a suggestion's evidence comes entirely from a pooled scenario, it is labeled "similar situations" in the UI. Exact-scenario evidence is always preferred and shown with honest exact-only stats.  
**Why:** These tabs are rarely assigned by `deriveScenario` and have too few logged plays for the suggestion pipeline to produce useful results from exact matches alone. Pooling from defensible proxy situations surfaces real outcomes without fabricating data.  
**Impact:** `loggedPlayScenarioLabelsForSuggestions` in `playbookUtils.ts` defines the pool map. Changes to pool membership should be documented here.

---

## Current operating decisions (not tied to a single dated ADR)

These are **how the product operates today** from shipped UX and `.cursorrules`; refine when you intentionally change behavior.

- **Navigation labels:** Bottom nav: Film Room | Game Plan | Tendencies. Game details tabs: Drive Summary | Tendencies. Tendencies sub-tabs: What’s Working | Am I Predictable? — fixed strings per `.cursorrules`.
- **API response shapes:** New routes should follow `.cursorrules` (`{ data }` / `{ error }`, explicit selects); legacy endpoints may still return arrays or legacy keys until touched.
- **Node / Next:** App targets **Node ≥ 20**, Next **16.x** stack as declared in `sideline/package.json` — verify against `node_modules/next` docs when APIs feel unfamiliar.

---

## When to update this file

Update `DECISIONS.md` only when:
- a meaningful product or architectural decision is made
- a previous decision is intentionally changed or reversed

Do not log minor implementation details or temporary choices.