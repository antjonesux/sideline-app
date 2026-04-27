-- CFB27 future-proofing: version stamp on reference catalog rows. Current product = CFB26.
alter table cfb26_plays
  add column if not exists game_version text not null default 'CFB26';

-- Natural key for seeds: the same play may be re-shipped in a later game cycle.
alter table cfb26_plays drop constraint if exists cfb26_plays_unique_play;

alter table cfb26_plays
  add constraint cfb26_plays_unique_play
  unique (playbook, formation, play_name, game_version);
