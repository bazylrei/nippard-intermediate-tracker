-- ─── 008: drop user_preferences.body_weight_kg ──────────────────────────────
-- Apply only AFTER the app version that reads body_weight_logs is deployed
-- (older builds select this column and would fail to load preferences).
-- Body weight now lives in body_weight_logs (007). Re-copy first, in case it
-- was changed by an older build after 007 ran.

INSERT INTO public.body_weight_logs (user_id, logged_on, weight_kg)
SELECT user_id, updated_at::date, body_weight_kg
FROM public.user_preferences
WHERE body_weight_kg IS NOT NULL AND body_weight_kg > 0
ON CONFLICT (user_id, logged_on) DO NOTHING;

ALTER TABLE public.user_preferences DROP COLUMN IF EXISTS body_weight_kg;
