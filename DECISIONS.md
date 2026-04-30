# Sideline — decision log

Lightweight record of **meaningful** product and architecture choices visible in the repo today. Entries are grounded in **CHANGELOG** and **code**; nothing here is invented history.

Format: **Date** · **Decision** · **Why** · **Impact**

---

---

## 2026-04-30 — Film game tendencies tables + shared DataTable layout

**Film game detail → Tendencies** (`FilmGameTendenciesBody`, `GameFormationTable`): **BY SITUATION** uses **`DataTable`** **`equalColumnsCompact`** so **`equalColumns`** tables can shrink without the default **`min-w-[520px]`** floor when the card has room; situation labels **`truncate`** with **`title`** for full text on hover/focus. **FORMATIONS** outer table uses **`containedWidth`** (**`w-full table-fixed min-w-0`**) so **`renderAfterRow`** / colspan accordion content does not balloon **`w-max`** intrinsic width (fixes runaway horizontal scroll). Expanded formation plays reuse **`drivePlayTableColumns({ includeSpot: false })`** — **no SPOT column** in that drill-down only; primary Film drive tables, import previews, and other callers keep **SPOT** and **`drivePlayTableColumns()`** defaults (**see 2026-04-21** ending-field / SPOT decision for canonical drive-table shape). Nested accordion table uses **`dense`** + **`equalColumnsCompact`**; **RESULT** keeps trailing horizontal gutter (**`pr-*`** on badge wrapper); **YDS** is **right-aligned** when **SPOT** is omitted to separate yard values from badges. **`DataTable`** adds optional column **`headerClassName`** / **`cellClassName`** and props **`equalColumnsCompact`**, **`containedWidth`**, **`dense`**; colspan expansion cells use **`min-w-0 max-w-full`**.

**Why:** Tendencies formation accordion and BY SITUATION tables overflowed horizontally without improving coaching signal; fixes belong in the shared table primitive with opt-in flags rather than duplicate table markup.

**Impact:** Defaults unchanged for existing **`DataTable`** callers. Omitting **SPOT** in formation-expanded plays is intentional density/readability trade-off — restore **SPOT** there only if product requires ending-field parity with primary drive views.

---

## 2026-04-30

**Shared modal chrome + app shell titles + button typography (design tokens)**  
**Decision:** `sideline/lib/constants/designTokens.ts` exports **`modalCtaFooterClass`** (bottom CTA row padding + safe-area), **`modalDialogTitleClass`** (modal/sheet title typography aligned to **`ConfirmDestructiveModal`**), and **`appShellPageTitleClass`** (main shell page titles aligned to the landing wordmark’s Barlow bold / tracking / uppercase treatment **without** glow). Film **end game (final score)** confirmation stays on **Radix `Dialog`** and uses the same header/body/footer structure and tokens as other confirms. **`Button`** variants used across CTAs (**`default`**, **`destructive`**, **`outline`**, **`secondary`**, **`ghost`**, **`size.lg`**) standardize on **`font-sans`**, **`font-medium`**, **`tracking-normal`** (Settings **Sign out** as the reference). Auth surfaces add **client-only** email format checks (**`lib/emailValidation.ts`**) and password inline errors (blur + submit; clear on type) with no API or schema changes.  
**Why:** Inconsistent modal footers, headers, button weight, and auth field feedback read as unfinished; central tokens reduce drift when adding dialogs.  
**Impact:** Prefer reusing the three token exports for new modals/sheets. **`appShellPageTitleClass` applies `uppercase`** — dynamic titles (e.g. play sheet name) render in all caps; change the call site if product wants sentence case for dynamic strings only.

---

## 2026-04-29

**Film `PlayLoggerV2`: My Sheet chips + situational explainer (shipped UX)**  
**Decision:** **Situational** tab shows a **single** explainer line (no **“You’ve been calling…”** header). Copy comes from **`filmLoggerYouveBeenCallingHint`** in **`sideline/lib/coachCopy.ts`**: *“Based on what you've called on {situationLine} at {fieldLine}”* (same `situationLine` / `fieldLine` framing as the sticky drive header). Play rows still come from **`buildSituationAwareCallingSuggestions`** in **`lib/filmLoggerCallingSuggestions.ts`** (this game’s logged coach calls, weighted by scenario, field zone, down & distance, call volume, plus optional **catalog keyword** fills when the list is short). **My Sheet** (when the game has a bound **`play_sheet_id`**) shows a **horizontally scrollable** strip of **all** sheet scenarios (Game Plan–style pills with **n/max** slots), default selection tied to the **derived scenario** for the current snap; **plays for the selected scenario** use the same **`PlayRow`** pattern as **Situational**; subtitle **“Based on {sheet name} play sheet”**. Sheet structure is loaded with existing **`GET /api/playbook/[id]`** (see **`fetchPlaySheetOverview`**); plays for the active chip use existing **`GET /api/playbook/[id]/plays?scenario=…&slim=1`**.  
**Why:** Plan visible at call time; one vocabulary between Film logger and Game Plan; copy stays centralized in **`coachCopy.ts`**.  
**Impact:** **YOUR CALLS** remains valid **onboarding / marketing** language (`ONBOARDING_GAME_DAY_BODY`, **`ONBOARDING_EDITOR_BANNER`**, etc.) for “sheet in the loop”; it is **not** a separate heading inside **My Sheet** today — see **`BUILD_CONTRACT.md`**. Repo search: use **`filmLoggerYouveBeenCallingHint`** (there is no separate **`filmLoggerSituationalTabHint`** export).

---

## 2026-04-24

**Preline removed; shadcn/ui is the component standard**  
**Decision:** By default, interactive primitives (dialogs, dropdowns, tabs, select, buttons) for **new and shared surfaces** ship via **shadcn/ui** on Radix under `sideline/components/ui/`; **Preline** scripts and markup are removed from the app. **Toast** and bespoke surfaces stay on existing Sideline components unless migrated intentionally.  
**Why:** One supported stack, predictable focus/modality behavior, and alignment with Tailwind v4 + CSS variable theming already in `globals.css`.  
**Impact:** New UI work extends shadcn patterns and tokens; `BUILD_CONTRACT.md` and this log supersede older “Preline-first” wording. Tendencies playbook/opponent filters keep **`usePortalDropdown`** + **`z-[70]`** where tab animation stacking still applies. On Film game detail, **end game (final score)** confirmation ships as **Radix `Dialog`** (styled with shared modal tokens as of **2026-04-30**). **Drive setup** and the **full-screen play logger** shell remain **hand-rolled `fixed` overlays** until intentionally migrated to **`Dialog`** — see **`BUILD_CONTRACT.md`** UI rules.

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
- **My Sheet** tab (when the game has a bound sheet): situation chips for the full sheet, calls listed for the selected situation, sheet context in copy — see **2026-04-29** entry.  
- **Situational** tab stays separate: situation-weighted suggestions from this game’s log plus fills; explainer copy in **`filmLoggerYouveBeenCallingHint`** (`coachCopy.ts`) — see **2026-04-29** entry.  
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
**Decision:** Global typography (Barlow family + JetBrains Mono), dark-only UI rules, page layout contract, and **UX Copy & Terminology** live in repo-root `.cursorrules`; shared toast strings in `coachCopy.ts`.  
**Why:** One visual and verbal standard across Film, Game Plan, and Tendencies.  
**Impact:** UI and copy changes default to updating shared components and `.cursorrules`, not one-off strings per page. (Component primitives migrated to **shadcn/ui** — see **2026-04-24** entry.)

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