create extension if not exists pgcrypto;

create table if not exists user_profiles (
  id uuid primary key default gen_random_uuid(),
  playbook text not null,
  scheme text not null,
  created_at timestamptz default now()
);

create table if not exists game_sessions (
  id uuid primary key default gen_random_uuid(),
  my_playbook text not null,
  my_scheme text not null,
  opponent_team text not null,
  opponent_scheme text not null,
  game_date date not null,
  my_score int,
  opponent_score int,
  result text check (result in ('W', 'L')),
  quarter_started_logging int check (quarter_started_logging between 1 and 4),
  is_partial_log boolean default false,
  created_at timestamptz default now()
);

-- Older deployments: `create table if not exists` skips new columns. Keep remote DB in sync with the app.
alter table game_sessions add column if not exists quarter_started_logging int check (quarter_started_logging between 1 and 4);
alter table game_sessions add column if not exists is_partial_log boolean default false;
alter table game_sessions add column if not exists import_source text default 'live';
alter table game_sessions add column if not exists offensive_playbook text;
alter table game_sessions add column if not exists ended_at timestamptz;

create table if not exists drives (
  id uuid primary key default gen_random_uuid(),
  game_session_id uuid not null references game_sessions(id) on delete cascade,
  drive_number int not null,
  quarter int,
  time_remaining text,
  starting_yard_line int,
  starting_side text check (starting_side in ('OWN', 'OPP')),
  score_mine int,
  score_opponent int,
  note text,
  created_at timestamptz default now()
);

create table if not exists logged_plays (
  id uuid primary key default gen_random_uuid(),
  drive_id uuid not null references drives(id) on delete cascade,
  game_session_id uuid not null references game_sessions(id) on delete cascade,
  play_number int not null,
  down int not null check (down between 1 and 4),
  distance int not null check (distance >= 1),
  yard_line int not null check (yard_line between 1 and 50),
  side text not null check (side in ('OWN', 'OPP')),
  hash text not null check (hash in ('LEFT', 'MIDDLE', 'RIGHT')),
  field_zone text not null,
  scenario text not null,
  formation text not null,
  play_name text not null,
  yards_gained int default 0,
  result_tag text not null check (result_tag in ('FIRST_DOWN', 'TOUCHDOWN', 'GAIN', 'NO_GAIN', 'INCOMPLETE', 'SACK', 'LOSS', 'TURNOVER', 'PUNT', 'FIELD_GOAL', 'OUT_OF_BOUNDS')),
  is_success boolean generated always as (result_tag in ('FIRST_DOWN', 'TOUCHDOWN')) stored,
  note text,
  opponent_scheme text not null,
  created_at timestamptz default now()
);

alter table logged_plays add column if not exists drive_number int;

