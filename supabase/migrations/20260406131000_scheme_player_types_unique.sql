-- Drop duplicate player-type rows (e.g. from repeated seed runs); keep one row per (scheme_id, position).
DELETE FROM scheme_player_types
WHERE id IN (
  SELECT id
  FROM (
    SELECT
      id,
      ROW_NUMBER() OVER (
        PARTITION BY scheme_id, position
        ORDER BY created_at ASC NULLS LAST, id ASC
      ) AS rn
    FROM scheme_player_types
  ) t
  WHERE t.rn > 1
);

CREATE UNIQUE INDEX IF NOT EXISTS scheme_player_types_scheme_id_position_key
  ON scheme_player_types (scheme_id, position);
