-- ─── Warmup Protocols ────────────────────────────────────────────────────────

CREATE TABLE warmup_protocols (
  id    text PRIMARY KEY,
  steps text[] NOT NULL DEFAULT '{}'
);

ALTER TABLE warmup_protocols ENABLE ROW LEVEL SECURITY;

CREATE POLICY "warmup_protocols_select"
  ON warmup_protocols FOR SELECT
  TO authenticated
  USING (true);

-- ─── Exercises ────────────────────────────────────────────────────────────────

CREATE TABLE exercises (
  id               text PRIMARY KEY,
  name             text NOT NULL,
  muscle_group     text NOT NULL,
  alternate_1      text,
  alternate_2      text,
  rest_min         int  NOT NULL,
  rest_max         int  NOT NULL,
  warmup_protocol  text NOT NULL REFERENCES warmup_protocols (id),
  form_note        text,
  youtube_url      text,
  instructions     text
);

ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;

CREATE POLICY "exercises_select"
  ON exercises FOR SELECT
  TO authenticated
  USING (true);

-- ─── Programs ─────────────────────────────────────────────────────────────────

CREATE TABLE programs (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name         text        NOT NULL,
  description  text,
  total_weeks  int         NOT NULL DEFAULT 12,
  created_by   uuid        REFERENCES auth.users (id),
  is_public    bool        NOT NULL DEFAULT false,
  created_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE programs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "programs_select"
  ON programs FOR SELECT
  USING (is_public = true OR created_by = auth.uid());

-- ─── Program Days ─────────────────────────────────────────────────────────────

CREATE TABLE program_days (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id  uuid NOT NULL REFERENCES programs (id) ON DELETE CASCADE,
  week        int  NOT NULL,
  day_index   int  NOT NULL,
  day_type    text NOT NULL,
  UNIQUE (program_id, week, day_index)
);

ALTER TABLE program_days ENABLE ROW LEVEL SECURITY;

CREATE POLICY "program_days_select"
  ON program_days FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM programs p
      WHERE p.id = program_days.program_id
        AND (p.is_public = true OR p.created_by = auth.uid())
    )
  );

-- ─── Program Day Exercises ────────────────────────────────────────────────────

CREATE TABLE program_day_exercises (
  id                  uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  program_day_id      uuid    NOT NULL REFERENCES program_days (id) ON DELETE CASCADE,
  exercise_id         text    NOT NULL REFERENCES exercises (id),
  position            int     NOT NULL,
  rep_range_min       int     NOT NULL,
  rep_range_max       int     NOT NULL,
  early_set_count     int     NOT NULL DEFAULT 0,
  last_set_count      int     NOT NULL DEFAULT 1,
  early_set_rpe_min   numeric NOT NULL,
  early_set_rpe_max   numeric NOT NULL,
  last_set_rpe_min    numeric,
  last_set_rpe_max    numeric,
  last_set_target     text    NOT NULL DEFAULT 'failure'
);

ALTER TABLE program_day_exercises ENABLE ROW LEVEL SECURITY;

CREATE POLICY "program_day_exercises_select"
  ON program_day_exercises FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM program_days pd
      JOIN programs p ON p.id = pd.program_id
      WHERE pd.id = program_day_exercises.program_day_id
        AND (p.is_public = true OR p.created_by = auth.uid())
    )
  );
