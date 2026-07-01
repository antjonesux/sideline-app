-- User-owned schemes group offensive and defensive call sheets.

create table if not exists schemes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_schemes_user on schemes(user_id);

create table if not exists scheme_call_sheets (
  scheme_id uuid not null references schemes(id) on delete cascade,
  call_sheet_id uuid not null references play_sheets(id) on delete cascade,
  side_of_ball text not null check (side_of_ball in ('offense', 'defense')),
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (scheme_id, side_of_ball),
  unique (scheme_id, call_sheet_id)
);

create index if not exists idx_scheme_call_sheets_user on scheme_call_sheets(user_id);
create index if not exists idx_scheme_call_sheets_call_sheet on scheme_call_sheets(call_sheet_id);

-- RLS: owner-scoped access (mirrors play_sheets pattern)
alter table schemes enable row level security;
drop policy if exists "Owner access" on schemes;
create policy "Owner access" on schemes
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

alter table scheme_call_sheets enable row level security;
drop policy if exists "Owner access" on scheme_call_sheets;
create policy "Owner access" on scheme_call_sheets
  for all to authenticated
  using (
    auth.uid() = user_id
    and exists (select 1 from schemes s where s.id = scheme_id and s.user_id = auth.uid())
    and exists (select 1 from play_sheets ps where ps.id = call_sheet_id and ps.user_id = auth.uid())
  )
  with check (
    auth.uid() = user_id
    and exists (select 1 from schemes s where s.id = scheme_id and s.user_id = auth.uid())
    and exists (select 1 from play_sheets ps where ps.id = call_sheet_id and ps.user_id = auth.uid())
  );
