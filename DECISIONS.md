# Sideline — decision log

Lightweight record of **meaningful** product and architecture choices visible in the repo today. Entries are grounded in **CHANGELOG** and **code**; nothing here is invented history.

Format: **Date** · **Decision** · **Why** · **Impact**

---

## 2026-05-03 — Password recovery email redirect (`/auth/callback?type=recovery`)

**Decision:** **`AuthProvider.resetPassword`** passes **`redirectTo`** **`{origin}/auth/callback?type=recovery`** to **`supabase.auth.resetPasswordForEmail`**. **`app/auth/callback/route.ts`** already treats **`searchParams.get("type") === "recovery"`** as **`/reset-password`** after a successful session exchange; OAuth and other flows keep using **`?next=`** only. Reset-email rate-limit errors surface friendly copy in **`resetPassword`** (not raw Supabase strings). **`sideline/.env.example`** documents whitelisting **`/auth/callback`** per environment (localhost, **`<project>.vercel.app`**, custom domain).

**Why:** Recovery links that land on **`/`** with a **`code`** query were redirected to **`/landing?next=...`** before the app could exchange the session; routing recovery through the public callback path matches **`proxy.ts`** and Supabase’s PKCE flow.

**Impact:** Operators must allow **`/auth/callback`** (path-level) in Supabase Auth redirect URLs for each deployed origin. Changelog: repo-root **`CHANGELOG.md`**, **`sideline/CHANGELOG.md`**, **`BUILD_CONTRACT.md`** (architecture bullet).

---

## 2026-05-02 — UI terminology: “Play Sheet” for `/playbook` (replaces “Game Plan” in product copy)

**Decision:** User-facing labels for the middle bottom-nav pillar and related coach copy use **Play Sheet** (e.g. **`BottomTabNav`**, **`lib/coachCopy.ts`**, playbook page titles, Film game setup “sheet” picker). **Routes stay** **`/playbook`**; no schema or API renames for terminology alone. **`BUILD_CONTRACT.md`** and **`.cursorrules`** use **Play Sheet** for current pillar naming. Older entries in this log may still say **Game Plan** where they record shipped history.

**Why:** Aligns in-app language with how coaches talk about call sheets; “game plan” as a phrase is easy to confuse with the whole game plan vs the situational sheet.

**Impact:** New work and contract docs reference **Play Sheet**; grep/decisions from before this entry are historical. Changelog: follow root **`CHANGELOG.md`** / **`sideline/CHANGELOG.md`** on push.

---

## 2026-05-02 — Bulk CFB26 offensive playbook seed catalog (`lib/seed/playbooks/`)

**Decision:** Ship **additional** offensive playbook seeds as **`sideline/lib/seed/playbooks/{slug}.ts`** modules (**one `TeamPlaybookSeed` per team**). Primary **source** attribution is **cfb.fan** (`source.url` per file). Loading into **`cfb26_plays`** uses existing **`npm run seed:playbook`** / **`scripts/seed-playbooks.ts`**; canonical **`play_type`** storage remains **`RUN` / `PASS` / `RPO`** via **`resolveSeedPlayType`** and **`mapToCanonicalPlayType`** (see **2026-05-02 — Seed playbook script: canonical `play_type` mapping**). Bulk catalog expansion is an explicit product choice—not a requirement to land one school per PR.

**Why:** Early Sideline needs broad, credible offensive vocabulary for Game Plan setup, Film **`PlayBrowser`**, and catalog-backed badges without blocking on dozens of tiny seed PRs.

**Impact:** Operators run **`seed:playbook`** (per slug or **`--all`**) against a project with **`NEXT_PUBLIC_SUPABASE_URL`** + **`SUPABASE_SERVICE_ROLE_KEY`**; **`npm run verify:playbook`** checks seed vs DB after upsert. **`is_new_in_26`** may stay **`false`** where the public source does not expose EA’s new-for-26 flags. In-app logged-play **`playTypeResolution`** is unchanged. Changelog: repo-root **`CHANGELOG.md`**, **`sideline/CHANGELOG.md`**.

