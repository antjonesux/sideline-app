-- Film Room QA42: game version filter + defensive call sheet association on sessions.
alter table game_sessions
  add column if not exists game_version text;

-- Legacy sessions pre-date CFB27; backfill as cfb26 before NOT NULL/default.
update game_sessions
  set game_version = 'cfb26'
  where game_version is null;

alter table game_sessions
  alter column game_version set default 'cfb27';

alter table game_sessions
  alter column game_version set not null;

-- Correct rows that received a blanket cfb27 default when the column was added (QA43).
update game_sessions
  set game_version = 'cfb26'
  where game_version = 'cfb27'
    and play_sheet_id is null
    and defensive_play_sheet_id is null;

alter table game_sessions
  add column if not exists defensive_play_sheet_id uuid references play_sheets(id) on delete set null;

-- Extend owner policy so defensive play sheet must belong to the same user.
drop policy if exists "Owner access" on game_sessions;
create policy "Owner access" on game_sessions for all to authenticated
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and (
      play_sheet_id is null
      or exists (select 1 from play_sheets ps where ps.id = play_sheet_id and ps.user_id = auth.uid())
    )
    and (
      defensive_play_sheet_id is null
      or exists (select 1 from play_sheets ps where ps.id = defensive_play_sheet_id and ps.user_id = auth.uid())
    )
  );
