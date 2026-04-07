-- Fixed scheme IDs match `lib/staticData.ts` SCHEME_IDS for stable URLs and cache.

INSERT INTO schemes (id, name, coach_name, description, tempo, cfb26_playbook) VALUES
(
  '00000001-0000-4000-8000-000000000001',
  'Arbuckle Air Raid',
  'Ben Arbuckle',
  'Tempo passing offense built on quick game, mesh, and spacing that stresses horizontal and vertical conflict. It lives in empty and open sets, forcing the defense to declare early and play in space.',
  'Up-Tempo',
  'Oklahoma / Washington State'
),
(
  '00000001-0000-4000-8000-000000000002',
  'Spread RPO',
  'Lane Kiffin',
  'Spread formations with conflict reads that tie linebackers and safeties to the run fit. The offense stays ahead of the chains by marrying quick perimeter throws to downhill run threats.',
  'Up-Tempo',
  'Ole Miss / Texas'
),
(
  '00000001-0000-4000-8000-000000000003',
  'Pro Style',
  'Kirby Smart / Nick Saban tree',
  'Under-center and gun balance that leans on play action and personnel packages. You win on schedule with efficient runs, then punish linebackers who creep with shot plays off of believable run action.',
  'Controlled',
  'Georgia / Alabama'
),
(
  '00000001-0000-4000-8000-000000000004',
  'Veer & Shoot',
  'Jeff Lebby',
  'Vertical spacing married to tempo and orbit motion. The goal is to stress safeties with speed outsides while keeping linebackers in run-pass conflict on the way downfield.',
  'Up-Tempo',
  'Ole Miss (Veer variant)'
),
(
  '00000001-0000-4000-8000-000000000005',
  'Option',
  'Troy Calhoun / Jeff Monken tree',
  'Triple-option and speed option families that read defenders instead of blocking them. Assignment football rewards disciplined ball security and precise mesh points more than raw receiver depth.',
  'Ball Control',
  'Air Force / Army'
),
(
  '00000001-0000-4000-8000-000000000006',
  'Power Spread',
  'Matt Campbell tree',
  'Spread alignments with gap schemes and tight-end usage that still throw efficiently. You stay multiple without becoming finesse-only: power and counter punish light boxes.',
  'Controlled',
  'Iowa State / Wisconsin variant'
)
ON CONFLICT (id) DO NOTHING;

-- Arbuckle player types (unique per scheme_id + position — see migration 20260406130000)
INSERT INTO scheme_player_types (scheme_id, position, archetype_label, key_attributes, avoid_note) VALUES
('00000001-0000-4000-8000-000000000001', 'QB', 'Dual-Threat Scrambler', ARRAY['Speed', 'Throw on Run', 'Short Accuracy', 'Release Speed'], 'Avoid pure pocket passers'),
('00000001-0000-4000-8000-000000000001', 'HB', 'Receiving Back', ARRAY['Speed', 'Catching', 'Pass Block'], 'Avoid power backs — screens and checkdowns are the role'),
('00000001-0000-4000-8000-000000000001', 'WR1', 'Route Runner', ARRAY['Route Running', 'Catch in Traffic', 'Release'], 'Speed helps but technique wins'),
('00000001-0000-4000-8000-000000000001', 'WR2', 'Separator', ARRAY['Short Route Running', 'Catching', 'Acceleration'], 'Must win quickly off the line'),
('00000001-0000-4000-8000-000000000001', 'WR3 (Slot 1)', 'Inside Slot', ARRAY['Short Route Running', 'Option Routes', 'Quickness', 'Hands'], 'Big outside-only types struggle in traffic and on rub/mesh timing.'),
('00000001-0000-4000-8000-000000000001', 'WR4 (Slot 2)', 'Field/Boundary Slot', ARRAY['Separation', 'Spatial Awareness', 'YAC', 'Contested Catch'], 'One-speed runners limit how you stress linebackers from the second slot.'),
('00000001-0000-4000-8000-000000000001', 'TE', 'Blocking TE or Mismatch Weapon', ARRAY['Pass Block', 'Catch in Traffic'], 'Used as either extra blocker or seam threat'),
('00000001-0000-4000-8000-000000000001', 'OL', 'Pass Protector', ARRAY['Pass Block', 'Awareness'], 'Wide splits demand footwork over power')
ON CONFLICT (scheme_id, position) DO NOTHING;