---

## 2026-05-02 — Game Plan new play sheet: `/playbook/new`, carousel handoff, legacy `?create=1` redirect

**Decision:** After **`OnboardingCarousel`**, the primary CTA **`router.replace("/playbook/new?onboarding=1")`** (**`HomeOnboardingGate`**). CFB26 playbook selection and first sheet creation run on **`app/playbook/new/page.tsx`** via **`CreatePlaybookModal`** (**`variant="page"`**, **`onboardingFullPage`**, **`guidedOnboardingFlow`**). **`PlaybookHome`** is only the Game Plan list; **Create play sheet** navigates to **`/playbook/new`**. **`app/playbook/page.tsx`** **`redirect`**s **`?create=1`** (optional **`onboarding`**, **`cfb26`**) to **`/playbook/new`** so old deep links keep working. Shared back control **`BackNavLink`** (**`components/shared/BackNavLink.tsx`**, default **`href="/film"`**) replaces the Film-only name **`BackToFilmLink`**.

**Why:** Full-page create matches Film.new; avoids embedding onboarding inside the list route; one back-link primitive for Film and Game Plan parents.

**Impact:** **`BUILD_CONTRACT.md`** authenticated-home and onboarding-chrome bullets updated. Supersedes the carousel URL in **2026-05-01 — Home onboarding: carousel → Game Plan** — prefer **`/playbook/new?onboarding=1`** in new code; **`?create=1`** remains a redirect only.

---

## 2026-05-02 — Seed playbook script: canonical `play_type` mapping for classifier output

**Decision:** **`scripts/seed-playbooks.ts`** **`mapToCanonicalPlayType`** maps full **`SeedPlayType`** labels from **`resolveSeedPlayType`** (**`Option`**, **`Play Action`**, **`Screen`**, etc.) to **`RUN` / `PASS` / `RPO`** for **`cfb26_plays`** upserts, not only substring **`Run` / `Pass` / `RPO`**.

**Why:** Batch playbook seeds often omit per-play **`playType`**; the classifier returns **`SeedPlayType`** enums; previous mapper warned and defaulted many rows to **`RUN`**.

**Impact:** Seed runs align with the shared catalog ladder (**`BUILD_CONTRACT.md`**); unrelated to in-app **`playTypeResolution`** for logged plays.

---

## 2026-05-02 — Marketing `/landing`: full-bleed `main`, viewport-locked hero, themed copy↔CTA spacing

**Decision:** **`html[data-marketing-chrome="true"] main`** (**`BottomTabNav`** on **`/landing`** only) is **full width** (**`max-width: none`**, no horizontal padding on **`main`**); horizontal inset lives on **`components/landing/HeroSection.tsx`** (**`px-4 sm:px-6`**). **`@theme`** in **`app/globals.css`** defines **`--spacing-landing-hero-copy-to-cta: 3rem`** (48px at 16px root); **`HeroSection`** uses it as **`gap`** between the headline/subcopy block and the CTA stack **below `md`**, with **`md:gap-8`** between those groups at **`md+`**. The primary button and **“Already have an account?”** row use **`gap-2`** inside the CTA stack. The hero **`section`** is **`h-dvh max-h-dvh`** with **`overflow-y-hidden`** (single-screen frame); the grid/gradient SVG is **`fixed`** full viewport; content uses **`justify-start`** on small viewports and **`md:justify-center`** for vertical centering; CTAs follow copy (no **`flex-1`** spacer pinning buttons to the bottom). **`buildLoginHref`** and optional **`next`** behavior are unchanged.

**Why:** Marketing should read **edge-to-edge** without changing root **`layout.tsx`** for Film / Game Plan / Tendencies; spacing is centralized in **`globals.css`** so the subcopy→CTA rhythm does not rely on ad hoc **`px`** in JSX.

