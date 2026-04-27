-- User-scoped aggregation paths for Film, Tendencies, and Game Plan:
-- real queries join/filter logged_plays and drives with both user_id and
-- game_session_id or user_id and drive_id together.

create index if not exists idx_logged_plays_user_game  on logged_plays (user_id, game_session_id);
create index if not exists idx_logged_plays_user_drive on logged_plays (user_id, drive_id);
create index if not exists idx_drives_user_game         on drives (user_id, game_session_id);
