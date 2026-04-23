-- Enable Row Level Security on all user-facing tables and add owner-scoped
-- policies so authenticated users can only access their own rows.
-- Reference/catalog tables that lack RLS are hardened with public-read-only.

-- ============================================================
-- 1. User-owned tables: enable RLS + owner-scoped FOR ALL policy
-- ============================================================

-- user_profiles
alter table user_profiles enable row level security;
drop policy if exists "Owner access" on user_profiles;
create policy "Owner access" on user_profiles
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- game_sessions (previously had RLS disabled)
alter table game_sessions enable row level security;
drop policy if exists "Owner access" on game_sessions;
create policy "Owner access" on game_sessions
  for all to authenticated
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and (play_sheet_id is null or exists (select 1 from play_sheets ps where ps.id = play_sheet_id and ps.user_id = auth.uid()))
  );

-- drives (previously had RLS disabled)
alter table drives enable row level security;
drop policy if exists "Owner access" on drives;
create policy "Owner access" on drives
  for all to authenticated
  using (
    auth.uid() = user_id
    and exists (select 1 from game_sessions gs where gs.id = game_session_id and gs.user_id = auth.uid())
  )
  with check (
    auth.uid() = user_id
    and exists (select 1 from game_sessions gs where gs.id = game_session_id and gs.user_id = auth.uid())
  );

-- logged_plays (previously had RLS disabled)
alter table logged_plays enable row level security;
drop policy if exists "Owner access" on logged_plays;
create policy "Owner access" on logged_plays
  for all to authenticated
  using (
    auth.uid() = user_id
    and exists (select 1 from game_sessions gs where gs.id = game_session_id and gs.user_id = auth.uid())
    and exists (select 1 from drives d where d.id = drive_id and d.user_id = auth.uid() and d.game_session_id = game_session_id)
  )
  with check (
    auth.uid() = user_id
    and exists (select 1 from game_sessions gs where gs.id = game_session_id and gs.user_id = auth.uid())
    and exists (select 1 from drives d where d.id = drive_id and d.user_id = auth.uid() and d.game_session_id = game_session_id)
  );

-- play_sheets
alter table play_sheets enable row level security;
drop policy if exists "Owner access" on play_sheets;
create policy "Owner access" on play_sheets
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- play_sheet_scenarios
alter table play_sheet_scenarios enable row level security;
drop policy if exists "Owner access" on play_sheet_scenarios;
create policy "Owner access" on play_sheet_scenarios
  for all to authenticated
  using (
    auth.uid() = user_id
    and exists (select 1 from play_sheets ps where ps.id = play_sheet_id and ps.user_id = auth.uid())
  )
  with check (
    auth.uid() = user_id
    and exists (select 1 from play_sheets ps where ps.id = play_sheet_id and ps.user_id = auth.uid())
  );

-- play_sheet_plays
alter table play_sheet_plays enable row level security;
drop policy if exists "Owner access" on play_sheet_plays;
create policy "Owner access" on play_sheet_plays
  for all to authenticated
  using (
    auth.uid() = user_id
    and exists (select 1 from play_sheet_scenarios pss where pss.id = scenario_id and pss.user_id = auth.uid())
  )
  with check (
    auth.uid() = user_id
    and exists (select 1 from play_sheet_scenarios pss where pss.id = scenario_id and pss.user_id = auth.uid())
  );

-- dismissed_suggestions
alter table dismissed_suggestions enable row level security;
drop policy if exists "Owner access" on dismissed_suggestions;
create policy "Owner access" on dismissed_suggestions
  for all to authenticated
  using (
    auth.uid() = user_id
    and exists (select 1 from play_sheets ps where ps.id = play_sheet_id and ps.user_id = auth.uid())
  )
  with check (
    auth.uid() = user_id
    and exists (select 1 from play_sheets ps where ps.id = play_sheet_id and ps.user_id = auth.uid())
  );

-- ============================================================
-- 2. Shared/catalog tables: ensure RLS enabled + public read
--    (cfb26_plays, team_offensive_playbooks, team_defensive_schemes
--     already declared in schema.sql but never captured in a migration)
-- ============================================================

alter table cfb26_plays enable row level security;
drop policy if exists "Allow public read" on cfb26_plays;
create policy "Allow public read" on cfb26_plays
  for select using (true);

alter table team_offensive_playbooks enable row level security;
drop policy if exists "Allow public read" on team_offensive_playbooks;
create policy "Allow public read" on team_offensive_playbooks
  for select using (true);

alter table team_defensive_schemes enable row level security;
drop policy if exists "Allow public read" on team_defensive_schemes;
create policy "Allow public read" on team_defensive_schemes
  for select using (true);

alter table scheme_play_weights enable row level security;
drop policy if exists "Allow public read" on scheme_play_weights;
create policy "Allow public read" on scheme_play_weights
  for select using (true);
