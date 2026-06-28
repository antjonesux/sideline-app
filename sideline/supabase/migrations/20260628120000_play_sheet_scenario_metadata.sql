-- Custom situation metadata: description, icon, color, locked state.
-- Idempotent — safe to re-run.

ALTER TABLE play_sheet_scenarios ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE play_sheet_scenarios ADD COLUMN IF NOT EXISTS icon TEXT;
ALTER TABLE play_sheet_scenarios ADD COLUMN IF NOT EXISTS color TEXT NOT NULL DEFAULT 'blue';
ALTER TABLE play_sheet_scenarios ADD COLUMN IF NOT EXISTS is_locked BOOLEAN NOT NULL DEFAULT false;

-- Go-to Plays (both legacy spellings)
UPDATE play_sheet_scenarios SET description = 'Your most trusted plays', icon = 'Star', color = 'amber', is_locked = true WHERE scenario IN ('Go-to Plays', 'Go-To Plays') AND description IS NULL;

UPDATE play_sheet_scenarios SET description = 'Establish the run', icon = 'Shield', color = 'emerald' WHERE scenario = 'Run Game' AND description IS NULL;

UPDATE play_sheet_scenarios SET description = 'Move the chains through the air', icon = 'Target', color = 'blue' WHERE scenario = 'Pass Game' AND description IS NULL;

UPDATE play_sheet_scenarios SET description = 'Quick wins vs man coverage', icon = 'Crosshair', color = 'violet' WHERE scenario = 'Man Beaters' AND description IS NULL;

UPDATE play_sheet_scenarios SET description = 'Read the zone and attack', icon = 'Eye', color = 'rose' WHERE scenario = 'Zone Beaters' AND description IS NULL;

UPDATE play_sheet_scenarios SET description = 'Stretch the field', icon = 'Rocket', color = 'orange' WHERE scenario = 'Take a Shot' AND description IS NULL;

UPDATE play_sheet_scenarios SET description = 'Punch it in', icon = 'Flag', color = 'red' WHERE scenario = 'Red Zone' AND description IS NULL;

UPDATE play_sheet_scenarios SET description = 'Speed up the pace', icon = 'FastForward', color = 'cyan' WHERE scenario = 'Tempo' AND description IS NULL;

-- Catch-all for unmatched scenarios (legacy down-and-distance, etc.)
UPDATE play_sheet_scenarios SET description = scenario, color = 'sky' WHERE description IS NULL;
