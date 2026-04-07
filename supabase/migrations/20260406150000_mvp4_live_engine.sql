-- MVP 4: game sessions, notes, timeline, recommendation rule tables

ALTER TABLE play_sheet_plays
  ADD COLUMN IF NOT EXISTS play_type TEXT;

-- Game sessions
CREATE TABLE IF NOT EXISTS game_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  play_sheet_id UUID NOT NULL REFERENCES play_sheets(id) ON DELETE CASCADE,
  offensive_scheme_id UUID NOT NULL REFERENCES schemes(id) ON DELETE CASCADE,
  defensive_scheme TEXT NOT NULL,
  opponent_team TEXT,
  game_number INT NOT NULL DEFAULT 1,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  result TEXT,
  score TEXT,
  what_worked TEXT,
  what_to_adjust TEXT,
  rating INT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS game_sessions_sheet_idx ON game_sessions (play_sheet_id);
CREATE INDEX IF NOT EXISTS game_sessions_scheme_def_idx
  ON game_sessions (offensive_scheme_id, defensive_scheme);

-- Pre-game notes
CREATE TABLE IF NOT EXISTS pregame_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_session_id UUID NOT NULL REFERENCES game_sessions(id) ON DELETE CASCADE,
  primary_coverage TEXT,
  blitz_frequency TEXT,
  run_stop_tendency TEXT,
  key_defender TEXT,
  game_plan_focus TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (game_session_id)
);

-- In-game timeline events
CREATE TABLE IF NOT EXISTS game_timeline_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_session_id UUID NOT NULL REFERENCES game_sessions(id) ON DELETE CASCADE,
  quarter INT,
  is_ot BOOLEAN DEFAULT false,
  field_zone TEXT,
  down INT,
  distance_bucket TEXT,
  score_context TEXT,
  coverage_tags TEXT[],
  play_called_formation TEXT,
  play_called_name TEXT,
  marked_used BOOLEAN DEFAULT false,
  quick_note TEXT,
  event_type TEXT NOT NULL DEFAULT 'note',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS game_timeline_events_session_idx
  ON game_timeline_events (game_session_id, created_at);

-- Coverage to play type affinity rules
CREATE TABLE IF NOT EXISTS coverage_play_affinities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coverage_tag TEXT NOT NULL UNIQUE,
  favored_play_types TEXT[],
  suppressed_play_types TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Field position philosophy rules
CREATE TABLE IF NOT EXISTS field_position_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  field_zone TEXT NOT NULL UNIQUE,
  prioritize_play_types TEXT[],
  suppress_play_types TEXT[],
  rule_note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE game_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE pregame_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_timeline_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE coverage_play_affinities ENABLE ROW LEVEL SECURITY;
ALTER TABLE field_position_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public all game_sessions" ON game_sessions;
DROP POLICY IF EXISTS "Public all pregame_notes" ON pregame_notes;
DROP POLICY IF EXISTS "Public all game_timeline_events" ON game_timeline_events;
DROP POLICY IF EXISTS "Public read coverage_play_affinities" ON coverage_play_affinities;
DROP POLICY IF EXISTS "Public read field_position_rules" ON field_position_rules;

CREATE POLICY "Public all game_sessions" ON game_sessions
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Public all pregame_notes" ON pregame_notes
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Public all game_timeline_events" ON game_timeline_events
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Public read coverage_play_affinities" ON coverage_play_affinities
  FOR SELECT USING (true);

CREATE POLICY "Public read field_position_rules" ON field_position_rules
  FOR SELECT USING (true);
