-- Pass 1: drive-level side-of-ball for offense/defense logging in the same game.
alter table drives
  add column if not exists side_of_ball text not null default 'offense'
  check (side_of_ball in ('offense', 'defense'));