-- Arbuckle formations (Washington State)
INSERT INTO scheme_formations (scheme_id, formation_name, formation_group, cfb26_playbook) VALUES
('00000001-0000-4000-8000-000000000001', 'Gun Empty Base Flex', 'Core Passing', 'Washington State'),
('00000001-0000-4000-8000-000000000001', 'Gun Empty Trips Y Off', 'Core Passing', 'Washington State'),
('00000001-0000-4000-8000-000000000001', 'Gun Spread Dbl Flex', 'Core Passing', 'Washington State'),
('00000001-0000-4000-8000-000000000001', 'Gun Trey Open Offset', 'Core Passing', 'Washington State'),
('00000001-0000-4000-8000-000000000001', 'Pistol Wing Slot', 'RPO/Run', 'Washington State'),
('00000001-0000-4000-8000-000000000001', 'Pistol U Off', 'RPO/Run', 'Washington State'),
('00000001-0000-4000-8000-000000000001', 'Pistol Bunch TE', 'RPO/Run', 'Washington State'),
('00000001-0000-4000-8000-000000000001', 'Gun Y Off Trips', 'RPO/Run', 'Washington State'),
('00000001-0000-4000-8000-000000000001', 'Pistol Full House TE', 'Red Zone', 'Washington State'),
('00000001-0000-4000-8000-000000000001', 'Gun Bunch Open TE', 'Red Zone', 'Washington State'),
('00000001-0000-4000-8000-000000000001', 'Gun Empty Y Off Trips', '3rd Down', 'Washington State'),
('00000001-0000-4000-8000-000000000001', 'Gun Trio Offset', '3rd Down', 'Washington State'),
('00000001-0000-4000-8000-000000000001', 'Gun Flex Y Off Wk', '3rd Down', 'Washington State')
ON CONFLICT (scheme_id, formation_name) DO NOTHING;

-- Arbuckle situational calls
INSERT INTO situational_calls (scheme_id, situation, down, distance_min, distance_max, formation, play_type, rationale, priority) VALUES
('00000001-0000-4000-8000-000000000001', '1st & 10', 1, 10, 10, 'Gun Spread', 'RPO or Mesh Concept', 'Attack leverage pre-snap.', 1),
('00000001-0000-4000-8000-000000000001', '2nd & Medium', 2, 4, 6, 'Gun Doubles', 'Quick Game', 'Stay on schedule.', 2),
('00000001-0000-4000-8000-000000000001', '2nd & Long', 2, 7, 99, 'Pistol Wing Slot', 'Play Action', 'Buy time, attack vertically.', 3),
('00000001-0000-4000-8000-000000000001', '3rd & Short', 3, 1, 2, 'Pistol U Off', 'QB Power / RPO', 'Force hat conflict.', 4),
('00000001-0000-4000-8000-000000000001', '3rd & Long', 3, 6, 99, 'Gun Empty Trips', 'Four Verts / Spacing', 'Force safety declaration.', 5),
('00000001-0000-4000-8000-000000000001', 'Red Zone', NULL, NULL, NULL, 'Pistol Full House TE', 'Fade / Back Shoulder', 'Isolate WR in space.', 6),
('00000001-0000-4000-8000-000000000001', '2-Minute Drill', NULL, NULL, NULL, 'Gun Empty Base Flex', 'Slants / Crossers', 'Fast, high-percentage completions.', 7)
ON CONFLICT (scheme_id, situation) DO NOTHING;

-- MVP 2: defensive scheme profiles (aligns with app game plan copy)
INSERT INTO defensive_schemes (scheme_name, description, coverage_tendency, pressure_tendency) VALUES
(
  '3-2-6',
  'Three down linemen, two linebackers, six defensive backs. A light box built to flood the field with cover players against spread and tempo.',
  'Split-field and quarters tendencies; lots of cloud and sky help to the boundary.',
  'Zone Controlled'
),
(
  '3-3-5',
  'Three down, three linebackers, five DBs. Spill-and-kill philosophy with fast fill from linebackers and safeties near the line.',
  'Cover 3 / rip/liz variants and pattern-match zones that spin late.',
  'Blitz Heavy'
),
(
  '3-3-5 Tite',
  'Tite front with snug interior DL; linebackers play tight fits and safeties drive the conflict. Built to shrink the run game without selling out the pass.',
  'Single-high and split-safety shells with heavy hole/robber answers in the middle.',
  'Base Coverage'
),
(
  '3-4',
  'Three down linemen with stand-up edge players — four linebackers on the field. Multiple fronts stemmed from the same personnel.',
  'Cover 3 and man-match answers; will travel linebackers to tight ends and backs.',
  'Blitz Heavy'
),
(
  '3-4 Multiple',
  'Odd and even looks from the same roster: stems, shifts, and hybrid edge players to disguise who is rushing.',
  'Quarters and tight split-safety plans with late rotation at the snap.',
  'Zone Controlled'
),
(
  '4-2-5',
  'Four down linemen, two linebackers, five DBs. Nickel world — built to stop the pass and defend spread offenses without losing a run fit.',
  'Heavy Cover 3 and Cover 4 shells. Will bracket your best WR. Look to exploit the middle of the field.',
  'Zone Controlled'
),
(
  '4-3',
  'Classic seven-man spacing: four linemen, three linebackers. Line-first run defense with linebackers scraping clean.',
  'Cover 3 and Tampa-2 families; cloud corners and flat defenders who rally to the ball.',
  'Base Coverage'
),
(
  '4-3 Multiple',
  'Even/over/tight toggles and NFL-style rules — same linebackers, different shades and techniques pre-snap.',
  'Quarters and split-safety with pattern-read hook/curl players.',
  'Zone Controlled'
),
(
  'Multiple D',
  'Personnel-driven game plans: odd, even, and dime packages mixed weekly. Looks unpredictable snap-to-snap.',
  'Coverage map changes by formation — expect man answers after condensed sets.',
  'Blitz Heavy'
)
ON CONFLICT (scheme_name) DO NOTHING;

