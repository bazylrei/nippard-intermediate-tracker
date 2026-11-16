-- ─── 009: alternates become real exercises, referenced from program slots ────
-- Until now every exercise carried two alternate *names* as text, and logged
-- sets for an alternate were stored under the main exercise's id, so history,
-- "best", progression tips and per-side / bodyweight volume couldn't tell them
-- apart. Alternates are now rows in `exercises`, and each program slot
-- (program_day_exercises) points at up to two of them.
--
-- Additive only: exercises.alternate_1 / alternate_2 stay until 010, once no
-- deployed build reads them. Everything runs in one transaction; the guard at
-- the end aborts (and rolls back) the whole migration if any slot could not be
-- linked to its alternates.

-- 1. Exercises for the alternates that aren't exercises yet. Muscle group,
--    warm-up and rest are inherited from the first exercise each one replaces;
--    the per-side / bodyweight flags are listed here, one by one.
--    per_side:  the logged weight is per hand / per side (volume counts it twice).
--    bodyweight: the logged weight is *added* to body weight (volume adds it).
WITH flags(name, weight_per_side, is_bodyweight) AS (VALUES
  -- abs
  ('Decline Weighted Crunch',                false, false),
  ('Hanging Leg Raise',                      false, true),
  ('Long-Lever Plank',                       false, false),
  ('Modified Candlestick',                   false, true),
  ('Swiss Ball Rollout',                     false, false),
  -- back
  ('Arm-Out Single-Arm DB Row',              true,  false),
  ('DB Shrug',                               true,  false),
  ('Helms Row',                              true,  false),
  ('Incline Chest-Supported DB Row',         true,  false),
  ('Lean-Back Machine Pulldown',             false, false),
  ('Meadows Row',                            true,  false),
  ('Neutral-Grip Pull-Up',                   false, true),
  ('Pull-Up',                                false, true),
  ('Single-Arm DB Row',                      true,  false),
  ('Wide-Grip Lat Pulldown',                 false, false),
  -- biceps
  ('Bayesian High Cable Curl',               true,  false),
  ('Concentration Cable Curl',               true,  false),
  ('DB Curl',                                true,  false),
  ('DB Hammer Curl',                         true,  false),
  ('DB Preacher Curl',                       true,  false),
  ('EZ-Bar Curl',                            false, false),
  ('EZ-Bar Preacher Curl',                   false, false),
  ('Hammer Preacher Curl',                   true,  false),
  ('Incline DB Stretch Curl',                true,  false),
  -- calves
  ('Seated Calf Raise',                      false, false),
  -- chest
  ('45° Incline Machine Press',              false, false),
  ('DB Bench Press',                         true,  false),
  ('Low-to-High Cable Crossover',            true,  false),
  -- hamstrings
  ('Cable Pull-Through',                     false, false),
  ('DB RDL',                                 true,  false),
  ('Glute-Ham Raise',                        false, true),
  ('Nordic Ham Curl',                        false, true),
  ('Snatch-Grip RDL',                        false, false),
  -- hips
  ('Cable Hip Abduction',                    true,  false),
  ('Cable Hip Adduction',                    true,  false),
  ('Copenhagen Hip Adduction',               false, true),
  ('Lateral Band Walk',                      false, false),
  -- quads
  ('DB Static Lunge',                        true,  false),
  ('DB Step-Up',                             true,  false),
  ('DB Walking Lunge',                       true,  false),
  ('Goblet Squat',                           false, false),
  ('High-Bar Back Squat',                    false, false),
  ('Reverse Nordic',                         false, true),
  ('Sissy Squat',                            false, true),
  ('Smith Machine Static Lunge',             false, false),
  -- shoulders
  ('Cable Shoulder Press',                   true,  false),
  ('High-Cable Cuffed Lateral Raise',        true,  false),
  ('Lean-In DB Lateral Raise',               true,  false),
  ('Reverse Pec Deck',                       false, false),
  ('Rope Face Pull',                         false, false),
  -- triceps
  ('Bench Dip',                              false, true),
  ('DB Skull Crusher',                       true,  false),
  ('DB Triceps Kickback',                    true,  false),
  ('Katana Triceps Extension',               true,  false),
  ('Overhead Cable Triceps Extension (Rope)', false, false),
  ('Triceps Pressdown (Rope)',               false, false)
),
alts AS (
  SELECT id AS main_id, alternate_1 AS alt FROM public.exercises WHERE alternate_1 IS NOT NULL
  UNION ALL
  SELECT id, alternate_2 FROM public.exercises WHERE alternate_2 IS NOT NULL
),
missing AS (
  SELECT DISTINCT ON (lower(alt)) alt AS name, main_id
  FROM alts
  WHERE NOT EXISTS (SELECT 1 FROM public.exercises e WHERE lower(e.name) = lower(alts.alt))
  ORDER BY lower(alt), main_id
)
INSERT INTO public.exercises (id, name, muscle_group, warmup_protocol, rest_min, rest_max, is_bodyweight, weight_per_side)
SELECT 'alt-' || trim(both '-' from lower(regexp_replace(m.name, '[^a-zA-Z0-9]+', '-', 'g'))),
       m.name, e.muscle_group, e.warmup_protocol, e.rest_min, e.rest_max, f.is_bodyweight, f.weight_per_side
