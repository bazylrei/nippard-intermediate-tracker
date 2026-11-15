-- ─── 007: body-weight history and the week-start preference ─────────────────
-- Body weight becomes a dated history (one entry per user per day) instead of
-- a single value on user_preferences, so volume can use what you weighed at the
-- time. `source` lets health integrations (Apple Health, Google Fit) add entries
-- later. Additive only: user_preferences.body_weight_kg is copied here and
-- dropped in 008, once no deployed code reads it.

CREATE TABLE IF NOT EXISTS public.body_weight_logs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  logged_on   date NOT NULL,
  weight_kg   numeric NOT NULL CHECK (weight_kg > 0),
  source      text NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'apple_health', 'google_fit')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, logged_on)
);

ALTER TABLE public.body_weight_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own body weight" ON public.body_weight_logs
  FOR ALL TO authenticated
  USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);

-- Carry over today's single value as the first entry.
INSERT INTO public.body_weight_logs (user_id, logged_on, weight_kg)
SELECT user_id, updated_at::date, body_weight_kg
FROM public.user_preferences
WHERE body_weight_kg IS NOT NULL AND body_weight_kg > 0
ON CONFLICT (user_id, logged_on) DO NOTHING;

-- 0 = Sunday … 6 = Saturday; Monday by default. Only drives the weekly weigh-in
-- prompt — volume groups by program week, not calendar week.
ALTER TABLE public.user_preferences
  ADD COLUMN IF NOT EXISTS week_starts_on smallint NOT NULL DEFAULT 1 CHECK (week_starts_on BETWEEN 0 AND 6);
