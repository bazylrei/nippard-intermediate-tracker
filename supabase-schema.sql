-- Run this in your Supabase SQL editor after creating the project.

-- ─── User preferences ──────────────────────────────────────────────────────────
create table if not exists user_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade unique,
  unit text not null default 'kg' check (unit in ('kg', 'lbs')),
  alternate_selections jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table user_preferences enable row level security;
create policy "Users manage own preferences"
  on user_preferences for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ─── Workout sessions ──────────────────────────────────────────────────────────
create table if not exists workout_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  week int not null check (week >= 1 and week <= 12),
  day_index int not null check (day_index >= 0 and day_index <= 4),
  day_type text not null,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  current_exercise_index int not null default 0,
  current_set_index int not null default 0
);
alter table workout_sessions enable row level security;
create policy "Users manage own sessions"
  on workout_sessions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index on workout_sessions(user_id, week, day_index);
create index on workout_sessions(user_id, completed_at);

-- ─── Set logs ──────────────────────────────────────────────────────────────────
create table if not exists set_logs (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references workout_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  exercise_id text not null,
  set_index int not null,          -- negative = warm-up, 0+ = working
  is_last_set boolean not null default false,
  weight_kg numeric(6,2) not null,
  reps int not null,
  rpe numeric(3,1),
  failure_hit boolean,
  logged_at timestamptz not null default now()
);
alter table set_logs enable row level security;
create policy "Users manage own set logs"
  on set_logs for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index on set_logs(user_id, exercise_id);
create index on set_logs(session_id);
create index on set_logs(user_id, logged_at);

-- ─── Convenience view: personal records ────────────────────────────────────────
create or replace view personal_records as
select distinct on (user_id, exercise_id)
  user_id,
  exercise_id,
  weight_kg,
  reps,
  round((weight_kg * (1 + reps::numeric / 30))::numeric, 1) as estimated_one_rm_kg,
  logged_at
from set_logs
where set_index >= 0  -- exclude warm-ups
order by user_id, exercise_id, (weight_kg * (1 + reps::numeric / 30)) desc;

-- ─── Updated_at trigger for preferences ────────────────────────────────────────
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
create trigger set_updated_at
  before update on user_preferences
  for each row execute function update_updated_at();
