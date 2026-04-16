# Changelog — April 15, 2026

**Version:** `2026.04.15`  
**Git:** `0ed9bf3` on `main`

Release notes for the bundle pushed after this date. The Next.js app lives in `sideline/`.

---

## Summary

Tendencies gains scouting-style reports and richer “what’s working” / “reconsider” metrics; playbook management adds edit flows and consistent card actions; film and CSV import UIs get layout and component polish; shared primitives (kebab menus, destructive confirm, drive/play table) support the patterns in `.cursorrules`.

---

## Added

- **Scouting report** — `ScoutingReport`, `ScoutingReportSection`, `ScoutingFormationsReport`, plus `scoutingCoachingCopy` for coaching-oriented copy.
- **Rank metrics & pagination** — `WorkingRankMetrics`, `ReconsiderRankMetrics`, `WorkingListPagination` for tendencies lists.
- **Shared UI** — `CardKebabMenu`, `ConfirmDestructiveModal`, `DrivePlayTable`.
- **Playbook** — `EditPlaybookModal` and expanded `PlaybookCard` actions.
- **Libs** — `loggedPlaySuccess.ts` for success-rate style helpers aligned with tendencies.

## Changed

- **Tendencies** — `TendenciesHome`, filters, top formations/plays, game breakdown, predictability, motion, play type, ranked rows, what’s working, reconsider plays; server aggregation in `tendenciesServer.ts` and related API routes (`route.ts`, `predictability`, `top-formations`, `top-plays`).
- **Film** — `film/[gameId]/page.tsx` refactor; `FilmGameCard`, `TeamCombobox`; import preview/confirmation/template tweaks.
- **Playbook** — `PlaybookEditor`, `PlaybookHome`, `CreatePlaybookModal`, `PlaySlot`, `PlaySuggestions`, `SituationList`, `AddPlayDrawer`; `GET/PATCH` playbook API routes.
- **App shell** — `layout.tsx`, `globals.css`, `BottomTabNav`, `BackToFilmLink`, `Toast`.
- **Tailwind** — `tailwind.config.js` updates aligned with design tokens.

## Removed

- **`SituationTendencies.tsx`** — functionality folded into the updated tendencies home / reports layout.

---

## Notes

- For full project history see [CHANGELOG.md](./CHANGELOG.md).