INSERT INTO team_defensive_schemes (team_name, defensive_scheme) VALUES
('Jacksonville State', '3-2-6'),
  ('Old Dominion', '3-2-6'),
  ('UNLV', '3-2-6'),
  ('Cincinnati', '3-3-5'),
  ('Delaware', '3-3-5'),
  ('Iowa State', '3-3-5'),
  ('Kansas State', '3-3-5'),
  ('Kennesaw State', '3-3-5'),
  ('NC State', '3-3-5'),
  ('Nebraska', '3-3-5'),
  ('New Mexico State', '3-3-5'),
  ('North Texas', '3-3-5'),
  ('Oklahoma State', '3-3-5'),
  ('Rice', '3-3-5'),
  ('UConn', '3-3-5'),
  ('UL Monroe', '3-3-5'),
  ('UTEP', '3-3-5'),
  ('Western Kentucky', '3-3-5'),
  ('Appalachian State', '3-3-5 Tite'),
  ('Auburn', '3-3-5 Tite'),
  ('Baylor', '3-3-5 Tite'),
  ('FIU', '3-3-5 Tite'),
  ('Florida', '3-3-5 Tite'),
  ('Georgia', '3-3-5 Tite'),
  ('Houston', '3-3-5 Tite'),
  ('Syracuse', '3-3-5 Tite'),
  ('TCU', '3-3-5 Tite'),
  ('Texas Tech', '3-3-5 Tite'),
  ('Tulane', '3-3-5 Tite'),
  ('USF', '3-3-5 Tite'),
  ('West Virginia', '3-3-5 Tite'),
  ('Akron', '3-4'),
  ('Bowling Green', '3-4'),
  ('East Carolina', '3-4'),
  ('Georgia State', '3-4'),
  ('Kentucky', '3-4'),
  ('Louisiana', '3-4'),
  ('Maryland', '3-4'),
  ('Middle Tennessee State', '3-4'),
  ('Mississippi State', '3-4'),
  ('Ole Miss', '3-4'),
  ('Oregon', '3-4'),
  ('San Jose State', '3-4'),
  ('Stanford', '3-4'),
  ('UAB', '3-4'),
  ('UTSA', '3-4'),
  ('Washington', '3-4'),
  ('Wisconsin', '3-4'),
  ('Army', '3-4 Multiple'),
  ('Ball State', '3-4 Multiple'),
  ('Boston College', '3-4 Multiple'),
  ('California', '3-4 Multiple'),
  ('Illinois', '3-4 Multiple'),
  ('Michigan', '3-4 Multiple'),
  ('Navy', '3-4 Multiple'),
  ('Purdue', '3-4 Multiple'),
  ('Alabama', '4-2-5'),
  ('Arizona', '4-2-5'),
  ('Arizona State', '4-2-5'),
  ('Arkansas', '4-2-5'),
  ('Boise State', '4-2-5'),
  ('Coastal Carolina', '4-2-5'),
  ('Colorado State', '4-2-5'),
  ('Eastern Michigan', '4-2-5'),
  ('Florida Atlantic', '4-2-5'),
  ('Florida State', '4-2-5'),
  ('Fresno State', '4-2-5'),
  ('Georgia Southern', '4-2-5'),
  ('Georgia Tech', '4-2-5'),
  ('Indiana', '4-2-5'),
  ('Iowa', '4-2-5'),
  ('James Madison', '4-2-5'),
  ('Kansas', '4-2-5'),
  ('Liberty', '4-2-5'),
  ('LSU', '4-2-5'),
  ('Marshall', '4-2-5'),
  ('Memphis', '4-2-5'),
  ('Missouri', '4-2-5'),
  ('Missouri State', '4-2-5'),
  ('Nevada', '4-2-5'),
  ('New Mexico', '4-2-5'),
  ('Northern Illinois', '4-2-5'),
  ('Ohio', '4-2-5'),
  ('Ohio State', '4-2-5'),
  ('Oklahoma', '4-2-5'),
  ('Oregon State', '4-2-5'),
  ('Penn State', '4-2-5'),
  ('Rutgers', '4-2-5'),
  ('Sam Houston State', '4-2-5'),
  ('San Diego State', '4-2-5'),
  ('SMU', '4-2-5'),
  ('South Alabama', '4-2-5'),
  ('South Carolina', '4-2-5'),
  ('Southern Miss', '4-2-5'),
  ('Tennessee', '4-2-5'),
  ('Texas A&M', '4-2-5'),
  ('Texas State', '4-2-5'),
  ('Toledo', '4-2-5'),
  ('Troy', '4-2-5'),
  ('Tulsa', '4-2-5'),
  ('UCF', '4-2-5'),
  ('Utah State', '4-2-5'),
  ('Virginia', '4-2-5'),
  ('Virginia Tech', '4-2-5'),
  ('Wake Forest', '4-2-5'),
  ('Washington State', '4-2-5'),
  ('Western Michigan', '4-2-5'),
  ('Wyoming', '4-2-5'),
  ('Arkansas State', '4-3'),
  ('Buffalo', '4-3'),
  ('Central Michigan', '4-3'),
  ('Clemson', '4-3'),
  ('Colorado', '4-3'),
  ('Hawaii', '4-3'),
  ('Kent State', '4-3'),
  ('Louisiana Tech', '4-3'),
  ('Miami (OH)', '4-3'),
  ('Michigan State', '4-3'),
  ('Minnesota', '4-3'),
  ('North Carolina', '4-3'),
  ('Northwestern', '4-3'),
  ('Utah', '4-3'),
  ('Vanderbilt', '4-3'),
  ('BYU', '4-3 Multiple'),
  ('Duke', '4-3 Multiple'),
  ('Louisville', '4-3 Multiple'),
  ('Miami (FL)', '4-3 Multiple'),
  ('Pittsburgh', '4-3 Multiple'),
  ('UCLA', '4-3 Multiple'),
  ('USC', '4-3 Multiple'),
  ('Air Force', 'Multiple D'),
  ('Charlotte', 'Multiple D'),
  ('Notre Dame', 'Multiple D'),
  ('Temple', 'Multiple D'),
  ('Texas', 'Multiple D'),
  ('UMass', 'Multiple D')