create table if not exists play_sheets (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  playbook text not null,
  scheme text not null,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table play_sheets add column if not exists cfb26_playbook text;
update play_sheets set cfb26_playbook = playbook where cfb26_playbook is null;

create table if not exists play_sheet_scenarios (
  id uuid primary key default gen_random_uuid(),
  play_sheet_id uuid not null references play_sheets(id) on delete cascade,
  scenario text not null,
  scenario_order int not null,
  unique(play_sheet_id, scenario)
);

create table if not exists play_sheet_plays (
  id uuid primary key default gen_random_uuid(),
  scenario_id uuid not null references play_sheet_scenarios(id) on delete cascade,
  play_order int not null,
  formation text not null,
  play_name text not null,
  script_note text
);

create table if not exists cfb26_plays (
  id uuid primary key default gen_random_uuid(),
  playbook text not null,
  formation text not null,
  formation_type text not null,
  play_name text not null,
  play_type text not null,
  is_new_in_26 boolean default false
);

create table if not exists scheme_play_weights (
  id uuid primary key default gen_random_uuid(),
  scheme text not null,
  play_type text not null,
  weight decimal not null,
  suppress boolean default false
);

create table if not exists dismissed_suggestions (
  id uuid primary key default gen_random_uuid(),
  play_sheet_id uuid not null references play_sheets(id) on delete cascade,
  scenario text not null,
  formation text not null,
  play_name text not null,
  dismissed_at timestamptz default now(),
  dismiss_until_game_count int default 5
);

create table if not exists team_offensive_playbooks (
  team_name text primary key,
  playbook_name text not null,
  scheme_style text not null
);

create table if not exists team_defensive_schemes (
  team_name text primary key,
  defensive_scheme text not null
);

create index if not exists idx_logged_plays_lookup on logged_plays (scenario, formation, play_name, hash);
create index if not exists idx_logged_plays_game on logged_plays (game_session_id);
create index if not exists idx_drives_game on drives (game_session_id);

create or replace function derive_field_zone(input_yard_line int, input_side text)
returns text language plpgsql immutable as $$
begin
  if input_side = 'OPP' and input_yard_line <= 5 then return 'GOAL_LINE'; end if;
  if input_side = 'OPP' and input_yard_line <= 20 then return 'RED_ZONE'; end if;
  if input_side = 'OPP' and input_yard_line <= 39 then return 'SCORING'; end if;
  if input_side = 'OPP' or (input_side = 'OWN' and input_yard_line >= 40) then return 'MIDFIELD'; end if;
  if input_side = 'OWN' and input_yard_line >= 11 then return 'OWN_TERRITORY'; end if;
  return 'BACKED_UP';
end;
$$;

create or replace function derive_scenario(input_down int, input_distance int, input_field_zone text)
returns text language plpgsql immutable as $$
begin
  if input_field_zone = 'GOAL_LINE' then return 'Goal Line'; end if;
  if input_field_zone = 'RED_ZONE' and input_down = 1 then return 'Red Zone'; end if;
  if input_field_zone = 'BACKED_UP' then return 'Backed Up'; end if;
  if input_down = 4 then return '4th Down'; end if;
  if input_down = 1 then return '1st Down'; end if;
  if input_down = 2 and input_distance <= 3 then return '2nd & Short'; end if;
  if input_down = 2 and input_distance <= 7 then return '2nd & Medium'; end if;
  if input_down = 2 then return '2nd & Long'; end if;
  if input_down = 3 and input_distance <= 3 then return '3rd & Short'; end if;
  if input_down = 3 and input_distance <= 6 then return '3rd & Medium'; end if;
  return '3rd & Long';
end;
$$;

create or replace function set_logged_play_context()
returns trigger language plpgsql as $$
begin
  new.field_zone := derive_field_zone(new.yard_line, new.side);
  new.scenario := derive_scenario(new.down, new.distance, new.field_zone);
  return new;
end;
$$;

drop trigger if exists trg_set_logged_play_context on logged_plays;
create trigger trg_set_logged_play_context
before insert or update on logged_plays
for each row execute function set_logged_play_context();

insert into scheme_play_weights (scheme, play_type, weight, suppress)
values
  ('Power Spread', 'Deep Pass', 0.95, false),
  ('Power Spread', 'Medium Pass', 0.90, false),
  ('Power Spread', 'Play Action', 0.85, false),
  ('Power Spread', 'Option / QB Run', 0.80, false),
  ('Power Spread', 'Inside Run', 0.75, false),
  ('Power Spread', 'RPO Alert', 0.75, false),
  ('Power Spread', 'Screen', 0.70, false),
  ('Power Spread', 'RPO Peek', 0.70, false),
  ('Power Spread', 'Quick Pass', 0.65, false),
  ('Power Spread', 'Outside Run', 0.60, false),
  ('Power Spread', 'Counter', 0.60, false),
  ('Power Spread', 'QB Draw', 0.55, false),
  ('Power Spread', 'FB Run', 0.20, false)
on conflict do nothing;

insert into team_offensive_playbooks(team_name, playbook_name, scheme_style)
values
  ('Washington State', 'Washington State', 'Power Spread'),
  ('Oregon', 'Oregon', 'Spread Option'),
  ('Michigan', 'Michigan', 'Multiple Pro')
on conflict (team_name) do nothing;

insert into team_defensive_schemes(team_name, defensive_scheme)
values
  ('Washington State', '4-2-5'),
  ('Oregon', '3-3-5'),
  ('Michigan', 'Multiple')
on conflict (team_name) do nothing;

-- Reference data read by the app with the anon key (e.g. GET /api/film/setup).
alter table team_offensive_playbooks enable row level security;
alter table team_defensive_schemes enable row level security;

drop policy if exists "Allow public read" on team_offensive_playbooks;
create policy "Allow public read" on team_offensive_playbooks for select using (true);

drop policy if exists "Allow public read" on team_defensive_schemes;
create policy "Allow public read" on team_defensive_schemes for select using (true);

-- Film logging: server routes use the anon key; keep RLS off so inserts/reads from API routes succeed.
alter table drives disable row level security;
alter table logged_plays disable row level security;
alter table game_sessions disable row level security;

-- Allow LOSS as a film log result (idempotent for existing DBs).
alter table logged_plays drop constraint if exists logged_plays_result_tag_check;
alter table logged_plays add constraint logged_plays_result_tag_check
  check (result_tag in ('FIRST_DOWN', 'TOUCHDOWN', 'GAIN', 'NO_GAIN', 'INCOMPLETE', 'SACK', 'LOSS', 'TURNOVER', 'PUNT', 'FIELD_GOAL', 'OUT_OF_BOUNDS', 'PENALTY'));
