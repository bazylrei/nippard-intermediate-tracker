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
  /**
   * Up to two exercises the user can do instead, each a full exercise with its
   * own id, flags and history, carrying this slot's sets, reps and RPE targets.
   * Empty on an alternate itself.
   */
  alternates: Exercise[];
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

/** A preset key from `DAY_TYPE_PRESETS` or a builder custom type — see lib/day-types. */
export type DayType = string;

export interface WorkoutDay {
  dayType: DayType;
  exercises: Exercise[];
}

export interface WeekSchedule {
  week: number;
  days: WorkoutDay[];
}

/** A slot in the program: which week and which day of that week. */
export interface WorkoutPosition {
  week: number;
  dayIndex: number;
}

// --- DB / session types ---

export interface UserPreferences {
  unit: "kg" | "lbs";
  /** Default alternate per exercise: main exercise id -> the chosen alternate's exercise id. Absent = the main exercise. */
  alternateSelections: Record<string, string>;
  heightCm?: number | null;
  /** First day of the user's week, 0 = Sunday … 6 = Saturday. Drives the weekly weigh-in prompt. */
  weekStartsOn: number;
  exerciseNotes: Record<string, string>; // exerciseId -> user's personal note
}

/** One weigh-in. Body weight is a dated history; the latest entry is the current weight. */
export interface BodyWeightLog {
  /** Local calendar date, "YYYY-MM-DD". */
  loggedOn: string;
  weightKg: number;
  source: "manual" | "apple_health" | "google_fit";
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

/** An exercise's track record from completed sessions. */
export interface ExerciseRecord {
  /** Working sets from the most recent completed session with this exercise. */
  lastSets: SetLog[];
  /** The heaviest working set ever logged (most reps breaks a tie). */
  bestSet?: SetLog;
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
  /** Alternates chosen for this workout only: main exercise id -> chosen exercise id. */
  exerciseSwaps: Record<string, string>;
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
