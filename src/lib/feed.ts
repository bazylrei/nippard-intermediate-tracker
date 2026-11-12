import type { WorkoutSession } from "./types";
import type { SessionSetRef } from "./db";

export interface WorkoutFeedItem {
  session: WorkoutSession;
  exerciseCount: number;
  setCount: number;
}

export function buildWorkoutFeed(sessions: WorkoutSession[], sets: SessionSetRef[]): WorkoutFeedItem[] {
  const bySession = new Map<string, { exercises: Set<string>; sets: number }>();
  for (const s of sets) {
    const entry = bySession.get(s.sessionId) ?? { exercises: new Set<string>(), sets: 0 };
    entry.exercises.add(s.exerciseId);
    entry.sets += 1;
    bySession.set(s.sessionId, entry);
  }
  return sessions.map((session) => {
    const entry = bySession.get(session.id);
    return { session, exerciseCount: entry?.exercises.size ?? 0, setCount: entry?.sets ?? 0 };
  });
}
