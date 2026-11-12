import type { SetLog, WorkoutPosition } from "./types";

/** The one place that knows the URL for training a scheduled day. */
export function startWorkoutHref({ week, dayIndex }: WorkoutPosition): string {
  return `/workout?week=${week}&day=${dayIndex}`;
}

/** The one place that knows the URL of a workout's detail page. */
export function workoutDetailHref(sessionId: string): string {
  return `/history/${sessionId}`;
}

export interface ExerciseSets {
  exerciseId: string;
  sets: SetLog[];
}

/** Working sets (warm-ups dropped) grouped by exercise, in the order each exercise was first logged. */
export function groupWorkingSets(sets: SetLog[]): ExerciseSets[] {
  const groups = new Map<string, SetLog[]>();
  for (const s of sets) {
    if (s.setIndex < 0) continue;
    const list = groups.get(s.exerciseId) ?? [];
    list.push(s);
    groups.set(s.exerciseId, list);
  }
  return Array.from(groups, ([exerciseId, list]) => ({ exerciseId, sets: list }));
}

const slotKey = ({ week, dayIndex }: WorkoutPosition) => `${week}:${dayIndex}`;

/**
 * Most recent session id for each program slot. Expects `slots` newest-first,
 * so a repeated slot (e.g. a second run through the program) resolves to the latest.
 */
export function latestSessionBySlot(
  slots: (WorkoutPosition & { sessionId: string })[]
): (position: WorkoutPosition) => string | undefined {
  const bySlot = new Map<string, string>();
  for (const slot of slots) {
    const key = slotKey(slot);
    if (!bySlot.has(key)) bySlot.set(key, slot.sessionId);
  }
  return (position) => bySlot.get(slotKey(position));
}
