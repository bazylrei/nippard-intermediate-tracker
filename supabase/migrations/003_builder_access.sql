-- ─── Add program_id to workout_sessions ──────────────────────────────────────

ALTER TABLE workout_sessions
  ADD COLUMN IF NOT EXISTS program_id uuid REFERENCES programs(id) ON DELETE SET NULL;

-- ─── Add category to programs ─────────────────────────────────────────────────

ALTER TABLE programs ADD COLUMN IF NOT EXISTS category text;

-- ─── RLS: programs (authenticated users can create; only creator can modify) ──

CREATE POLICY "programs_insert"
  ON programs FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "programs_update"
  ON programs FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "programs_delete"
  ON programs FOR DELETE
  TO authenticated
  USING (created_by = auth.uid());

-- ─── RLS: program_days ────────────────────────────────────────────────────────

CREATE POLICY "program_days_insert"
  ON program_days FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM programs p
      WHERE p.id = program_days.program_id
        AND p.created_by = auth.uid()
    )
  );

CREATE POLICY "program_days_update"
  ON program_days FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM programs p
      WHERE p.id = program_days.program_id
        AND p.created_by = auth.uid()
    )
  );

CREATE POLICY "program_days_delete"
  ON program_days FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM programs p
      WHERE p.id = program_days.program_id
        AND p.created_by = auth.uid()
    )
  );

-- ─── RLS: program_day_exercises ───────────────────────────────────────────────

CREATE POLICY "program_day_exercises_update"
  ON program_day_exercises FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM program_days pd
      JOIN programs p ON p.id = pd.program_id
      WHERE pd.id = program_day_exercises.program_day_id
        AND p.created_by = auth.uid()
    )
  );

CREATE POLICY "program_day_exercises_insert"
  ON program_day_exercises FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM program_days pd
      JOIN programs p ON p.id = pd.program_id
      WHERE pd.id = program_day_exercises.program_day_id
        AND p.created_by = auth.uid()
    )
  );

CREATE POLICY "program_day_exercises_delete"
  ON program_day_exercises FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM program_days pd
      JOIN programs p ON p.id = pd.program_id
      WHERE pd.id = program_day_exercises.program_day_id
        AND p.created_by = auth.uid()
    )
  );

-- ─── RLS: exercises (shared; any authenticated user can insert) ───────────────

CREATE POLICY "exercises_insert"
  ON exercises FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "exercises_update"
  ON exercises FOR UPDATE
  TO authenticated
  USING (true);
