-- The Sideline — CFB26 scheme data (run in Supabase SQL editor or migrate)

CREATE TABLE IF NOT EXISTS schemes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  coach_name TEXT,
  description TEXT,
  tempo TEXT,
  cfb26_playbook TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS scheme_player_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scheme_id UUID REFERENCES schemes(id) ON DELETE CASCADE,
  position TEXT NOT NULL,
  archetype_label TEXT,
  key_attributes TEXT[],
  avoid_note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS scheme_formations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scheme_id UUID REFERENCES schemes(id) ON DELETE CASCADE,
  formation_name TEXT NOT NULL,
  formation_group TEXT,
  cfb26_playbook TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS situational_calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scheme_id UUID REFERENCES schemes(id) ON DELETE CASCADE,
  situation TEXT NOT NULL,
  down INT,
  distance_min INT,
  distance_max INT,
  formation TEXT,
  play_type TEXT,
  rationale TEXT,
  priority INT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE schemes ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheme_player_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheme_formations ENABLE ROW LEVEL SECURITY;
ALTER TABLE situational_calls ENABLE ROW LEVEL SECURITY;

-- Public read for anon MVP (no auth); drop first so this file can be re-run safely
DROP POLICY IF EXISTS "Public read schemes" ON schemes;
DROP POLICY IF EXISTS "Public read scheme_player_types" ON scheme_player_types;
DROP POLICY IF EXISTS "Public read scheme_formations" ON scheme_formations;
DROP POLICY IF EXISTS "Public read situational_calls" ON situational_calls;

CREATE POLICY "Public read schemes" ON schemes FOR SELECT USING (true);
CREATE POLICY "Public read scheme_player_types" ON scheme_player_types FOR SELECT USING (true);
CREATE POLICY "Public read scheme_formations" ON scheme_formations FOR SELECT USING (true);
CREATE POLICY "Public read situational_calls" ON situational_calls FOR SELECT USING (true);
