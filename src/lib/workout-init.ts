import { getSignedInUser } from "./auth";
import {
  createSession, getBestSetsForExercises, getIncompleteSessionWithSets, getLastSetsForExercises, getPreferences,
} from "./db";
import { cachePrefs } from "./prefs-cache";
import { exerciseOptions, mergeChoices } from "./alternates";
import { phaseAt, resolveExercises, saveWorkoutInProgress, type WorkoutPhase } from "./workout-helpers";
import type { Exercise, ExerciseRecord, SetLog, UserPreferences, WorkoutSession } from "./types";


export interface WorkoutBootstrap {
  userId: string;
  prefs: UserPreferences;
  /** The unfinished session being resumed; null for a new workout, which gets one only once it's begun. */
  session: WorkoutSession | null;
  sessionSets: SetLog[];
  /** Last-session sets and all-time best for every exercise of the day, keyed by exercise id. */
  recordsByExercise: Record<string, ExerciseRecord>;
  exerciseIndex: number;
  setIndex: number;
  phase: WorkoutPhase;
}

interface Params {
  week: number;
  dayIndex: number;
  /** The scheduled day being trained — callers must not start a workout for a day that doesn't exist. */
  workoutDay: { dayType: string; exercises: Exercise[] };
}

export async function bootstrapWorkout({ week, dayIndex, workoutDay }: Params): Promise<WorkoutBootstrap | null> {
  const user = await getSignedInUser();
  if (!user) return null;

  const { exercises } = workoutDay;
  // Everything the page needs, in one parallel round trip.
  // A slot can be done as its own exercise or either alternate, and swapped before the first set,
  // so load last-time and best for all of them in the same round trip.
  const exerciseIds = [...new Set(exercises.flatMap((ex) => exerciseOptions(ex).map((option) => option.id)))];
  const [prefs, existing, lastSets, bestSets] = await Promise.all([
    getPreferences(user.id),
    getIncompleteSessionWithSets(user.id),
    getLastSetsForExercises(exerciseIds),
    getBestSetsForExercises(exerciseIds),
  ]);
  cachePrefs(prefs);

  const resumable = !!existing && existing.session.week === week && existing.session.dayIndex === dayIndex
    && existing.session.currentExerciseIndex < exercises.length;

  const recordsByExercise = mergeRecords(lastSets, bestSets);
  if (!resumable) {
    // Opening a day only shows it: the session (and its timer) starts when the workout is begun.
    return { userId: user.id, prefs, session: null, sessionSets: [], recordsByExercise, exerciseIndex: 0, setIndex: 0, phase: "overview" };
  }

  const session = existing.session;
  saveWorkoutInProgress(session.currentExerciseIndex ?? 0, resolveExercises(exercises, mergeChoices(prefs.alternateSelections, session.exerciseSwaps)), session);
  return {
    userId: user.id, prefs, session, sessionSets: existing.sets, recordsByExercise,
    exerciseIndex: session.currentExerciseIndex, setIndex: session.currentSetIndex, phase: phaseAt(session.currentSetIndex),
  };
}

interface BeginParams {
  userId: string;
  week: number;
  dayIndex: number;
  programId: string | null;
  dayType: string;
  /** The day's exercises with alternates resolved, for the Workout tab's in-progress entry. */
  exercises: Exercise[];
}

/** Starts the workout: creates its session (the timer starts now) and marks it in progress for the Workout tab. */
export async function beginWorkout({ userId, week, dayIndex, programId, dayType, exercises }: BeginParams): Promise<WorkoutSession> {
  const session = await createSession(userId, week, dayIndex, dayType, programId);
  saveWorkoutInProgress(0, exercises, session);
  return session;
}

function mergeRecords(lastSets: Record<string, SetLog[]>, bestSets: Record<string, SetLog>): Record<string, ExerciseRecord> {
  const records: Record<string, ExerciseRecord> = {};
  for (const id of new Set([...Object.keys(lastSets), ...Object.keys(bestSets)])) {
    records[id] = { lastSets: lastSets[id] ?? [], bestSet: bestSets[id] };
  }
  return records;
}
