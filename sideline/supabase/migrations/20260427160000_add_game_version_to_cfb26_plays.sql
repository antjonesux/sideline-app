-- Add game_version column to cfb26_plays for CFB27 forward-compatibility
ALTER TABLE cfb26_plays
ADD COLUMN IF NOT EXISTS game_version text NOT NULL DEFAULT 'cfb26';

-- Recreate unique constraint to include game_version
ALTER TABLE cfb26_plays
DROP CONSTRAINT IF EXISTS cfb26_plays_unique_play;

ALTER TABLE cfb26_plays
ADD CONSTRAINT cfb26_plays_unique_play
UNIQUE (playbook, formation, play_name, game_version);
