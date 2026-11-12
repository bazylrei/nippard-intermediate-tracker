import { createClient } from "./supabase";
import {
  createSession, getIncompleteSession, getSessionSets, getPreferences,
} from "./db";
import { cacheSet } from "./cache";
import { resolveExercises, writeBanner } from "./workout-helpers";
import type { Exercise, SetLog, UserPreferences, WorkoutSession } from "./types";

export type WorkoutPhase = "overview" | "warmup" | "sets";

export interface WorkoutBootstrap {
  userId: string;
  prefs: UserPreferences;
  session: WorkoutSession;
  sessionSets: SetLog[];
  exerciseIndex: number;
  setIndex: number;
  phase: WorkoutPhase;
}

interface Params {
  week: number;
  dayIndex: number;
  programId: string | null;
  workoutDay: { dayType: string; exercises: Exercise[] } | null | undefined;
}

export async function bootstrapWorkout({ week, dayIndex, programId, workoutDay }: Params): Promise<WorkoutBootstrap | null> {
  const sb = createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return null;

  const [prefs, existing] = await Promise.all([getPreferences(user.id), getIncompleteSession(user.id)]);
  cacheSet("prefs", prefs);

  const exercises = workoutDay?.exercises ?? [];
  const resumable = !!existing && existing.week === week && existing.dayIndex === dayIndex
    && existing.currentExerciseIndex < exercises.length;

  let session: WorkoutSession;
  let sessionSets: SetLog[] = [];
  let phase: WorkoutPhase = "overview";
  if (resumable) {
    session = existing;
    sessionSets = await getSessionSets(existing.id);
    phase = existing.currentSetIndex === -1 ? "warmup" : "sets";
  } else {
    session = await createSession(user.id, week, dayIndex, workoutDay?.dayType ?? "upper-a", programId);
  }

  const exerciseIndex = resumable ? session.currentExerciseIndex : 0;
  const setIndex = resumable ? session.currentSetIndex : 0;
  writeBanner(session.currentExerciseIndex ?? 0, resolveExercises(exercises, prefs.alternateSelections), week, dayIndex, session.dayType);

  return { userId: user.id, prefs, session, sessionSets, exerciseIndex, setIndex, phase };
}
