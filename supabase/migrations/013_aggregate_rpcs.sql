-- ─── 013: read-side aggregation RPCs ────────────────────────────────────────
-- Additive: only new functions, nothing existing changes, so this can be
-- applied before the app version that calls them is deployed.
-- All three are SECURITY INVOKER: RLS still applies, and each one filters on
-- the caller's own id.

-- Working sets of completed sessions, grouped by program week, exercise and the
-- day they were logged (in the caller's time zone, which decides which weigh-in
-- applies). Replaces downloading every set to add them up in the browser.
CREATE OR REPLACE FUNCTION public.weekly_volume_groups(p_tz text)
RETURNS TABLE (week int, exercise_id text, logged_on date, weight_reps numeric, reps bigint)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = ''
AS $$
  SELECT s.week,
         l.exercise_id,
         (l.logged_at AT TIME ZONE p_tz)::date AS logged_on,
         SUM(l.weight_kg * l.reps)::numeric AS weight_reps,
         SUM(l.reps)::bigint AS reps
  FROM public.set_logs l
  JOIN public.workout_sessions s ON s.id = l.session_id
  WHERE l.user_id = (SELECT auth.uid())
    AND l.set_index >= 0
    AND s.completed_at IS NOT NULL
  GROUP BY s.week, l.exercise_id, (l.logged_at AT TIME ZONE p_tz)::date
  ORDER BY s.week, l.exercise_id, logged_on;
$$;

-- Ids of every exercise the caller has logged a working set for.
CREATE OR REPLACE FUNCTION public.logged_exercise_ids()
RETURNS SETOF text
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = ''
AS $$
  SELECT DISTINCT l.exercise_id
  FROM public.set_logs l
  WHERE l.user_id = (SELECT auth.uid())
    AND l.set_index >= 0;
$$;

-- Where the caller is in their program, in one round trip: the latest unfinished
-- workout (with its working-set count) and every completed workout's slot, newest first.
CREATE OR REPLACE FUNCTION public.workout_overview()
RETURNS jsonb
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = ''
AS $$
  SELECT jsonb_build_object(
    'unfinished', (
      SELECT jsonb_build_object(
        'id', s.id, 'week', s.week, 'day_index', s.day_index, 'day_type', s.day_type,
        'set_count', (SELECT count(*) FROM public.set_logs l WHERE l.session_id = s.id AND l.set_index >= 0)
      )
      FROM public.workout_sessions s
      WHERE s.user_id = (SELECT auth.uid()) AND s.completed_at IS NULL
      ORDER BY s.started_at DESC
      LIMIT 1
    ),
    'completed', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('id', c.id, 'week', c.week, 'day_index', c.day_index) ORDER BY c.completed_at DESC)
      FROM public.workout_sessions c
      WHERE c.user_id = (SELECT auth.uid()) AND c.completed_at IS NOT NULL
    ), '[]'::jsonb)
  );
$$;

REVOKE EXECUTE ON FUNCTION public.weekly_volume_groups(text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.logged_exercise_ids() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.workout_overview() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.weekly_volume_groups(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.logged_exercise_ids() TO authenticated;
GRANT EXECUTE ON FUNCTION public.workout_overview() TO authenticated;
