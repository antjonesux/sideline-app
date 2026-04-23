-- Add user_id ownership columns to all user-owned tables, backfill from
-- the first auth.users row (single-developer migration), then enforce NOT NULL.
-- No RLS policies are created in this migration.

-- Step 1: Add nullable user_id columns with FK to auth.users(id).

alter table game_sessions
  add column if not exists user_id uuid references auth.users(id);

alter table drives
  add column if not exists user_id uuid references auth.users(id);

alter table logged_plays
  add column if not exists user_id uuid references auth.users(id);

alter table play_sheets
  add column if not exists user_id uuid references auth.users(id);

alter table play_sheet_scenarios
  add column if not exists user_id uuid references auth.users(id);

alter table play_sheet_plays
  add column if not exists user_id uuid references auth.users(id);

alter table dismissed_suggestions
  add column if not exists user_id uuid references auth.users(id);

alter table user_profiles
  add column if not exists user_id uuid references auth.users(id);

-- Step 2: Backfill all existing rows with the explicit developer UID.
-- Uses a single DO block so the migration fails atomically if the UID is missing.

do $$
declare
  dev_uid uuid := '09605c61-f181-40a4-a86b-788410d0a2ec';
begin
  if not exists (select 1 from auth.users where id = dev_uid) then
    raise exception 'Developer UID % not found in auth.users — cannot backfill ownership.', dev_uid;
  end if;

  -- Root tables
  update game_sessions  set user_id = dev_uid where user_id is null;
  update play_sheets    set user_id = dev_uid where user_id is null;
  update user_profiles  set user_id = dev_uid where user_id is null;

  -- Child tables (inherit from parent joins, but set directly for simplicity)
  update drives               set user_id = dev_uid where user_id is null;
  update logged_plays         set user_id = dev_uid where user_id is null;
  update play_sheet_scenarios set user_id = dev_uid where user_id is null;
  update play_sheet_plays     set user_id = dev_uid where user_id is null;
  update dismissed_suggestions set user_id = dev_uid where user_id is null;
end
$$;

-- Step 3: Enforce NOT NULL now that every row has a valid user_id.

alter table game_sessions       alter column user_id set not null;
alter table drives              alter column user_id set not null;
alter table logged_plays        alter column user_id set not null;
alter table play_sheets         alter column user_id set not null;
alter table play_sheet_scenarios alter column user_id set not null;
alter table play_sheet_plays    alter column user_id set not null;
alter table dismissed_suggestions alter column user_id set not null;
alter table user_profiles       alter column user_id set not null;

-- Step 4: Index user_id on root tables for future RLS filter performance.

create index if not exists idx_game_sessions_user  on game_sessions(user_id);
create index if not exists idx_play_sheets_user    on play_sheets(user_id);
create index if not exists idx_drives_user         on drives(user_id);
create index if not exists idx_logged_plays_user   on logged_plays(user_id);
