-- ─── 014: each user follows their own program, or none ──────────────────────
-- user_preferences.active_program_id: the program the user follows; null means
-- none (a new user can start without one). Deleting the program clears it.
-- Additive: running builds never select the column, and the no-argument
-- workout_overview() stays until they're gone (drop it in a later migration).

ALTER TABLE public.user_preferences
  ADD COLUMN IF NOT EXISTS active_program_id uuid
  REFERENCES public.programs(id) ON DELETE SET NULL;

-- Until now everyone followed the built-in program: existing accounts keep it.
UPDATE public.user_preferences
SET active_program_id = (SELECT id FROM public.programs WHERE name = 'Nippard Intermediate' AND is_public LIMIT 1)
WHERE active_program_id IS NULL AND onboarded_at IS NOT NULL;

-- Sessions from before program_id was recorded were all in the built-in program.
UPDATE public.workout_sessions
SET program_id = (SELECT id FROM public.programs WHERE name = 'Nippard Intermediate' AND is_public LIMIT 1)
WHERE program_id IS NULL;

-- Where the user is in one program: its unfinished workout, if any, and its completed ones.
-- Workouts in another program don't count, so switching programs starts at that program's first day.
CREATE OR REPLACE FUNCTION public.workout_overview(p_program_id uuid)
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
      WHERE s.user_id = (SELECT auth.uid()) AND s.program_id = p_program_id AND s.completed_at IS NULL
      ORDER BY s.started_at DESC
      LIMIT 1
    ),
    'completed', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('id', c.id, 'week', c.week, 'day_index', c.day_index) ORDER BY c.completed_at DESC)
      FROM public.workout_sessions c
      WHERE c.user_id = (SELECT auth.uid()) AND c.program_id = p_program_id AND c.completed_at IS NOT NULL
    ), '[]'::jsonb)
  );
$$;

REVOKE EXECUTE ON FUNCTION public.workout_overview(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.workout_overview(uuid) TO authenticated;
