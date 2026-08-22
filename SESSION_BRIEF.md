# SESSION BRIEF — Film Room Pass 1: session list + creation flow

**Objective:**  
Migrate the Film Room session list and creation flow into the new app shell, with streamlined session creation (auto-generated name, offense default, recency-surfaced teams, no opponent playbook).

**Why this matters:**  
This is the front door to Film Room. Pass 2–4 all depend on this surface being solid in the new shell.

**In scope:**  
- Session list (`/film`), create (`/film/new`), FilmGameCard, EditGameDetailsModal, TeamCombobox, GameStatsInline, games POST/PATCH, recent teams via game_sessions + lastGamePrefsStore patterns

**Out of scope:**  
- Game detail, logger, tendencies (Passes 2–4); CSV import (parked); opponent playbook selection; schema changes

**Done means:**  
- [x] Session list in app shell with cards, empty state, edit/delete, no import CTAs  
- [x] Create: side defaults Offense; auto session name; no opponent playbook; recent teams  
- [x] Edit modal matches stripped creation  
- [x] `npm run build` passes; reviews approved  

**Handoff notes:**  
- **Files touched:** `app/film/page.tsx`, `app/film/new/page.tsx`, `app/film/loading.tsx` (unchanged pattern), `components/film/{FilmGameCard,EditGameDetailsModal,TeamCombobox,GameStatsInline}.tsx`, `app/api/games/route.ts`, `app/api/games/[id]/route.ts` (optional opponent_scheme via omit/empty), deleted `app/film/new/preview/`, `CHANGELOG.md`  
- **Patterns reused:** AppShellMenuHeader, PageSkeleton/FilmRoomSkeleton, BackNavLink, Breadcrumb, CardKebabMenu, ConfirmDestructiveModal, toastStore, coachCopy, generic-playbooks sections  
- **Open risks / gaps:** Session name is UI-only (no DB column — card title remains `my_playbook` vs `opponent_team`). Defense-only stores D scheme in `offensive_playbook`/`my_scheme`. Both-side optional D book reuses `opponent_scheme`. FilmGameCard still labels playbook as “Offense Used”.  
- **Notes for Pass 2:** Game detail should read side/D metadata carefully; consider card copy for defense sessions; do not revive import entry points; preserve empty `opponent_scheme` semantics vs Both coach-D reuse.
