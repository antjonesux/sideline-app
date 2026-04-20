-- Map granular `cfb26_plays.play_type` labels (e.g. Medium Pass) to badge values RUN | PASS | RPO on `logged_plays`.
-- Matches the TypeScript ladder in `resolveCfbDisplayPlayType` / `categorizeCfbPlayType` for common seed labels.

create or replace function map_cfb_granular_type_to_badge(p_type text) returns text
language sql
stable
as $$
  select case
    when p_type is null or trim(p_type) = '' then 'RUN'
    when upper(trim(p_type)) in ('RUN', 'PASS', 'RPO') then upper(trim(p_type))
    when lower(trim(p_type)) = 'rpo' then 'RPO'
    when lower(trim(p_type)) in (
      'medium pass', 'deep pass', 'quick pass', 'play action', 'screen'
    ) then 'PASS'
    when lower(trim(p_type)) in (
      'inside run', 'outside run', 'option', 'qb run'
    ) then 'RUN'
    when lower(trim(p_type)) like '%rpo%' then 'RPO'
    when lower(trim(p_type)) like '%pass%'
      and lower(trim(p_type)) not like '%rpo%' then 'PASS'
    when lower(trim(p_type)) like '%run%' or lower(trim(p_type)) = 'option' then 'RUN'
    else 'RUN'
  end;
$$;

update logged_plays lp
set play_type = map_cfb_granular_type_to_badge(
  (
    select cp.play_type
    from cfb26_plays cp
    where lower(trim(cp.play_name)) = lower(trim(lp.play_name))
      and lower(trim(cp.formation)) = lower(trim(lp.formation))
      and lower(trim(cp.playbook)) = lower(trim(
        coalesce(nullif(trim(gs.offensive_playbook), ''), trim(gs.my_playbook))
      ))
    limit 1
  )
)
from game_sessions gs
where lp.game_session_id = gs.id;

update logged_plays
set play_type = 'RUN'
where play_type is null or trim(play_type) = '' or upper(trim(play_type)) not in ('RUN', 'PASS', 'RPO');
