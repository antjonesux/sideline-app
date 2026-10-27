-- Play setups: per-user notes/images scoped to one catalog play identity
-- (game_version + side_of_ball + playbook + formation + play_name).
-- Idempotent: safe to re-run.

-- ============================================================
-- 1. Table
-- ============================================================

create table if not exists play_setups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  game_version text not null,
  side_of_ball text not null check (side_of_ball in ('offense', 'defense')),
  playbook text not null,
  formation text not null,
  play_name text not null,
  play_key text not null,
  title text not null,
  notes text not null default '',
  image_path text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint play_setups_title_len check (char_length(trim(title)) between 1 and 60),
  constraint play_setups_notes_len check (char_length(notes) <= 2000)
);

create index if not exists idx_play_setups_user_play_key_sort
  on play_setups (user_id, play_key, sort_order);

alter table play_setups enable row level security;

drop policy if exists "Owner access" on play_setups;
create policy "Owner access" on play_setups
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================================
-- 2. Private storage bucket for setup images
--    Object path: {user_id}/{setup_id}/{random}.{ext}
-- ============================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'play-setup-images',
  'play-setup-images',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']::text[]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "play_setup_images_select" on storage.objects;
create policy "play_setup_images_select" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'play-setup-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "play_setup_images_insert" on storage.objects;
create policy "play_setup_images_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'play-setup-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "play_setup_images_update" on storage.objects;
create policy "play_setup_images_update" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'play-setup-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'play-setup-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "play_setup_images_delete" on storage.objects;
create policy "play_setup_images_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'play-setup-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
