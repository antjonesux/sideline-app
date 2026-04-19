/*
 * QA18 — Normalize cfb26_plays.play_type to RUN | PASS | RPO and enforce via CHECK.
 * Canonical table in this repo is `cfb26_plays` (playbook rows), not `playbook_plays`.
 *
 * ROLLBACK (manual, after deploy if needed):
 *   ALTER TABLE cfb26_plays DROP CONSTRAINT IF EXISTS cfb26_plays_play_type_check;
 *   -- Data is not automatically reverted; restore from backup if required.
 */

BEGIN;

UPDATE cfb26_plays SET play_type = upper(trim(play_type));

UPDATE cfb26_plays
SET play_type = 'RUN'
WHERE lower(play_type) IN ('run', 'rush');

UPDATE cfb26_plays
SET play_type = 'PASS'
WHERE lower(play_type) IN ('pass', 'pass route', 'pr');

UPDATE cfb26_plays
SET play_type = 'RPO'
WHERE lower(play_type) IN ('rpo', 'run pass option');

-- Seed / editor vocabulary (see lib/seed/playTypeClassifier.ts PLAY_TYPES)
UPDATE cfb26_plays SET play_type = 'RUN' WHERE play_type IN (
  'INSIDE RUN', 'OUTSIDE RUN', 'QB RUN', 'OPTION'
);

UPDATE cfb26_plays SET play_type = 'PASS' WHERE play_type IN (
  'QUICK PASS', 'MEDIUM PASS', 'DEEP PASS', 'PLAY ACTION', 'SCREEN'
);

UPDATE cfb26_plays
SET play_type = CASE
  WHEN lower(play_name) ~ '(zone|power|dive|counter|toss|sweep|draw|option|iso|veer|belly|blast|buck|trap|wedge|plunge|off tackle)' THEN 'RUN'
  ELSE 'PASS'
END
WHERE play_type IS NULL OR trim(play_type) = '' OR upper(play_type) NOT IN ('RUN', 'PASS', 'RPO');

ALTER TABLE cfb26_plays
  ADD CONSTRAINT cfb26_plays_play_type_check
  CHECK (play_type IN ('RUN', 'PASS', 'RPO'));

COMMIT;