FROM missing m
JOIN public.exercises e ON e.id = m.main_id
JOIN flags f ON lower(f.name) = lower(m.name);

-- 2. Each slot points at up to two alternate exercises.
ALTER TABLE public.program_day_exercises
  ADD COLUMN alternate_1_exercise_id text REFERENCES public.exercises(id) ON DELETE SET NULL,
  ADD COLUMN alternate_2_exercise_id text REFERENCES public.exercises(id) ON DELETE SET NULL,
  ADD CONSTRAINT program_day_exercises_alternates_differ CHECK (
    alternate_1_exercise_id <> exercise_id
    AND alternate_2_exercise_id <> exercise_id
    AND alternate_1_exercise_id <> alternate_2_exercise_id
  );

CREATE INDEX IF NOT EXISTS program_day_exercises_alt1_idx ON public.program_day_exercises (alternate_1_exercise_id);
CREATE INDEX IF NOT EXISTS program_day_exercises_alt2_idx ON public.program_day_exercises (alternate_2_exercise_id);

-- 3. Link every existing slot to the alternates its exercise listed by name.
UPDATE public.program_day_exercises p
SET alternate_1_exercise_id = a1.id,
    alternate_2_exercise_id = a2.id
FROM public.exercises e
LEFT JOIN public.exercises a1 ON lower(a1.name) = lower(e.alternate_1)
LEFT JOIN public.exercises a2 ON lower(a2.name) = lower(e.alternate_2)
WHERE e.id = p.exercise_id;

-- Guard: a slot whose exercise names an alternate must now point at one.
DO $$
DECLARE unlinked int;
BEGIN
  SELECT count(*) INTO unlinked
  FROM public.program_day_exercises p
  JOIN public.exercises e ON e.id = p.exercise_id
  WHERE (e.alternate_1 IS NOT NULL AND p.alternate_1_exercise_id IS NULL)
     OR (e.alternate_2 IS NOT NULL AND p.alternate_2_exercise_id IS NULL);
  IF unlinked > 0 THEN
    RAISE EXCEPTION '% program slots could not be linked to their alternate exercises', unlinked;
  END IF;
END $$;

-- 4. "Today only" swaps live on the session: { mainExerciseId: chosenExerciseId }.
ALTER TABLE public.workout_sessions
  ADD COLUMN exercise_swaps jsonb NOT NULL DEFAULT '{}'::jsonb;

-- 5. Saved defaults change from { mainExerciseId: 0 | 1 | 2 } (positions) to
--    { mainExerciseId: chosenExerciseId }. Entries for exercises that no longer
--    exist, and 0 / false (the main exercise), are dropped.
UPDATE public.user_preferences up
SET alternate_selections = COALESCE((
  SELECT jsonb_object_agg(k, v)
  FROM (
    SELECT sel.key AS k,
           CASE sel.value #>> '{}' WHEN '1' THEN a1.id WHEN '2' THEN a2.id END AS v
    FROM jsonb_each(up.alternate_selections) sel
    JOIN public.exercises e ON e.id = sel.key
    LEFT JOIN public.exercises a1 ON lower(a1.name) = lower(e.alternate_1)
    LEFT JOIN public.exercises a2 ON lower(a2.name) = lower(e.alternate_2)
    WHERE jsonb_typeof(sel.value) = 'number'
  ) converted
  WHERE v IS NOT NULL
), '{}'::jsonb)
WHERE up.alternate_selections <> '{}'::jsonb;
