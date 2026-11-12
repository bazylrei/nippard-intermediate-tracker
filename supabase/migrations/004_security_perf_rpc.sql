-- ─── 004: security fixes, RLS/index performance, round-trip-saving RPCs ──────

-- ─── Record columns that were added to the live DB outside of migrations ─────
-- (idempotent: these already exist in production; this keeps the repo honest)

ALTER TABLE exercises ADD COLUMN IF NOT EXISTS equipment       text;
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS is_bodyweight   boolean NOT NULL DEFAULT false;
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS weight_per_side boolean NOT NULL DEFAULT false;

ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS body_weight_kg double precision;
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS height_cm      double precision;
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS exercise_notes jsonb NOT NULL DEFAULT '{}';

-- ─── Security ────────────────────────────────────────────────────────────────

-- SECURITY DEFINER view bypassed RLS and exposed every user's PRs. Unused by the app.
DROP VIEW IF EXISTS personal_records;

-- Any authenticated user could insert/rewrite shared exercises (names, YouTube links).
-- The app never writes exercises; seeding uses the service role, which bypasses RLS.
DROP POLICY IF EXISTS "exercises_insert" ON exercises;
DROP POLICY IF EXISTS "exercises_update" ON exercises;

ALTER FUNCTION update_updated_at() SET search_path = '';

-- ─── RLS: evaluate auth.uid() once per query, not once per row ───────────────
-- https://supabase.com/docs/guides/database/postgres/row-level-security#call-functions-with-select

ALTER POLICY "Users manage own preferences" ON user_preferences TO authenticated
  USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);
ALTER POLICY "Users manage own sessions" ON workout_sessions TO authenticated
  USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);
ALTER POLICY "Users manage own set logs" ON set_logs TO authenticated
  USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);

ALTER POLICY "programs_select" ON programs
  USING (is_public = true OR created_by = (SELECT auth.uid()));
ALTER POLICY "programs_insert" ON programs
  WITH CHECK (created_by = (SELECT auth.uid()));
ALTER POLICY "programs_update" ON programs
  USING (created_by = (SELECT auth.uid())) WITH CHECK (created_by = (SELECT auth.uid()));
ALTER POLICY "programs_delete" ON programs
  USING (created_by = (SELECT auth.uid()));

ALTER POLICY "program_days_select" ON program_days
  USING (EXISTS (SELECT 1 FROM programs p WHERE p.id = program_days.program_id
                   AND (p.is_public = true OR p.created_by = (SELECT auth.uid()))));
ALTER POLICY "program_days_insert" ON program_days
  WITH CHECK (EXISTS (SELECT 1 FROM programs p WHERE p.id = program_days.program_id
                        AND p.created_by = (SELECT auth.uid())));
ALTER POLICY "program_days_update" ON program_days
  USING (EXISTS (SELECT 1 FROM programs p WHERE p.id = program_days.program_id
                   AND p.created_by = (SELECT auth.uid())));
ALTER POLICY "program_days_delete" ON program_days
  USING (EXISTS (SELECT 1 FROM programs p WHERE p.id = program_days.program_id
                   AND p.created_by = (SELECT auth.uid())));

ALTER POLICY "program_day_exercises_select" ON program_day_exercises
  USING (EXISTS (SELECT 1 FROM program_days pd JOIN programs p ON p.id = pd.program_id
                 WHERE pd.id = program_day_exercises.program_day_id
                   AND (p.is_public = true OR p.created_by = (SELECT auth.uid()))));
ALTER POLICY "program_day_exercises_insert" ON program_day_exercises
  WITH CHECK (EXISTS (SELECT 1 FROM program_days pd JOIN programs p ON p.id = pd.program_id
                      WHERE pd.id = program_day_exercises.program_day_id
                        AND p.created_by = (SELECT auth.uid())));
ALTER POLICY "program_day_exercises_update" ON program_day_exercises
  USING (EXISTS (SELECT 1 FROM program_days pd JOIN programs p ON p.id = pd.program_id
                 WHERE pd.id = program_day_exercises.program_day_id
                   AND p.created_by = (SELECT auth.uid())));
ALTER POLICY "program_day_exercises_delete" ON program_day_exercises
  USING (EXISTS (SELECT 1 FROM program_days pd JOIN programs p ON p.id = pd.program_id
                 WHERE pd.id = program_day_exercises.program_day_id
                   AND p.created_by = (SELECT auth.uid())));

-- ─── Indexes for unindexed foreign keys ──────────────────────────────────────

CREATE INDEX IF NOT EXISTS exercises_warmup_protocol_idx        ON exercises (warmup_protocol);
CREATE INDEX IF NOT EXISTS program_day_exercises_day_pos_idx    ON program_day_exercises (program_day_id, position);
CREATE INDEX IF NOT EXISTS program_day_exercises_exercise_idx   ON program_day_exercises (exercise_id);
CREATE INDEX IF NOT EXISTS program_day_exercises_target_idx     ON program_day_exercises (last_set_target);
CREATE INDEX IF NOT EXISTS programs_created_by_idx              ON programs (created_by);
CREATE INDEX IF NOT EXISTS workout_sessions_program_id_idx      ON workout_sessions (program_id);

-- ─── RPC: previous working sets for many exercises in one call ───────────────
-- For each exercise, returns the working sets from the most recent completed
-- session that contains it. Replaces a sequential per-session query loop.

