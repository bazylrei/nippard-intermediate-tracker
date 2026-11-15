-- ─── 006: all-time best working set per exercise ────────────────────────────
-- For each exercise, the caller's heaviest working set from a completed
-- session (most reps breaks a weight tie, then the most recent). Shown next to
-- "Last time" when it beats everything in that session.

CREATE OR REPLACE FUNCTION best_sets_for_exercises(p_exercise_ids text[])
RETURNS SETOF public.set_logs
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = ''
AS $$
  SELECT DISTINCT ON (l.exercise_id) l.*
  FROM public.set_logs l
  JOIN public.workout_sessions s ON s.id = l.session_id
  WHERE l.user_id = (SELECT auth.uid())
    AND l.exercise_id = ANY (p_exercise_ids)
    AND l.set_index >= 0
    AND s.completed_at IS NOT NULL
  ORDER BY l.exercise_id, l.weight_kg DESC, l.reps DESC, l.logged_at DESC;
$$;

REVOKE EXECUTE ON FUNCTION best_sets_for_exercises(text[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION best_sets_for_exercises(text[]) TO authenticated;