ON CONFLICT (team_name) DO UPDATE SET defensive_scheme = EXCLUDED.defensive_scheme;

-- Arbuckle Air Raid vs 4-2-5 (Washington State playbook) — first full game plan
INSERT INTO game_plans (id, offensive_scheme_id, defensive_scheme, vulnerability_summary) VALUES
(
  '00000002-0000-4000-8000-000000000001',
  '00000001-0000-4000-8000-000000000001',
  '4-2-5',
  'Against Air Raid: the two-linebacker box is susceptible to mesh concepts and crossing routes. The safeties have to choose — run support or deep coverage. Make them wrong every time.'
)
ON CONFLICT (offensive_scheme_id, defensive_scheme) DO NOTHING;

INSERT INTO formation_exploits (game_plan_id, formation_name, why_it_works, counter_threat, leverage_level, priority) VALUES
(
  '00000002-0000-4000-8000-000000000001',
  'Gun Empty Base Flex',
  'Forces the 2 LBs out of the box — no run support, pure coverage. Attack the seams.',
  'If they bring a safety down, you have a 1-on-1 deep.',
  'High Leverage',
  1
),
(
  '00000002-0000-4000-8000-000000000001',
  'Pistol Wing Slot',
  'RPO reads the overhang defender. If he stays, hand off. If he crashes, throw the flat.',
  'They can''t stop both without showing blitz pre-snap.',
  'Situational',
  2
),
(
  '00000002-0000-4000-8000-000000000001',
  'Gun Trio Offset',
  'Overloads the boundary. 3 routes vs 2 DBs. One of them is open.',
  'Safety rotation reveals the coverage — read it pre-snap.',
  'Constraint Play',
  3
)
ON CONFLICT (game_plan_id, formation_name) DO NOTHING;

