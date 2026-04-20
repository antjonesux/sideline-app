-- Align `logged_plays.play_type` with `cfb26_plays` using the same LOWER(TRIM()) triple as Tendencies SQL reference.
-- Exposes `resolve_play_type` for maintenance queries; app routes use `fetchCfbPlayTypeMap` in TypeScript.

alter table logged_plays add column if not exists play_type text;

create or replace function resolve_play_type(
  p_play_name text,
  p_formation text,
  p_playbook text,
  p_fallback text default 'RUN'
) returns text
language sql
stable
as $$
  select coalesce(
    (
      select cp.play_type
      from cfb26_plays cp
      where lower(trim(cp.play_name)) = lower(trim(p_play_name))
        and lower(trim(cp.formation)) = lower(trim(p_formation))
        and lower(trim(cp.playbook)) = lower(trim(p_playbook))
      limit 1
    ),
    nullif(trim(p_fallback), '')
  );
$$;

update logged_plays lp
set play_type = coalesce(
  resolve_play_type(
    lp.play_name,
    lp.formation,
    trim(coalesce(nullif(trim(gs.offensive_playbook), ''), trim(gs.my_playbook))),
    'RUN'
  ),
  'RUN'
)
from game_sessions gs
where lp.game_session_id = gs.id;

update logged_plays
set play_type = 'RUN'
where play_type is null or trim(play_type) = '' or upper(trim(play_type)) not in ('RUN', 'PASS', 'RPO');

alter table logged_plays alter column play_type set default 'RUN';

alter table logged_plays drop constraint if exists logged_plays_play_type_check;
alter table logged_plays add constraint logged_plays_play_type_check
  check (play_type in ('RUN', 'PASS', 'RPO'));

alter table logged_plays alter column play_type set not null;
