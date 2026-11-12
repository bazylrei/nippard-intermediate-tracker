export type ExerciseInfo = { id: string; name: string; muscleGroup: string; warmupProtocol: string };

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
