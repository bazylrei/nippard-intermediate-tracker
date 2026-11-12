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
  youtubeUrl?: string | null;
  instructions?: string | null;
  isBodyweight: boolean;
  weightPerSide: boolean;
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
  bodyWeightKg?: number | null;
  heightCm?: number | null;
  exerciseNotes: Record<string, string>; // exerciseId -> user's personal note
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
  programId: string | null;
  week: number;
  dayIndex: number; // 0–4
  dayType: DayType;
  startedAt: string;
  completedAt: string | null;
  currentExerciseIndex: number;
  currentSetIndex: number;
}

export interface ProgramRow {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  totalWeeks: number;
  createdBy: string | null;
  isPublic: boolean;
  createdAt: string;
  userCount: number;
}

export interface BuilderExercise {
  pdeId: string;
  exerciseId: string;
  name: string;
  position: number;
  repRangeMin: number;
  repRangeMax: number;
  earlySetCount: number;
  lastSetCount: number;
  earlySetRpeMin: number;
  earlySetRpeMax: number;
  lastSetRpeMin: number | null;
  lastSetRpeMax: number | null;
  lastSetTarget: string;
  warmupProtocol: string;
}

export interface BuilderDay {
  pdId: string;
  week: number;
  dayIndex: number;
  dayType: string;
  exercises: BuilderExercise[];
}

export interface BuilderProgram {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  isPublic: boolean;
  createdBy: string | null;
  totalWeeks: number;
  days: BuilderDay[];
  userCount: number;
}

export interface PersonalRecord {
  exerciseId: string;
  exerciseName: string;
  weight: number;
  reps: number;
  estimatedOneRm: number;
  achievedAt: string;
}