INSERT INTO adjusted_situational_calls (game_plan_id, situation, down, distance_min, distance_max, formation, play_type, rationale, priority) VALUES
('00000002-0000-4000-8000-000000000001', '1st & 10', 1, 10, 10, 'Gun Empty Base Flex', 'Mesh Concept', 'Forces 2 LBs to declare — mesh creates natural rubs on crossing routes vs the nickel box.', 1),
('00000002-0000-4000-8000-000000000001', '2nd & Medium', 2, 4, 6, 'Pistol Wing Slot', 'RPO Bubble', '4-2-5 overhang is the read — he can''t play both the bubble and the run fit.', 2),
('00000002-0000-4000-8000-000000000001', '2nd & Long', 2, 7, 99, 'Gun Doubles Offset', 'Play Action Deep', 'Safety rotation after play fake — attack the vacated deep third when nickel safeties bite.', 3),
('00000002-0000-4000-8000-000000000001', '3rd & Short', 3, 1, 2, 'Pistol U Off', 'QB Power', '5 DBs on the field — only 6 run defenders in the box. You have the numbers vs nickel.', 4),
('00000002-0000-4000-8000-000000000001', '3rd & Long', 3, 6, 99, 'Gun Empty Trips Y Off', 'Spacing / Flood', 'Nickel means more zone — flood the zone with 3 routes to one side and make the overhang choose.', 5),
('00000002-0000-4000-8000-000000000001', 'Red Zone', NULL, NULL, NULL, 'Gun Bunch Open TE', 'Fade or Back Shoulder', 'Compressed field + red-zone man = boundary 1-on-1. Win with timing vs 4-2-5 leverage.', 6),
('00000002-0000-4000-8000-000000000001', '2-Minute Drill', NULL, NULL, NULL, 'Gun Empty Base Flex', 'Slants + Checkdowns', 'Keep tempo — nickel zones widen late; slants and checks move the chains without letting coverage dictate pace.', 7),
('00000002-0000-4000-8000-000000000001', '3rd & Medium', 3, 4, 6, 'Gun Empty Base Flex', 'Quick Game / Levels', 'Nickel LBs widen — attack the intermediate windows before safeties can drive.', 8),
('00000002-0000-4000-8000-000000000001', 'Goal Line', NULL, NULL, NULL, 'Pistol U Off', 'Power / Gap Run', 'Extra DBs shrink the box — gap schemes and double teams win at the goal line.', 9),
('00000002-0000-4000-8000-000000000001', 'Backed Up', NULL, NULL, NULL, 'Pistol U Off', 'Outside Run / PA', 'Own 1–10: horizontal stretch clears space before taking a shot off play action.', 10)
ON CONFLICT (game_plan_id, situation) DO NOTHING;