**Impact:** Supersedes the **“hero top inset remains `HeroSection` `pt-6`”** clause in **2026-04-30 — App shell `<main>` top padding (landing parity)** for **`/landing`** — hero top padding is now **`HeroSection`**’s responsive **`pt-*`** (tighter on narrow widths as part of the no-scroll layout). App routes using **`main`** are unchanged. **`overflow-y-hidden`** can clip content at **large text / zoom**; mitigate later if product requires scroll on this route.

---

## 2026-05-02 — Onboarding screenshot QA: public `/qa/onboarding` prefix, production `notFound`, Playwright

**Decision:** **`app/qa/onboarding/**`** exposes **sessionless** preview routes (carousel, new play sheet, editor shell, logger shell, yardage, first-drive insight) built from **real components** + **typed mock fixtures** (**`lib/onboardingQaFixture.ts`**, **`components/qa/onboarding/*`**). **`sideline/proxy.ts`** **`isPublic`** includes **`pathname.startsWith("/qa/onboarding")`** so unauthenticated requests are **not** sent to **`/landing`**. **`app/qa/onboarding/layout.tsx`** calls **`notFound()`** when **`process.env.NODE_ENV === "production"`** so production builds do not serve the QA frames as product surfaces. **`BottomTabNav`** treats the prefix like other onboarding URLs (**tab bar hidden**, **`data-onboarding-chrome`**). **Playwright** (**`@playwright/test`**, **`playwright.config.ts`**, **`playwright/onboarding-screenshots.spec.ts`**) captures PNGs via **`npm run screenshots:onboarding`** (with **`PLAYWRIGHT_BROWSERS_PATH=0`** in **`package.json`** scripts so browsers install under the repo). **`CreatePlaybookModal`** accepts optional **`qaStaticPlaybooks`** on QA pages only to skip **`GET /api/cfb26-playbooks`**; **`OnboardingCarousel`** accepts optional **`disableAutoAdvance`** for stable slides.

**Why:** Repeatable visual QA of onboarding without signing in or writing scaffold rows to Supabase; production must not expose QA as navigable product.

**Impact:** New **`/qa/onboarding/…`** pages must stay **mock-only**, remain under the segment **`layout`** gate, and stay absent from normal nav. If **`proxy`** public rules change, keep this prefix consistent with **`BUILD_CONTRACT.md`**. Do not use **`qaStaticPlaybooks`** / **`disableAutoAdvance`** from production user flows — defaults elsewhere must stay safe.

---

## 2026-05-02 — Guided first-drive insight: full-viewport `Dialog` shell

**Decision:** **`GuidedFirstDriveInsight`** ships as a **full-viewport** **Radix `Dialog`** — **`fixed inset-0`**, **`h-[100dvh]`**, **`max-w-none`**, **`rounded-none`**, **`border-slate-800` / `bg-slate-950`** — with **DialogContent** motion overrides so it does not use the default centered-dialog slide. The previous **bottom-sheet on small screens + centered `sm:max-w-lg` card on larger breakpoints** layout is **removed**; the readout is immersive at **all** viewports.

**Why:** The first-drive breakdown is the capstone of guided onboarding; it should feel like the same **full-bleed guided step** family as the Game Plan onboarding shell (tab bar already hidden for **`?guided=1`**), not a dismissible floating modal on desktop.

**Impact:** Desktop coaches see edge-to-edge readout + CTAs; dismissal stays **CTA-only** (no backdrop tap / Esc — unchanged). **`BUILD_CONTRACT.md`** Product intent and UI rules document this shell. Future guided overlays should match this pattern unless product explicitly chooses a different density.

---

## 2026-05-02 — Shared `PlaySheetSituationChipScroll` (Film My Sheet + Game Plan mobile)

