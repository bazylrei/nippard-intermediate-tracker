import { getSignedInUser } from "./auth";
import {
  createSession, getIncompleteSessionWithSets, getLastSetsForExercises, getPreferences,
} from "./db";
import { cachePrefs } from "./prefs-cache";
import { resolveExercises, writeBanner } from "./workout-helpers";
import type { Exercise, SetLog, UserPreferences, WorkoutSession } from "./types";

export type WorkoutPhase = "overview" | "warmup" | "sets";

export interface WorkoutBootstrap {
  userId: string;
  prefs: UserPreferences;
  session: WorkoutSession;
  sessionSets: SetLog[];
  /** Previous-session working sets for every exercise of the day, keyed by exercise id. */
  prevSetsByExercise: Record<string, SetLog[]>;
  exerciseIndex: number;
  setIndex: number;
  phase: WorkoutPhase;
}

interface Params {
  week: number;
  dayIndex: number;
  programId: string | null;
  /** The scheduled day being trained — callers must not start a workout for a day that doesn't exist. */
  workoutDay: { dayType: string; exercises: Exercise[] };
}

export async function bootstrapWorkout({ week, dayIndex, programId, workoutDay }: Params): Promise<WorkoutBootstrap | null> {
  const user = await getSignedInUser();
  if (!user) return null;

  const { exercises, dayType } = workoutDay;
  // Everything the page needs, in one parallel round trip.
  const [prefs, existing, prevSetsByExercise] = await Promise.all([
    getPreferences(user.id),
    getIncompleteSessionWithSets(user.id),
    getLastSetsForExercises(exercises.map((ex) => ex.id)),
  ]);
  cachePrefs(prefs);

  const resumable = !!existing && existing.session.week === week && existing.session.dayIndex === dayIndex
    && existing.session.currentExerciseIndex < exercises.length;

  let session: WorkoutSession;
  let sessionSets: SetLog[] = [];
  let phase: WorkoutPhase = "overview";
  if (resumable) {
    session = existing.session;
    sessionSets = existing.sets;
    phase = session.currentSetIndex === -1 ? "warmup" : "sets";
  } else {
    session = await createSession(user.id, week, dayIndex, dayType, programId);
  }

  const exerciseIndex = resumable ? session.currentExerciseIndex : 0;
  const setIndex = resumable ? session.currentSetIndex : 0;
  writeBanner(session.currentExerciseIndex ?? 0, resolveExercises(exercises, prefs.alternateSelections), week, dayIndex, session.dayType);

  return { userId: user.id, prefs, session, sessionSets, prevSetsByExercise, exerciseIndex, setIndex, phase };
}