-- MVP 3: Washington State CFB26 plays (Arbuckle formations)
INSERT INTO cfb26_plays (playbook, formation, play_name, play_type, is_new_in_26) VALUES
('Washington State', 'Gun Empty Base Flex', 'DEEP FLOOD', 'Pass', false),
('Washington State', 'Gun Empty Base Flex', 'JAILBREAK SLOT SCREEN', 'Screen', false),
('Washington State', 'Gun Empty Base Flex', 'LEVELS SWITCH', 'Pass', false),
('Washington State', 'Gun Empty Base Flex', 'MIDDLE HI LO', 'Pass', false),
('Washington State', 'Gun Empty Base Flex', 'QB DRAW', 'Run', false),
('Washington State', 'Gun Empty Base Flex', 'STICK', 'Pass', false),
('Washington State', 'Gun Empty Base Flex', 'STICK N NOD', 'Pass', false),
('Washington State', 'Gun Empty Base Flex', 'VERTICALS', 'Pass', false),
('Washington State', 'Gun Empty Base Flex', 'VERTICALS UNDER', 'Pass', false),
('Washington State', 'Gun Empty Base Flex', 'WR SCREEN', 'Screen', false),
('Washington State', 'Gun Empty Base Flex', 'Y CORNER', 'Pass', false),
('Washington State', 'Gun Empty Base Flex', 'Y SHALLOW CROSS', 'Pass', false),
('Washington State', 'Pistol Wing Slot', 'BENCH CORNER STRIKE', 'Pass', true),
('Washington State', 'Pistol Wing Slot', 'DAGGER', 'Pass', false),
('Washington State', 'Pistol Wing Slot', 'FOUR VERTICALS', 'Pass', false),
('Washington State', 'Pistol Wing Slot', 'HB COUNTER', 'Run', false),
('Washington State', 'Pistol Wing Slot', 'HB DIVE', 'Run', false),
('Washington State', 'Pistol Wing Slot', 'HB STRETCH', 'Run', false),
('Washington State', 'Pistol Wing Slot', 'HB ZONE WK', 'Run', false),
('Washington State', 'Pistol Wing Slot', 'HITCH CORNERS', 'Pass', false),
('Washington State', 'Pistol Wing Slot', 'JET DASH WK', 'Run', true),
('Washington State', 'Pistol Wing Slot', 'JET SPLIT DIVE', 'Run', true),
('Washington State', 'Pistol Wing Slot', 'JET TOUCH PASS', 'Pass', false),
('Washington State', 'Pistol Wing Slot', 'MTN HB ZONE WK', 'Run', true),
('Washington State', 'Pistol Wing Slot', 'MTN LEAD ZONE WK', 'Run', true),
('Washington State', 'Pistol Wing Slot', 'MTN PA SAIL', 'Play Action', true),
('Washington State', 'Pistol Wing Slot', 'MTN PA SLIDE', 'Play Action', true),
('Washington State', 'Pistol Wing Slot', 'MTN PA TE SEAM', 'Play Action', true),
('Washington State', 'Pistol Wing Slot', 'MTN SPEED OPTION WK', 'RPO', true),
('Washington State', 'Pistol Wing Slot', 'PA BOOT LT', 'Play Action', false),
('Washington State', 'Pistol Wing Slot', 'PA CTR WAGGLE', 'Play Action', false),
('Washington State', 'Pistol Wing Slot', 'PA DEEP OUT', 'Play Action', false),
('Washington State', 'Pistol Wing Slot', 'PA POWER O', 'Play Action', false),
('Washington State', 'Pistol Wing Slot', 'POWER O', 'Run', false),
('Washington State', 'Pistol Wing Slot', 'READ OPTION WK', 'RPO', false),
('Washington State', 'Pistol Wing Slot', 'Y STICK', 'Pass', false),
('Washington State', 'Gun Empty Trips Y Off', 'ALL GO', 'Pass', false),
('Washington State', 'Gun Empty Trips Y Off', 'CURLS SLOT OUT', 'Pass', true),
('Washington State', 'Gun Empty Trips Y Off', 'DAGGER', 'Pass', true),
('Washington State', 'Gun Empty Trips Y Off', 'DEEP CURLS', 'Pass', true),
('Washington State', 'Gun Empty Trips Y Off', 'INS SLOT CORNER', 'Pass', true),
('Washington State', 'Gun Empty Trips Y Off', 'LEVELS SEAM', 'Pass', true),
('Washington State', 'Gun Empty Trips Y Off', 'QB G DOWN', 'Run', true),
('Washington State', 'Gun Empty Trips Y Off', 'QB ZONE', 'Run', true),
('Washington State', 'Gun Empty Trips Y Off', 'RPO ALERT BUBBLE QB POWER', 'RPO', true),
('Washington State', 'Gun Empty Trips Y Off', 'SLOT FADE', 'Pass', true),
('Washington State', 'Gun Empty Trips Y Off', 'SMASH UNDER', 'Pass', true),
('Washington State', 'Gun Empty Trips Y Off', 'TE MID SCREEN', 'Screen', true),
('Washington State', 'Pistol U Off', 'CURL FLATS', 'Pass', false),
('Washington State', 'Pistol U Off', 'HB DIVE', 'Run', false),
('Washington State', 'Pistol U Off', 'HB SPLIT DIVE', 'Run', true),
('Washington State', 'Pistol U Off', 'HB STRETCH', 'Run', false),
('Washington State', 'Pistol U Off', 'HB ZONE WK', 'Run', false),
('Washington State', 'Pistol U Off', 'INSIDE ZONE SPLIT', 'Run', false),
('Washington State', 'Pistol U Off', 'MTN HB POWER', 'Run', true),
('Washington State', 'Pistol U Off', 'MTN HB STRETCH', 'Run', true),
('Washington State', 'Pistol U Off', 'MTN PA STRETCH', 'Play Action', true),
('Washington State', 'Pistol U Off', 'PA BOOT Y DRAG', 'Play Action', false),
('Washington State', 'Pistol U Off', 'PA DEEP CROSS', 'Play Action', false),
('Washington State', 'Pistol U Off', 'PA SHOT GOS', 'Play Action', false),
('Washington State', 'Pistol U Off', 'READ OPTION', 'RPO', false),
('Washington State', 'Pistol U Off', 'RPO PEEK SLANT FLAT', 'RPO', true),
('Washington State', 'Pistol U Off', 'SLANTS', 'Pass', false),
('Washington State', 'Pistol U Off', 'STRETCH WR SCREEN', 'Screen', true),
('Washington State', 'Pistol U Off', 'TE CROSS', 'Pass', false),
('Washington State', 'Pistol U Off', 'Z SPOT', 'Pass', false)
ON CONFLICT (playbook, formation, play_name) DO NOTHING;