**Decision:** Full-bleed horizontal **n/max** situation pills for **Game Plan** mobile (**`SituationList`**) and **Film** **`PlayLoggerV2`** **My Sheet** live in **`components/shared/PlaySheetSituationChipScroll.tsx`**: **`ms/me [calc(50%-50vw)]`**, **`w-screen`**, **`max-w-[100vw]`**, scroll row with **leading/trailing spacers** sized to **`main`** (**`max-w-3xl`** + **`px-4` / `sm:px-6`** − flex **`gap-2`**). **`hideFromLg`** hides the strip at **`lg+`** on Game Plan (desktop sidebar). **`tabSemantics`** uses **`role="tablist"`** and per-chip **`role="tab"`** + **`aria-selected`** for **My Sheet** inside Radix **`Tabs`**; otherwise the scroll row is a **`nav`** labeled **Situations**.

**Why:** **`BUILD_CONTRACT.md`** ties Film **My Sheet** chips to Game Plan vocabulary and layout; one module avoids duplicated viewport math and keeps both surfaces aligned when the shell changes.

**Impact:** Spacer / bleed tweaks happen only in **`PlaySheetSituationChipScroll`** (or a future shared token if **`layout.tsx`** and this component drift). **`CHANGELOG.md`** (root + **`sideline/CHANGELOG.md`**) records the ship.

---

## 2026-05-02 — Game Plan: 10 default sheet slots per situation; suggestions UI + API play types; mobile situation strip alignment

**Decision:** Default max offensive calls per sheet situation (everything except **Opening Script** and the 2-/4-minute buckets) is **10**, via **`PLAY_SHEET_SCENARIO_MAX_DEFAULT`** and **`scenarioMaxSlots`** in **`lib/playbookUtils.ts`** — same helper used by **`POST /api/playbook/[id]/plays`**, **`SituationList`**, **`PlaybookEditor`**, and Film **`PlayLoggerV2`** **My Sheet** chip caps. **Suggested plays** on the sheet editor use a **Tendencies top-plays-style** row (rank, formation → play, metrics row with **avg yards** and call count, **RUN/PASS/RPO** badge from **`cfb26_plays`**); **`GET /api/playbook/[id]/plays`** attaches **`play_type`** on each suggestion using **`resolveCfbDisplayPlayType`** and the existing type map. **Add / Replace** on a suggestion is an **icon** control with **`aria-label`**. Mobile **Game Plan** situation pills use **`PlaySheetSituationChipScroll`** (see chip-scroll entry above).

**Why:** Five-slot ceilings were tight for real situational depth; suggestions should read as the same coaching data vocabulary as Tendencies rows; play-type badges must stay on the shared catalog ladder; mobile chips should use horizontal edge without breaking alignment with titles and body copy.

**Impact:** Shell alignment math is owned by **`PlaySheetSituationChipScroll`** (see **2026-05-02 — Shared `PlaySheetSituationChipScroll`**). Suggestion **rank order** still comes from **`buildSuggestions`** success / smoothed scoring even though the row highlights **avg yds** — if product wants strict “sort by what we show,” adjust **`buildSuggestions`** or add explicit copy. **`CHANGELOG.md`** (root + **`sideline/CHANGELOG.md`**) records the ship.

---

## 2026-05-02 — Film game detail tendencies: TOP PLAYS / TOP FORMATIONS / PLAYS TO RECONSIDER (no formations table)

**Decision:** The in-game **Tendencies** tab on **`FilmGameTendenciesBody`** removes the expandable **FORMATIONS** table (**`GameFormationTable`**, **`formationAggTableColumns`** — files deleted). **GAME STATS** is a **3×2** card grid. **TOP PLAYS**, **TOP FORMATIONS**, and **PLAYS TO RECONSIDER** reuse **`TopPlaysList`**, **`TopFormationsList`**, and **`ReconsiderPlays`**; rankings come from **`lib/gameTendenciesWhatsWorking.ts`** (**`summarizeGameWhatsWorking`**) calling the same **`tendenciesServer`** helpers as **`/api/tendencies/top-plays`** and **`/api/tendencies/top-formations`**, over plays already returned on **`GET /api/tendencies/game/[id]`** (**`drives` → client `useMemo`** — **no new route**). **BY SITUATION** stays on **`DataTable`** with **`equalColumnsCompact`**.

