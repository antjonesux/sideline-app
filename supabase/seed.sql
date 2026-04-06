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

-- Arbuckle player types
INSERT INTO scheme_player_types (scheme_id, position, archetype_label, key_attributes, avoid_note) VALUES
('00000001-0000-4000-8000-000000000001', 'QB', 'Dual-Threat Scrambler', ARRAY['Speed', 'Throw on Run', 'Short Accuracy', 'Release Speed'], 'Avoid pure pocket passers'),
('00000001-0000-4000-8000-000000000001', 'HB', 'Receiving Back', ARRAY['Speed', 'Catching', 'Pass Block'], 'Avoid power backs — screens and checkdowns are the role'),
('00000001-0000-4000-8000-000000000001', 'WR1', 'Route Runner', ARRAY['Route Running', 'Catch in Traffic', 'Release'], 'Speed helps but technique wins'),
('00000001-0000-4000-8000-000000000001', 'WR2', 'Separator', ARRAY['Short Route Running', 'Catching', 'Acceleration'], 'Must win quickly off the line'),
('00000001-0000-4000-8000-000000000001', 'TE', 'Blocking TE or Mismatch Weapon', ARRAY['Pass Block', 'Catch in Traffic'], 'Used as either extra blocker or seam threat'),
('00000001-0000-4000-8000-000000000001', 'OL', 'Pass Protector', ARRAY['Pass Block', 'Awareness'], 'Wide splits demand footwork over power');

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
('00000001-0000-4000-8000-000000000001', 'Gun Flex Y Off Wk', '3rd Down', 'Washington State');

-- Arbuckle situational calls
INSERT INTO situational_calls (scheme_id, situation, down, distance_min, distance_max, formation, play_type, rationale, priority) VALUES
('00000001-0000-4000-8000-000000000001', '1st & 10', 1, 10, 10, 'Gun Spread', 'RPO or Mesh Concept', 'Attack leverage pre-snap.', 1),
('00000001-0000-4000-8000-000000000001', '2nd & Medium', 2, 4, 6, 'Gun Doubles', 'Quick Game', 'Stay on schedule.', 2),
('00000001-0000-4000-8000-000000000001', '2nd & Long', 2, 7, 99, 'Pistol Wing Slot', 'Play Action', 'Buy time, attack vertically.', 3),
('00000001-0000-4000-8000-000000000001', '3rd & Short', 3, 1, 2, 'Pistol U Off', 'QB Power / RPO', 'Force hat conflict.', 4),
('00000001-0000-4000-8000-000000000001', '3rd & Long', 3, 6, 99, 'Gun Empty Trips', 'Four Verts / Spacing', 'Force safety declaration.', 5),
('00000001-0000-4000-8000-000000000001', 'Red Zone', NULL, NULL, NULL, 'Pistol Full House TE', 'Fade / Back Shoulder', 'Isolate WR in space.', 6),
('00000001-0000-4000-8000-000000000001', '2-Minute Drill', NULL, NULL, NULL, 'Gun Empty Base Flex', 'Slants / Crossers', 'Fast, high-percentage completions.', 7);
