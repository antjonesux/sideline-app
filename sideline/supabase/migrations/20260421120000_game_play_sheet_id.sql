-- Link each game session to its chosen play sheet (nullable; NULL = no sheet selected).
alter table game_sessions
  add column if not exists play_sheet_id uuid references play_sheets(id) on delete set null;