**Why:** Single-game tab prioritized mid-game/post-game insight density over the formation accordion table; align “what’s working” mentally with the cross-game Tendencies tab without duplicating aggregation rules in a new API.

**Impact:** Do not resurrect **`GameFormationTable`** for this tab without an explicit product decision. If **`top-plays`** / **`top-formations`** aggregation or reconsider rules change, update **`summarizeGameWhatsWorking`** (or move the summary into **`buildTendenciesGamePayload`** / the game route) to avoid silent drift. **2026-04-30** entry below remains authoritative for **`DataTable`** primitives and **BY SITUATION** layout; its **FORMATIONS** narrative is **historical** after this entry.

---

## 2026-05-01 — Home onboarding gate: conservative handling when counts fail

**Decision:** **`HomeOnboardingGate`** treats **either** Supabase head **`count`** error (**`game_sessions`** or **`play_sheets`**) as **unknown eligibility**: log the error, set redirect phase, and **`router.replace("/film`)**. The gate **does not** assume an empty account or show the carousel when counts fail.

**Why:** A failed query does not prove the coach has no games or sheets; sending them into onboarding or trusting zero counts can mis-route experienced users (RLS, network, transient API failures).

**Impact:** Matches **`BUILD_CONTRACT.md`** (authenticated home); keep this path unless product explicitly chooses “fail open” to onboarding with documented trade-offs.

---

## 2026-05-01 — Home onboarding: carousel → Game Plan (no duplicate CFB26 step on `/`)

**Decision:** After **`OnboardingCarousel`**, the primary CTA navigates to Game Plan so CFB26 playbook selection and first sheet creation happen in **`CreatePlaybookModal`** (**`onboardingFullPage`**, **`guidedOnboardingFlow`**) — there is **no** second “pick playbook” screen on **`/`**.

**Why:** Removes duplicate onboarding steps; the Game Plan create flow already owns catalog pick + create.

**Impact:** **`BUILD_CONTRACT.md`** authenticated-home bullet documents this handoff. **Updated 2026-05-02:** the CTA URL is **`/playbook/new?onboarding=1`** (full page); **`PlaybookHome`** is no longer the onboarding frame. Legacy **`/playbook?create=1&onboarding=1`** **`redirect`**s to **`/playbook/new?…`** — see **2026-05-02 — Game Plan new play sheet**.

---

## 2026-05-01 — Guided Film logger: My Sheet chip vs derived snap (onboarding-only)

**Decision:** When **`PlayLoggerV2`** receives **`guidedOnboarding`** (Film **`?guided=1`**), it **does not** run the usual **`useLayoutEffect`** that resets **`mySheetSelectedScenario`** to the engine’s **`scenarioLabel`** for the current snap while **My Sheet** is active. Instead it bootstraps **My Sheet** from **`guidedMySheetScenario`** (URL **`sheetScenario`**, else **`GUIDED_ONBOARDING_EDITOR_SCENARIO`** in **`coachCopy.ts`**). After a successful log, guided mode nudges the tab back to **My Sheet** when the pick came from the sheet, otherwise **Situational**.

**Why:** In guided onboarding the coach just built calls in one Game Plan situation; snapping the chip to the live down/distance would empty **My Sheet** and kill momentum before the first readout.

**Impact:** This is an **intentional exception** to **2026-04-29** (“default selection tied to the **derived scenario** for the current snap”) **only** when **`guidedOnboarding`** is true. Normal Film logging behavior is unchanged when those props are unset.

---

## 2026-04-30 — App shell `<main>` top padding (landing parity)

**Decision:** Root **`sideline/app/layout.tsx`** `<main>` uses **`pt-6`** at all breakpoints (replacing **`pt-4 sm:pt-6`**). **`/landing`:** **`html[data-marketing-chrome="true"] main`** in **`globals.css`** keeps **`padding-top: 0`**; marketing hero inset and bleed are owned by **`HeroSection`** (see **2026-05-02 — Marketing `/landing`: full-bleed `main`, viewport-locked hero, themed copy↔CTA spacing** — no longer a fixed **`pt-6`**-only rule on the hero).

