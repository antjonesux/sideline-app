-- QA23: Deduplicate play names normalized by collapsing internal digit-spaces
-- Preview duplicates with the SELECT before running the DELETE
-- Rollback: no rollback possible for deleted rows — take a backup first

-- NOTE: play_sheet_plays has no created_at column in this schema.
-- Keep order is determined by lowest play_order, then lowest id as a stable tiebreaker.

-- Preview duplicates before deleting (run this first, review output)
SELECT
  scenario_id,
  formation,
  LOWER(
    REGEXP_REPLACE(
      REGEXP_REPLACE(TRIM(play_name), '\s+', ' ', 'g'),
      '(\d)\s+(\d)',
      '\1\2',
      'g'
    )
  ) AS normalized_name,
  COUNT(*) AS count,
  ARRAY_AGG(id ORDER BY play_order ASC, id ASC) AS ids
FROM play_sheet_plays
GROUP BY
  scenario_id,
  formation,
  LOWER(
    REGEXP_REPLACE(
      REGEXP_REPLACE(TRIM(play_name), '\s+', ' ', 'g'),
      '(\d)\s+(\d)',
      '\1\2',
      'g'
    )
  )
HAVING COUNT(*) > 1;

-- Delete duplicates, keeping lowest play_order then lowest id
DELETE FROM play_sheet_plays
WHERE id IN (
  SELECT UNNEST(ids[2:])
  FROM (
    SELECT ARRAY_AGG(id ORDER BY play_order ASC, id ASC) AS ids
    FROM play_sheet_plays
    GROUP BY
      scenario_id,
      formation,
      LOWER(
        REGEXP_REPLACE(
          REGEXP_REPLACE(TRIM(play_name), '\s+', ' ', 'g'),
          '(\d)\s+(\d)',
          '\1\2',
          'g'
        )
      )
    HAVING COUNT(*) > 1
  ) dupes
);
