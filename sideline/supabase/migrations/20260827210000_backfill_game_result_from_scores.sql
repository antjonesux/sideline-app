-- Backfill game_sessions.result from final scores (idempotent).
-- Ended games: sync result when scores disagree with stored result.
-- In-progress games: clear stale create-default "W" before End Game runs.

UPDATE game_sessions
SET result = CASE
    WHEN my_score > opponent_score THEN 'W'
    WHEN my_score < opponent_score THEN 'L'
    ELSE NULL
END
WHERE ended_at IS NOT NULL
  AND my_score IS NOT NULL
  AND opponent_score IS NOT NULL
  AND (
    (my_score > opponent_score AND result IS DISTINCT FROM 'W') OR
    (my_score < opponent_score AND result IS DISTINCT FROM 'L') OR
    (my_score = opponent_score AND result IS NOT NULL)
  );

UPDATE game_sessions
SET result = NULL
WHERE ended_at IS NULL
  AND result = 'W';
