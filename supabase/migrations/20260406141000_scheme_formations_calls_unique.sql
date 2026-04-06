-- Dedupe formations and situational calls (e.g. repeated seed runs).

DELETE FROM scheme_formations
WHERE id IN (
  SELECT id
  FROM (
    SELECT
      id,
      ROW_NUMBER() OVER (
        PARTITION BY scheme_id, formation_name
        ORDER BY created_at ASC NULLS LAST, id ASC
      ) AS rn
    FROM scheme_formations
  ) t
  WHERE t.rn > 1
);

CREATE UNIQUE INDEX IF NOT EXISTS scheme_formations_scheme_id_formation_name_key
  ON scheme_formations (scheme_id, formation_name);

DELETE FROM situational_calls
WHERE id IN (
  SELECT id
  FROM (
    SELECT
      id,
      ROW_NUMBER() OVER (
        PARTITION BY scheme_id, situation
        ORDER BY created_at ASC NULLS LAST, priority ASC NULLS LAST, id ASC
      ) AS rn
    FROM situational_calls
  ) t
  WHERE t.rn > 1
);

CREATE UNIQUE INDEX IF NOT EXISTS situational_calls_scheme_id_situation_key
  ON situational_calls (scheme_id, situation);
