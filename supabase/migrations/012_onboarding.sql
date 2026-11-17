-- ─── 012: user_preferences.onboarded_at ─────────────────────────────────────
-- When a user finished onboarding; null means they haven't yet.
-- Additive: builds already running never select it, so this can be applied
-- before the app version that reads it is deployed.

ALTER TABLE public.user_preferences
  ADD COLUMN IF NOT EXISTS onboarded_at timestamptz;

-- Accounts already using the app skip onboarding: anyone with saved preferences...
UPDATE public.user_preferences
SET onboarded_at = now()
WHERE onboarded_at IS NULL;

-- ...or with any workout, even if they never changed a setting (no preferences row yet).
INSERT INTO public.user_preferences (user_id, onboarded_at)
SELECT DISTINCT user_id, now()
FROM public.workout_sessions
ON CONFLICT (user_id) DO UPDATE
SET onboarded_at = COALESCE(public.user_preferences.onboarded_at, EXCLUDED.onboarded_at);