**Why:** Bottom-nav surfaces (Film Room, Game Plan, Tendencies) and settings read visually tighter than the marketing hero on narrow viewports; matching **`pt-6`** on the shared shell aligns rhythm without copying utilities onto each page.

**Impact:** Every route that uses root **`main`** (including auth and film import) shares the same top inset; future tweaks stay in **`layout.tsx`**. Marketing **`/landing`** layout and bottom safe-area overrides (**`data-marketing-chrome`**) are documented in the **2026-05-02** marketing entry above.

---

## 2026-04-30 — Film game tendencies tables + shared DataTable layout

**Film game detail → Tendencies** (`FilmGameTendenciesBody`, `GameFormationTable`): **BY SITUATION** uses **`DataTable`** **`equalColumnsCompact`** so **`equalColumns`** tables can shrink without the default **`min-w-[520px]`** floor when the card has room; situation labels **`truncate`** with **`title`** for full text on hover/focus. **FORMATIONS** outer table uses **`containedWidth`** (**`w-full table-fixed min-w-0`**) so **`renderAfterRow`** / colspan accordion content does not balloon **`w-max`** intrinsic width (fixes runaway horizontal scroll). Expanded formation plays reuse **`drivePlayTableColumns({ includeSpot: false })`** — **no SPOT column** in that drill-down only; primary Film drive tables, import previews, and other callers keep **SPOT** and **`drivePlayTableColumns()`** defaults (**see 2026-04-21** ending-field / SPOT decision for canonical drive-table shape). Nested accordion table uses **`dense`** + **`equalColumnsCompact`**; **RESULT** keeps trailing horizontal gutter (**`pr-*`** on badge wrapper); **YDS** is **right-aligned** when **SPOT** is omitted to separate yard values from badges. **`DataTable`** adds optional column **`headerClassName`** / **`cellClassName`** and props **`equalColumnsCompact`**, **`containedWidth`**, **`dense`**; colspan expansion cells use **`min-w-0 max-w-full`**.

**Why:** Tendencies formation accordion and BY SITUATION tables overflowed horizontally without improving coaching signal; fixes belong in the shared table primitive with opt-in flags rather than duplicate table markup.

**Impact (updated 2026-05-02):** The **FORMATIONS** accordion / **`GameFormationTable`** / **`formationAggTableColumns`** path described above was **removed** from Film game in-game tendencies; current UX is **2026-05-02 — Film game detail tendencies: TOP PLAYS / TOP FORMATIONS / PLAYS TO RECONSIDER**. **BY SITUATION** and the shared **`DataTable`** options (**`equalColumnsCompact`**, **`containedWidth`**, **`dense`**, etc.) remain valid for **`FilmGameTendenciesBody`** and other callers. Defaults unchanged for existing **`DataTable`** callers. The deleted formation drill-down omitted **SPOT** in nested rows for density — that trade-off no longer applies on this tab; primary Film drive tables and **`drivePlayTableColumns()`** defaults (**2026-04-21** SPOT / ending-field) are unchanged elsewhere.

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

- **Navigation labels:** Bottom nav: Film Room | Play Sheet | Tendencies. Game details tabs: Drive Summary | Tendencies. Tendencies sub-tabs: What’s Working | Am I Predictable? — fixed strings per `.cursorrules`.
- **API response shapes:** New routes should follow `.cursorrules` (`{ data }` / `{ error }`, explicit selects); legacy endpoints may still return arrays or legacy keys until touched.
- **Node / Next:** App targets **Node ≥ 20**, Next **16.x** stack as declared in `sideline/package.json` — verify against `node_modules/next` docs when APIs feel unfamiliar.

---

## When to update this file

Update `DECISIONS.md` only when:
- a meaningful product or architectural decision is made
- a previous decision is intentionally changed or reversed

Do not log minor implementation details or temporary choices.