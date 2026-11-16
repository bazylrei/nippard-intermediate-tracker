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
  session: WorkoutSession;
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
  programId: string | null;
  /** The scheduled day being trained — callers must not start a workout for a day that doesn't exist. */
  workoutDay: { dayType: string; exercises: Exercise[] };
}

export async function bootstrapWorkout({ week, dayIndex, programId, workoutDay }: Params): Promise<WorkoutBootstrap | null> {
  const user = await getSignedInUser();
  if (!user) return null;

  const { exercises, dayType } = workoutDay;
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

  let session: WorkoutSession;
  let sessionSets: SetLog[] = [];
  let phase: WorkoutPhase = "overview";
  if (resumable) {
    session = existing.session;
    sessionSets = existing.sets;
    phase = phaseAt(session.currentSetIndex);
  } else {
    session = await createSession(user.id, week, dayIndex, dayType, programId);
  }

  const exerciseIndex = resumable ? session.currentExerciseIndex : 0;
  const setIndex = resumable ? session.currentSetIndex : 0;
  saveWorkoutInProgress(session.currentExerciseIndex ?? 0, resolveExercises(exercises, mergeChoices(prefs.alternateSelections, session.exerciseSwaps)), session);

  const recordsByExercise = mergeRecords(lastSets, bestSets);
  return { userId: user.id, prefs, session, sessionSets, recordsByExercise, exerciseIndex, setIndex, phase };
}

function mergeRecords(lastSets: Record<string, SetLog[]>, bestSets: Record<string, SetLog>): Record<string, ExerciseRecord> {
  const records: Record<string, ExerciseRecord> = {};
  for (const id of new Set([...Object.keys(lastSets), ...Object.keys(bestSets)])) {
    records[id] = { lastSets: lastSets[id] ?? [], bestSet: bestSets[id] };
  }
  return records;
}
