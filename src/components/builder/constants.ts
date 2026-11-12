export type ExerciseInfo = { id: string; name: string; muscleGroup: string; warmupProtocol: string };

export const DAY_TYPE_PRESETS = [
  { value: "push",           label: "Push" },
  { value: "pull",           label: "Pull" },
  { value: "legs",           label: "Legs" },
  { value: "upper-a",        label: "Upper A" },
  { value: "upper-b",        label: "Upper B" },
  { value: "lower-a",        label: "Lower A" },
  { value: "lower-b",        label: "Lower B" },
  { value: "full-body",      label: "Full Body" },
  { value: "back-biceps",    label: "Back & Biceps" },
  { value: "chest-triceps",  label: "Chest & Triceps" },
  { value: "shoulders-arms", label: "Shoulders & Arms" },
  { value: "cardio",         label: "Cardio" },
];

export const DAY_TYPE_LABELS: Record<string, string> = Object.fromEntries(
  DAY_TYPE_PRESETS.map((p) => [p.value, p.label])
);

export const FAILURE_TECHNIQUES = [
  { value: "failure",        label: "Failure" },
  { value: "failure+llps",   label: "Failure + LLPS" },
  { value: "myo-reps",       label: "Myo-Reps" },
  { value: "static-stretch", label: "Static Stretch" },
  { value: "rpe",            label: "RPE Target" },
];

export const WARMUP_PROTOCOLS = [
  { value: "none",  label: "None" },
  { value: "1-set", label: "1 set" },
  { value: "2-set", label: "2 sets" },
  { value: "3-set", label: "3 sets" },
  { value: "4-set", label: "4 sets" },
];
