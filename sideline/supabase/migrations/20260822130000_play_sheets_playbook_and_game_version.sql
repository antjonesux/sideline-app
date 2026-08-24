-- Film Room QA44: consolidate play_sheets playbook column + add game_version.
--
-- NOTE: play_sheets already has a NOT NULL `playbook` column. `cfb26_playbook` was added
-- later as a duplicate. This migration drops the duplicate and adds game_version.
--
-- Backfill strategy (Option A): play_sheets.playbook stores the catalog playbook name
-- (e.g. "Ohio State"), matching playbooks.playbook — NOT an ID.

-- 1. Ensure canonical playbook value (prefer explicit cfb26_playbook when set).
-- Some DBs never had the duplicate column (playbook was always canonical).
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'play_sheets'
      and column_name = 'cfb26_playbook'
  ) then
    update play_sheets
    set playbook = coalesce(nullif(trim(cfb26_playbook), ''), playbook)
    where cfb26_playbook is not null;
  end if;
end $$;

-- 2. Drop duplicate column (no-op when never added)
alter table play_sheets drop column if exists cfb26_playbook;

-- 3. Add game_version (nullable for backfill)
alter table play_sheets add column if not exists game_version text;

-- 4. Derive version from catalog playbooks table (name match on playbooks.playbook)
update play_sheets ps
set game_version = lower(p.game_version)
from (
  select distinct on (playbook) playbook, game_version
  from playbooks
  where playbook is not null
  order by playbook, game_version
) p
where ps.playbook = p.playbook
  and ps.game_version is null;

-- 5. Legacy rows without a catalog match predate CFB27
update play_sheets
set game_version = 'cfb26'
where game_version is null;

-- 6. NOT NULL + default for new rows
alter table play_sheets alter column game_version set default 'cfb27';
alter table play_sheets alter column game_version set not null;
