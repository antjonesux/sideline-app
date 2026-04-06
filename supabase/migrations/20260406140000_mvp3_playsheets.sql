-- MVP 3: play sheets, sheet plays, CFB26 play reference

CREATE TABLE IF NOT EXISTS play_sheets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  offensive_scheme_id UUID REFERENCES schemes(id) ON DELETE CASCADE,
  defensive_scheme TEXT NOT NULL,
  opponent_team TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS play_sheet_plays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  play_sheet_id UUID NOT NULL REFERENCES play_sheets(id) ON DELETE CASCADE,
  situation TEXT NOT NULL,
  situation_order INT,
  play_order INT DEFAULT 0,
  formation TEXT NOT NULL,
  play_name TEXT NOT NULL,
  coaching_note TEXT,
  counter_formation TEXT,
  counter_play TEXT,
  custom_note TEXT,
  is_featured BOOLEAN DEFAULT false,
  is_used BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cfb26_plays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  playbook TEXT NOT NULL,
  formation TEXT NOT NULL,
  play_name TEXT NOT NULL,
  play_type TEXT,
  is_new_in_26 BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS cfb26_plays_playbook_formation_idx
  ON cfb26_plays (playbook, formation);

CREATE UNIQUE INDEX IF NOT EXISTS cfb26_plays_playbook_formation_name_idx
  ON cfb26_plays (playbook, formation, play_name);

CREATE INDEX IF NOT EXISTS play_sheet_plays_sheet_idx
  ON play_sheet_plays (play_sheet_id);

CREATE INDEX IF NOT EXISTS play_sheets_scheme_def_idx
  ON play_sheets (offensive_scheme_id, defensive_scheme);

ALTER TABLE play_sheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE play_sheet_plays ENABLE ROW LEVEL SECURITY;
ALTER TABLE cfb26_plays ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read play_sheets" ON play_sheets;
DROP POLICY IF EXISTS "Public all play_sheets" ON play_sheets;
DROP POLICY IF EXISTS "Public read play_sheet_plays" ON play_sheet_plays;
DROP POLICY IF EXISTS "Public all play_sheet_plays" ON play_sheet_plays;
DROP POLICY IF EXISTS "Public read cfb26_plays" ON cfb26_plays;

-- MVP demo: allow full CRUD without auth (tighten for production)
CREATE POLICY "Public all play_sheets" ON play_sheets
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Public all play_sheet_plays" ON play_sheet_plays
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Public read cfb26_plays" ON cfb26_plays
  FOR SELECT USING (true);

CREATE OR REPLACE FUNCTION touch_play_sheets_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS play_sheets_updated_at ON play_sheets;
CREATE TRIGGER play_sheets_updated_at
  BEFORE UPDATE ON play_sheets
  FOR EACH ROW
  EXECUTE FUNCTION touch_play_sheets_updated_at();
