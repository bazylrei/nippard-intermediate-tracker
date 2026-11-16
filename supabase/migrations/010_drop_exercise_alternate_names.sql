-- ─── 010: drop exercises.alternate_1 / alternate_2 ───────────────────────────
-- Alternates are now exercises referenced from program_day_exercises (009).
-- Apply only AFTER the app version that reads those references is deployed:
-- older builds select these columns and would fail to load the program.

ALTER TABLE public.exercises
  DROP COLUMN IF EXISTS alternate_1,
  DROP COLUMN IF EXISTS alternate_2;