-- MVP 3: seeded play sheet — Arbuckle Air Raid vs 4-2-5 (Washington State)
INSERT INTO play_sheets (id, name, offensive_scheme_id, defensive_scheme, opponent_team) VALUES
(
  '00000003-0000-4000-8000-000000000001',
  'Arbuckle vs 4-2-5 — Demo',
  '00000001-0000-4000-8000-000000000001',
  '4-2-5',
  NULL
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO play_sheet_plays (id, play_sheet_id, situation, situation_order, play_order, formation, play_name, coaching_note, counter_formation, counter_play, custom_note, is_featured, is_used) VALUES
('00000003-0000-4000-8000-000000000101', '00000003-0000-4000-8000-000000000001', '1st & 10', 0, 0, 'Gun Empty Base Flex', 'Y SHALLOW CROSS', 'Shallow cross attacks the hook/curl zone — LBs can''t drop fast enough', NULL, 'STICK', NULL, true, false),
('00000003-0000-4000-8000-000000000102', '00000003-0000-4000-8000-000000000001', '2nd & Medium', 1, 0, 'Pistol Wing Slot', 'READ OPTION WK', 'RPO reads the overhang — if he crashes, QB pulls and throws bubble', NULL, 'Y STICK', NULL, false, false),
('00000003-0000-4000-8000-000000000103', '00000003-0000-4000-8000-000000000001', '2nd & Long', 2, 0, 'Pistol Wing Slot', 'PA DEEP OUT', 'Play action holds the safeties — deep out to the boundary beats Cover 3', NULL, 'PA BOOT LT', NULL, false, false),
('00000003-0000-4000-8000-000000000104', '00000003-0000-4000-8000-000000000001', '3rd & Short', 3, 0, 'Pistol U Off', 'RPO PEEK SLANT FLAT', 'Slant-flat combo — one of the two is always open vs single-high', NULL, 'READ OPTION', NULL, false, false),
('00000003-0000-4000-8000-000000000105', '00000003-0000-4000-8000-000000000001', '3rd & Medium', 4, 0, 'Gun Empty Base Flex', 'LEVELS SWITCH', 'High-low concept attacks zone coverage — the switch creates natural pick', NULL, 'MIDDLE HI LO', NULL, false, false),
('00000003-0000-4000-8000-000000000106', '00000003-0000-4000-8000-000000000001', '3rd & Long', 5, 0, 'Gun Empty Trips Y Off', 'LEVELS SEAM', 'Three levels vs Cover 3 — the seam splits the hook and the deep third', NULL, 'RPO ALERT BUBBLE QB POWER', NULL, true, false),
('00000003-0000-4000-8000-000000000107', '00000003-0000-4000-8000-000000000001', 'Red Zone', 6, 0, 'Pistol Wing Slot', 'PA DEEP OUT', 'Play action isolates the boundary WR — back shoulder vs press man', NULL, 'HITCH CORNERS', NULL, false, false),
('00000003-0000-4000-8000-000000000108', '00000003-0000-4000-8000-000000000001', 'Goal Line', 7, 0, 'Pistol U Off', 'MTN HB POWER', 'Power blocking at the goal line — numbers advantage vs 5-DB look', NULL, 'INSIDE ZONE SPLIT', NULL, false, false),
('00000003-0000-4000-8000-000000000109', '00000003-0000-4000-8000-000000000001', '2-Minute Drill', 8, 0, 'Gun Empty Base Flex', 'STICK', 'Fast, safe throw to the flat — QB gets the ball out in under 2 seconds', NULL, 'WR SCREEN', NULL, false, false),
('00000003-0000-4000-8000-000000000110', '00000003-0000-4000-8000-000000000001', 'Backed Up', 9, 0, 'Pistol U Off', 'HB STRETCH', 'Get outside the box — stretch the defense horizontally before throwing', NULL, 'PA BOOT Y DRAG', NULL, false, false)
ON CONFLICT (id) DO NOTHING;

UPDATE play_sheet_plays SET play_type = v.play_type
FROM (VALUES
  ('00000003-0000-4000-8000-000000000101'::uuid, 'Pass'),
  ('00000003-0000-4000-8000-000000000102'::uuid, 'RPO'),
  ('00000003-0000-4000-8000-000000000103'::uuid, 'Play Action'),
  ('00000003-0000-4000-8000-000000000104'::uuid, 'RPO'),
  ('00000003-0000-4000-8000-000000000105'::uuid, 'Pass'),
  ('00000003-0000-4000-8000-000000000106'::uuid, 'Pass'),
  ('00000003-0000-4000-8000-000000000107'::uuid, 'Play Action'),
  ('00000003-0000-4000-8000-000000000108'::uuid, 'Run'),
  ('00000003-0000-4000-8000-000000000109'::uuid, 'Pass'),
  ('00000003-0000-4000-8000-000000000110'::uuid, 'Run')
) AS v(id, play_type)
WHERE play_sheet_plays.id = v.id;

-- MVP 4: field position philosophy (keys match app FieldZone enum)
INSERT INTO field_position_rules (field_zone, prioritize_play_types, suppress_play_types, rule_note) VALUES
('BACKED_UP',
  ARRAY['run', 'quick_game', 'rpo', 'screen'],
  ARRAY['empty_formation', 'deep_shot', 'trick_play'],
  'Protect the ball. No turnovers. Get a first down.'),
('OWN_TERRITORY',
  ARRAY['balanced', 'play_action', 'quick_game'],
  ARRAY[]::text[],
  'Establish rhythm. Set up play action for midfield.'),
('MIDFIELD',
  ARRAY['explosive', 'deep_shot', 'rpo', 'play_action'],
  ARRAY[]::text[],
  'Attack. You have field to work with. Take your shot.'),
('SCORING',
  ARRAY['high_pct_pass', 'run', 'play_action', 'quick_game'],
  ARRAY['deep_shot', 'negative_screen'],
  'You''re in range. Don''t waste the field position.'),
('RED_ZONE',
  ARRAY['compressed_route', 'run', 'play_action', 'back_shoulder'],
  ARRAY['empty_formation', 'all_go'],
  'Field shrinks. Routes get shorter. Win 1-on-1.'),
('GOAL_LINE',
  ARRAY['power_run', 'qb_sneak', 'play_action_boot', 'run'],
  ARRAY['empty_formation', 'spread', 'needs_space'],
  'This is execution. Simple. Physical. Win at the point of attack.')
ON CONFLICT (field_zone) DO UPDATE SET
  prioritize_play_types = EXCLUDED.prioritize_play_types,
  suppress_play_types = EXCLUDED.suppress_play_types,
  rule_note = EXCLUDED.rule_note;

-- MVP 4: coverage ↔ play-type affinities (tag labels match quick-tag UI)
INSERT INTO coverage_play_affinities (coverage_tag, favored_play_types, suppressed_play_types) VALUES
('COVER 0', ARRAY['quick_game', 'screen', 'slant'], ARRAY['deep_shot']),
('COVER 1', ARRAY['crosser', 'dig', 'seam'], ARRAY['short_flat']),
('COVER 2', ARRAY['seam', 'middle_field', 'corner'], ARRAY['flat_route']),
('COVER 3', ARRAY['mesh', 'levels', 'curl_flat'], ARRAY['boundary_streak']),
('COVER 4', ARRAY['short_game', 'crosser', 'rpo'], ARRAY['deep_post']),
('COVER 6', ARRAY['middle_field', 'seam', 'crosser'], ARRAY['boundary_streak']),
('BLITZING', ARRAY['quick_game', 'screen', 'hot_route'], ARRAY['slow_developing', 'seven_step']),
('MAN', ARRAY['rub', 'pick', 'motion'], ARRAY['iso_wr']),
('BRACKET WR1', ARRAY['wr2_te_hb', 'space'], ARRAY['wr1_iso']),
('BRACKET MY WR1', ARRAY['wr2_te_hb', 'space'], ARRAY['wr1_iso']),
('ZONE', ARRAY['mesh_levels', 'curl_flat', 'middle_field'], ARRAY['iso_wr']),
('MIX', ARRAY['quick_game', 'run', 'rpo'], ARRAY[]::text[]),
('ROBBER', ARRAY['corner', 'screen', 'run'], ARRAY['middle_field', 'dig', 'slant']),
('SOFT COVERAGE', ARRAY['quick_game', 'screen', 'run'], ARRAY['deep_shot']),
('ZERO COVERAGE', ARRAY['quick_game', 'screen', 'slant', 'hot_route'], ARRAY['seven_step'])
ON CONFLICT (coverage_tag) DO UPDATE SET
  favored_play_types = EXCLUDED.favored_play_types,
  suppressed_play_types = EXCLUDED.suppressed_play_types;
