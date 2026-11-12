-- ─── 005: let sessions follow builder-edited programs ────────────────────────
-- The builder can add week 13+ and a 6th+ day to a week, but these checks
-- (written for the fixed 12 × 5 program) made starting such a workout fail.
-- Keep the lower bounds; the program schedule decides the upper ones.

ALTER TABLE workout_sessions DROP CONSTRAINT IF EXISTS workout_sessions_week_check;
ALTER TABLE workout_sessions ADD CONSTRAINT workout_sessions_week_check CHECK (week >= 1);

ALTER TABLE workout_sessions DROP CONSTRAINT IF EXISTS workout_sessions_day_index_check;
ALTER TABLE workout_sessions ADD CONSTRAINT workout_sessions_day_index_check CHECK (day_index >= 0);
