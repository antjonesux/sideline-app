-- Run in Supabase SQL editor after reviewing Step 1 output.
-- Removes duplicate cfb26_plays rows that differ only by whitespace/casing in play_name.

-- Step 1: preview duplicates (normalized whitespace + upper)
WITH normalized AS (
  SELECT
    id,
    playbook,
    formation,
    play_name,
    upper(trim(regexp_replace(play_name, '\s+', ' ', 'g'))) AS normalized_name,
    row_number() OVER (
      PARTITION BY playbook, formation, upper(trim(regexp_replace(play_name, '\s+', ' ', 'g')))
      ORDER BY id
    ) AS rn
  FROM cfb26_plays
)
SELECT id, playbook, formation, play_name, normalized_name
FROM normalized
WHERE rn > 1
ORDER BY playbook, formation, normalized_name;

-- Step 2: delete duplicate rows (keeps lowest id per group)
-- WITH normalized AS (
--   SELECT
--     id,
--     row_number() OVER (
--       PARTITION BY playbook, formation, upper(trim(regexp_replace(play_name, '\s+', ' ', 'g')))
--       ORDER BY id
--     ) AS rn
--   FROM cfb26_plays
-- )
-- DELETE FROM cfb26_plays
-- WHERE id IN (SELECT id FROM normalized WHERE rn > 1);

-- Step 3: normalize remaining play_name spacing + case
-- UPDATE cfb26_plays
-- SET play_name = upper(trim(regexp_replace(play_name, '\s+', ' ', 'g')))
-- WHERE play_name <> upper(trim(regexp_replace(play_name, '\s+', ' ', 'g')));
