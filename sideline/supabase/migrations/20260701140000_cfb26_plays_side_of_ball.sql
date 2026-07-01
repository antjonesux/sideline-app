-- Explicit offense/defense metadata for playbook catalog rows.
alter table cfb26_plays
  add column if not exists side_of_ball text not null default 'offense';
