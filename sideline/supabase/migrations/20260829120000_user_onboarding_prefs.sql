-- Per-user welcome modal version + per-feature onboarding flags.
-- Idempotent: safe to re-run.

create table if not exists user_onboarding_prefs (
  user_id uuid primary key references auth.users(id) on delete cascade,
  welcome_modal_version_seen integer,
  onboarding_seen jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table user_onboarding_prefs
  add column if not exists welcome_modal_version_seen integer;

alter table user_onboarding_prefs
  add column if not exists onboarding_seen jsonb;

alter table user_onboarding_prefs
  alter column onboarding_seen set default '{}'::jsonb;

update user_onboarding_prefs
set onboarding_seen = '{}'::jsonb
where onboarding_seen is null;

alter table user_onboarding_prefs
  alter column onboarding_seen set not null;

alter table user_onboarding_prefs enable row level security;

drop policy if exists "Owner access" on user_onboarding_prefs;
create policy "Owner access" on user_onboarding_prefs
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
