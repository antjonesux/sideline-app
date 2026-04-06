-- MVP 2: opponent defensive schemes, team mapping, game plans

CREATE TABLE IF NOT EXISTS defensive_schemes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scheme_name TEXT NOT NULL UNIQUE,
  description TEXT,
  coverage_tendency TEXT,
  pressure_tendency TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS team_defensive_schemes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_name TEXT NOT NULL UNIQUE,
  defensive_scheme TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS game_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  offensive_scheme_id UUID REFERENCES schemes(id) ON DELETE CASCADE,
  defensive_scheme TEXT NOT NULL,
  vulnerability_summary TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (offensive_scheme_id, defensive_scheme)
);

CREATE TABLE IF NOT EXISTS formation_exploits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_plan_id UUID REFERENCES game_plans(id) ON DELETE CASCADE,
  formation_name TEXT NOT NULL,
  why_it_works TEXT,
  counter_threat TEXT,
  leverage_level TEXT,
  priority INT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS adjusted_situational_calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_plan_id UUID REFERENCES game_plans(id) ON DELETE CASCADE,
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

ALTER TABLE defensive_schemes ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_defensive_schemes ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE formation_exploits ENABLE ROW LEVEL SECURITY;
ALTER TABLE adjusted_situational_calls ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read defensive_schemes" ON defensive_schemes;
DROP POLICY IF EXISTS "Public read team_defensive_schemes" ON team_defensive_schemes;
DROP POLICY IF EXISTS "Public read game_plans" ON game_plans;
DROP POLICY IF EXISTS "Public read formation_exploits" ON formation_exploits;
DROP POLICY IF EXISTS "Public read adjusted_situational_calls" ON adjusted_situational_calls;

CREATE POLICY "Public read defensive_schemes" ON defensive_schemes FOR SELECT USING (true);
CREATE POLICY "Public read team_defensive_schemes" ON team_defensive_schemes FOR SELECT USING (true);
CREATE POLICY "Public read game_plans" ON game_plans FOR SELECT USING (true);
CREATE POLICY "Public read formation_exploits" ON formation_exploits FOR SELECT USING (true);
CREATE POLICY "Public read adjusted_situational_calls" ON adjusted_situational_calls FOR SELECT USING (true);

CREATE UNIQUE INDEX IF NOT EXISTS formation_exploits_game_plan_formation_idx
  ON formation_exploits (game_plan_id, formation_name);

CREATE UNIQUE INDEX IF NOT EXISTS adjusted_calls_game_plan_situation_idx
  ON adjusted_situational_calls (game_plan_id, situation);
