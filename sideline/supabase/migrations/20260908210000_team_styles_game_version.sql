-- Pass 5: tie team offensive/defensive styles to catalog game_version (cfb26 / cfb27 / …).
-- Existing rows (pre-CFB27 seed) are tagged cfb26. Composite PK allows one style row per team per version.

-- team_offensive_playbooks
alter table team_offensive_playbooks add column if not exists game_version text;
update team_offensive_playbooks set game_version = 'cfb26' where game_version is null;
alter table team_offensive_playbooks alter column game_version set default 'cfb26';
alter table team_offensive_playbooks alter column game_version set not null;

alter table team_offensive_playbooks drop constraint if exists team_offensive_playbooks_pkey;
alter table team_offensive_playbooks add constraint team_offensive_playbooks_pkey primary key (team_name, game_version);

create index if not exists idx_team_offensive_playbooks_playbook_version
  on team_offensive_playbooks (playbook_name, game_version);

-- team_defensive_schemes
alter table team_defensive_schemes add column if not exists game_version text;
update team_defensive_schemes set game_version = 'cfb26' where game_version is null;
alter table team_defensive_schemes alter column game_version set default 'cfb26';
alter table team_defensive_schemes alter column game_version set not null;

alter table team_defensive_schemes drop constraint if exists team_defensive_schemes_pkey;
alter table team_defensive_schemes add constraint team_defensive_schemes_pkey primary key (team_name, game_version);

create index if not exists idx_team_defensive_schemes_scheme_version
  on team_defensive_schemes (defensive_scheme, game_version);
