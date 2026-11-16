-- ─── 011: users can add their own exercises ──────────────────────────────────
-- A custom exercise belongs to its creator (`created_by`); the built-in
-- catalogue has created_by NULL. Custom exercises are private, but anyone who
-- can see a program that uses one (or who logged sets for it) can still read
-- it, so shared programs and history never show a missing exercise.
--
-- Additive only: the live build keeps working before and after.

ALTER TABLE exercises
  ADD COLUMN created_by uuid REFERENCES auth.users (id) ON DELETE CASCADE DEFAULT auth.uid();

CREATE INDEX exercises_created_by_idx ON exercises (created_by);
-- Usage checks look exercises up by alternate as well as by main slot.
CREATE INDEX IF NOT EXISTS program_day_exercises_alt1_idx ON program_day_exercises (alternate_1_exercise_id);
CREATE INDEX IF NOT EXISTS program_day_exercises_alt2_idx ON program_day_exercises (alternate_2_exercise_id);

-- Now that users write rows, reject nonsense at the source.
ALTER TABLE exercises
  ADD CONSTRAINT exercises_name_not_blank CHECK (btrim(name) <> ''),
  ADD CONSTRAINT exercises_rest_range CHECK (rest_min >= 0 AND rest_min <= rest_max),
  ADD CONSTRAINT exercises_muscle_group CHECK (muscle_group IN (
    'chest', 'back', 'shoulders', 'biceps', 'triceps', 'quads',
    'hamstrings', 'glutes', 'calves', 'abs', 'hips'
  )),
  -- Shown as a link to anyone who can see the exercise: no javascript: URLs.
  ADD CONSTRAINT exercises_youtube_url_http CHECK (youtube_url IS NULL OR youtube_url ~* '^https?://');

-- ─── RLS ─────────────────────────────────────────────────────────────────────
-- program_day_exercises and set_logs keep their own RLS inside these
-- subqueries: only programs visible to the caller and the caller's own sets count.

DROP POLICY "exercises_select" ON exercises;
CREATE POLICY "exercises_select"
  ON exercises FOR SELECT
  TO authenticated
  USING (
    created_by IS NULL
    OR created_by = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM program_day_exercises pde
      WHERE exercises.id IN (pde.exercise_id, pde.alternate_1_exercise_id, pde.alternate_2_exercise_id)
    )
    OR EXISTS (SELECT 1 FROM set_logs s WHERE s.exercise_id = exercises.id)
  );

CREATE POLICY "exercises_insert"
  ON exercises FOR INSERT
  TO authenticated
  WITH CHECK (created_by = (SELECT auth.uid()));

CREATE POLICY "exercises_update"
  ON exercises FOR UPDATE
  TO authenticated
  USING (created_by = (SELECT auth.uid()))
  WITH CHECK (created_by = (SELECT auth.uid()));

-- No DELETE policy: deleting goes through delete_own_exercise, which can see
-- every program and every user's sets (set_logs has no foreign key to
-- exercises, and the alternate keys are ON DELETE SET NULL, so a plain delete
-- would silently orphan history or empty program slots).

-- ─── delete_own_exercise ─────────────────────────────────────────────────────
-- Returns true when the exercise is gone (deleted now, or already gone — safe
-- to retry), false when it is used in any program or logged set. Raises when
-- the exercise exists but isn't the caller's.
CREATE FUNCTION public.delete_own_exercise(p_exercise_id text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_owner uuid;
BEGIN
  -- FOR UPDATE blocks a program slot being pointed at it until we're done
  -- (a foreign-key insert needs a share lock on this row).
  SELECT created_by INTO v_owner FROM public.exercises WHERE id = p_exercise_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN true;
  END IF;
  IF v_owner IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'You can only delete exercises you added' USING ERRCODE = '42501';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.program_day_exercises
    WHERE p_exercise_id IN (exercise_id, alternate_1_exercise_id, alternate_2_exercise_id)
  ) OR EXISTS (
    SELECT 1 FROM public.set_logs WHERE exercise_id = p_exercise_id
  ) THEN
    RETURN false;
  END IF;

  DELETE FROM public.exercises WHERE id = p_exercise_id;
  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_own_exercise(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_own_exercise(text) TO authenticated;
