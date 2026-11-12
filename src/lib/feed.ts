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

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

/** "Today" / "Yesterday" / "N days ago" (< 7 days) / "Nov 3", by local calendar day. */
export function formatRelativeDay(iso: string, now: Date = new Date()): string {
  const date = new Date(iso);
  const days = Math.round((startOfDay(now) - startOfDay(date)) / 86_400_000);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return `${MONTHS[date.getMonth()]} ${date.getDate()}`;
}