CREATE OR REPLACE FUNCTION last_sets_for_exercises(p_exercise_ids text[])
RETURNS SETOF public.set_logs
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = ''
AS $$
  WITH latest AS (
    SELECT DISTINCT ON (l.exercise_id) l.exercise_id, l.session_id
    FROM public.set_logs l
    JOIN public.workout_sessions s ON s.id = l.session_id
    WHERE l.user_id = (SELECT auth.uid())
      AND l.exercise_id = ANY (p_exercise_ids)
      AND l.set_index >= 0
      AND s.completed_at IS NOT NULL
    ORDER BY l.exercise_id, s.completed_at DESC
  )
  SELECT l.*
  FROM public.set_logs l
  JOIN latest ON latest.session_id = l.session_id AND latest.exercise_id = l.exercise_id
  WHERE l.set_index >= 0
  ORDER BY l.exercise_id, l.set_index;
$$;

-- ─── RPC: log a set and advance session progress atomically ──────────────────
-- p_id is a client-generated idempotency key: retrying the same call never
-- creates a duplicate set. Raises if the session is not the caller's.

CREATE OR REPLACE FUNCTION log_set(
  p_id                  uuid,
  p_session_id          uuid,
  p_exercise_id         text,
  p_set_index           int,
  p_is_last_set         boolean,
  p_weight_kg           numeric,
  p_reps                int,
  p_rpe                 numeric,
  p_failure_hit         boolean,
  p_next_exercise_index int,
  p_next_set_index      int,
  p_complete            boolean
)
RETURNS public.set_logs
LANGUAGE plpgsql VOLATILE SECURITY INVOKER SET search_path = ''
AS $$
DECLARE
  v_row public.set_logs;
BEGIN
  UPDATE public.workout_sessions
     SET current_exercise_index = p_next_exercise_index,
         current_set_index      = p_next_set_index,
         completed_at           = CASE WHEN p_complete THEN COALESCE(completed_at, now()) ELSE completed_at END
   WHERE id = p_session_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'session % not found', p_session_id USING ERRCODE = 'P0002';
  END IF;

  INSERT INTO public.set_logs
    (id, session_id, user_id, exercise_id, set_index, is_last_set, weight_kg, reps, rpe, failure_hit)
  VALUES
    (p_id, p_session_id, (SELECT auth.uid()), p_exercise_id, p_set_index, p_is_last_set,
     p_weight_kg, p_reps, p_rpe, p_failure_hit)
  ON CONFLICT (id) DO NOTHING;

  SELECT * INTO v_row FROM public.set_logs WHERE id = p_id;
  RETURN v_row;
END;
$$;

-- ─── RPC: duplicate a program week atomically ────────────────────────────────
-- Either the whole week (days + exercises + total_weeks) is copied, or nothing is.
-- Two INSERT statements (not one CTE) so the second sees the first's rows for RLS.

CREATE OR REPLACE FUNCTION duplicate_program_week(
  p_program_id uuid, p_source_week int, p_target_week int, p_new_total_weeks int
)
RETURNS void
LANGUAGE plpgsql VOLATILE SECURITY INVOKER SET search_path = ''
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.program_days
                 WHERE program_id = p_program_id AND week = p_source_week) THEN
    RETURN;
  END IF;

  UPDATE public.programs SET total_weeks = p_new_total_weeks WHERE id = p_program_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'program % not found or not editable', p_program_id USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.program_days (program_id, week, day_index, day_type)
  SELECT program_id, p_target_week, day_index, day_type
  FROM public.program_days
  WHERE program_id = p_program_id AND week = p_source_week;

  INSERT INTO public.program_day_exercises (
    program_day_id, exercise_id, position, rep_range_min, rep_range_max,
    early_set_count, last_set_count, early_set_rpe_min, early_set_rpe_max,
    last_set_rpe_min, last_set_rpe_max, last_set_target
  )
  SELECT nd.id, e.exercise_id, e.position, e.rep_range_min, e.rep_range_max,
         e.early_set_count, e.last_set_count, e.early_set_rpe_min, e.early_set_rpe_max,
         e.last_set_rpe_min, e.last_set_rpe_max, e.last_set_target
  FROM public.program_days sd
  JOIN public.program_days nd
    ON nd.program_id = sd.program_id AND nd.day_index = sd.day_index AND nd.week = p_target_week
  JOIN public.program_day_exercises e ON e.program_day_id = sd.id
  WHERE sd.program_id = p_program_id AND sd.week = p_source_week;
END;
$$;

-- ─── RPC: distinct users per program ─────────────────────────────────────────
-- SECURITY DEFINER because RLS hides other users' sessions, which made the
-- client-side count always 0 or 1. Exposes only an aggregate count, and only
-- for programs the caller can already see.

CREATE OR REPLACE FUNCTION program_user_counts(p_program_ids uuid[])
RETURNS TABLE (program_id uuid, user_count bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT p.id, count(DISTINCT ws.user_id)
  FROM public.programs p
  LEFT JOIN public.workout_sessions ws ON ws.program_id = p.id
  WHERE p.id = ANY (p_program_ids)
    AND (p.is_public OR p.created_by = (SELECT auth.uid()))
  GROUP BY p.id;
$$;

-- ─── Grants: RPCs are for signed-in users only ───────────────────────────────

REVOKE EXECUTE ON FUNCTION last_sets_for_exercises(text[]) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION log_set(uuid, uuid, text, int, boolean, numeric, int, numeric, boolean, int, int, boolean) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION duplicate_program_week(uuid, int, int, int) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION program_user_counts(uuid[]) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION last_sets_for_exercises(text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION log_set(uuid, uuid, text, int, boolean, numeric, int, numeric, boolean, int, int, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION duplicate_program_week(uuid, int, int, int) TO authenticated;
GRANT EXECUTE ON FUNCTION program_user_counts(uuid[]) TO authenticated;
