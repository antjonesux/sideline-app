-- User-owned active Call Sheet pointer (server-side; not play_sheets.is_active).
create table if not exists user_call_sheet_prefs (
  user_id uuid primary key references auth.users(id) on delete cascade,
  active_call_sheet_id uuid references play_sheets(id) on delete set null,
  updated_at timestamptz not null default now()
);

alter table user_call_sheet_prefs enable row level security;

drop policy if exists "Owner access" on user_call_sheet_prefs;
create policy "Owner access" on user_call_sheet_prefs
  for all to authenticated
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and (
      active_call_sheet_id is null
      or exists (
        select 1 from play_sheets ps
        where ps.id = active_call_sheet_id and ps.user_id = auth.uid()
      )
    )
  );

-- Backfill active sheet for existing users (most recently updated sheet per user).
insert into user_call_sheet_prefs (user_id, active_call_sheet_id)
select distinct on (ps.user_id) ps.user_id, ps.id
from play_sheets ps
order by ps.user_id, ps.updated_at desc nulls last, ps.created_at desc
on conflict (user_id) do nothing;
