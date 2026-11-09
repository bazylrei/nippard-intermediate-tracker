export type FailureTechnique =
  | "failure"
  | "failure+llps"
  | "myo-reps"
  | "static-stretch"
  | "rpe";

export type WarmupProtocol = "none" | "1-set" | "2-set" | "3-set" | "4-set";

export interface Exercise {
  id: string;
  name: string;
  alternates: [string, string];
  muscleGroup: MuscleGroup;
  restSeconds: [number, number]; // [min, max]
  warmupProtocol: WarmupProtocol;
  repRange: [number, number];
  earlySetRpe: [number, number];
  lastSetTarget: FailureTechnique;
  lastSetRpe?: [number, number]; // only when lastSetTarget === "rpe"
  earlySetCount: number;
  lastSetCount: number;
  formNote: string;
}

export type MuscleGroup =
  | "chest"
  | "back"
  | "shoulders"
  | "biceps"
  | "triceps"
  | "quads"
  | "hamstrings"
  | "glutes"
  | "calves"
  | "abs"
  | "hips";

export type DayType = "upper-a" | "lower-a" | "back-biceps" | "push" | "lower-b";

export interface WorkoutDay {
  dayType: DayType;
  exercises: Exercise[];
}

export interface WeekSchedule {
  week: number;
  days: WorkoutDay[];
}

// --- DB / session types ---

export interface UserPreferences {
  unit: "kg" | "lbs";
  alternateSelections: Record<string, number>; // exerciseId -> 0 (main) | 1 (alt1) | 2 (alt2)
}

export interface SetLog {
  id: string;
  sessionId: string;
  userId: string;
  exerciseId: string;
  setIndex: number; // 0-based; warm-up sets are negative (-3, -2, -1)
  isLastSet: boolean;
  weight: number; // always stored in kg
  reps: number;
  rpe: number | null;
  failureHit: boolean | null;
  loggedAt: string; // ISO timestamp
}

export interface WorkoutSession {
  id: string;
  userId: string;
  week: number;
  dayIndex: number; // 0–4
  dayType: DayType;
  startedAt: string;
  completedAt: string | null;
  currentExerciseIndex: number;
  currentSetIndex: number;
}

export interface PersonalRecord {
  exerciseId: string;
  exerciseName: string;
  weight: number;
  reps: number;
  estimatedOneRm: number;
  achievedAt: string;
}
