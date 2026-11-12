"use client";

import type { WorkoutSession } from "@/lib/types";
import SessionCard from "./SessionCard";
import EmptyState from "./EmptyState";

interface Props {
  sessions: WorkoutSession[];
  loaded: boolean;
  onSessionsUpdate: (s: WorkoutSession[]) => void;
  exerciseName: Record<string, string>;
  allExercises: { id: string; name: string; muscleGroup: string }[];
  userId: string | null;
}

export default function HistoryTab({ sessions, loaded, onSessionsUpdate, exerciseName, allExercises, userId }: Props) {
  if (!loaded) {
    return <div className="text-center py-16 text-muted text-sm font-display">Loading history…</div>;
  }
  if (sessions.length === 0) {
    return <EmptyState message="No completed workouts yet." />;
  }
  return (
    <div className="space-y-3">
      {sessions.map((session) => (
        <SessionCard
          key={session.id}
          session={session}
          exerciseName={exerciseName}
          allExercises={allExercises}
          userId={userId}
          onDelete={() => onSessionsUpdate(sessions.filter((s) => s.id !== session.id))}
        />
      ))}
    </div>
  );
}
