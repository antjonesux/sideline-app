-- MVP 4 follow-up: ensure quick-tag set has affinities.
INSERT INTO coverage_play_affinities (
  coverage_tag,
  favored_play_types,
  suppressed_play_types
) VALUES
('COVER 6', ARRAY['middle_field', 'seam', 'crosser'], ARRAY['boundary_streak']),
('ZONE', ARRAY['mesh_levels', 'curl_flat', 'middle_field'], ARRAY['iso_wr']),
('MIX', ARRAY['quick_game', 'run', 'rpo'], ARRAY[]::text[]),
('ROBBER', ARRAY['corner', 'screen', 'run'], ARRAY['middle_field', 'dig', 'slant']),
('SOFT COVERAGE', ARRAY['quick_game', 'screen', 'run'], ARRAY['deep_shot']),
('ZERO COVERAGE', ARRAY['quick_game', 'screen', 'slant', 'hot_route'], ARRAY['seven_step'])
ON CONFLICT (coverage_tag) DO UPDATE SET
  favored_play_types = EXCLUDED.favored_play_types,
  suppressed_play_types = EXCLUDED.suppressed_play_types;
