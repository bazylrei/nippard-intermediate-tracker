-- ─── Failure Techniques ──────────────────────────────────────────────────────

CREATE TABLE failure_techniques (
  id          text PRIMARY KEY,
  label       text NOT NULL,
  description text NOT NULL
);

ALTER TABLE failure_techniques ENABLE ROW LEVEL SECURITY;

CREATE POLICY "failure_techniques_select"
  ON failure_techniques FOR SELECT
  TO authenticated
  USING (true);

INSERT INTO failure_techniques (id, label, description) VALUES
  ('failure',        'Take to Failure',               'Push until you can''t complete another rep with good form.'),
  ('failure+llps',   'Failure + Lengthened Partials',  'After reaching failure, continue with partial reps in the most stretched position.'),
  ('myo-reps',       'Myo-Reps',                       'After reaching failure, rest 3–5 breaths and do mini-sets of 3–5 reps until form breaks.'),
  ('static-stretch', 'Static Stretch',                 'On the last set, hold the stretched position for 30 seconds instead of doing extra reps.'),
  ('rpe',            'RPE Target',                     'Stop when you hit the target RPE — do not push to full failure on this set.');

-- Enforce referential integrity going forward
ALTER TABLE program_day_exercises
  ADD CONSTRAINT fk_last_set_target
  FOREIGN KEY (last_set_target) REFERENCES failure_techniques (id);
