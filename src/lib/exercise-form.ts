import type { CatalogExercise, ExerciseInput, MuscleGroup, WarmupProtocol } from "./types";

export const MUSCLE_GROUPS: { value: MuscleGroup; label: string }[] = [
  { value: "chest", label: "Chest" },
  { value: "back", label: "Back" },
  { value: "shoulders", label: "Shoulders" },
  { value: "biceps", label: "Biceps" },
  { value: "triceps", label: "Triceps" },
  { value: "quads", label: "Quads" },
  { value: "hamstrings", label: "Hamstrings" },
  { value: "glutes", label: "Glutes" },
  { value: "calves", label: "Calves" },
  { value: "abs", label: "Abs" },
  { value: "hips", label: "Hips" },
];

/** "" stands for no particular equipment (stored as null). */
export const EQUIPMENT = [
  { value: "", label: "None / other" },
  { value: "barbell", label: "Barbell" },
  { value: "dumbbell", label: "Dumbbell" },
  { value: "cable", label: "Cable" },
  { value: "machine", label: "Machine" },
  { value: "bodyweight", label: "Bodyweight" },
];

export function muscleGroupLabel(group: string): string {
  return MUSCLE_GROUPS.find((g) => g.value === group)?.label ?? group;
}

export function equipmentLabel(equipment: string | null): string | null {
  return equipment ? EQUIPMENT.find((e) => e.value === equipment)?.label ?? equipment : null;
}

/** The form's raw values: number fields stay strings until validated. */
export interface ExerciseDraft {
  name: string;
  muscleGroup: MuscleGroup;
  equipment: string;
  restMin: string;
  restMax: string;
  warmupProtocol: WarmupProtocol;
  isBodyweight: boolean;
  weightPerSide: boolean;
  formNote: string;
  youtubeUrl: string;
}

export type DraftErrors = Partial<Record<keyof ExerciseDraft, string>>;

export const EMPTY_DRAFT: ExerciseDraft = {
  name: "",
  muscleGroup: "chest",
  equipment: "",
  restMin: "60",
  restMax: "120",
  warmupProtocol: "1-set",
  isBodyweight: false,
  weightPerSide: false,
  formNote: "",
  youtubeUrl: "",
};

export function draftFrom(exercise: CatalogExercise): ExerciseDraft {
  return {
    name: exercise.name,
    muscleGroup: exercise.muscleGroup,
    equipment: exercise.equipment ?? "",
    restMin: String(exercise.restSeconds[0]),
    restMax: String(exercise.restSeconds[1]),
    warmupProtocol: exercise.warmupProtocol,
    isBodyweight: exercise.isBodyweight,
    weightPerSide: exercise.weightPerSide,
    formNote: exercise.formNote ?? "",
    youtubeUrl: exercise.youtubeUrl ?? "",
  };
}

const MAX_REST_SECONDS = 600;

function parseSeconds(raw: string): number | null {
  const value = Number(raw.trim());
  return raw.trim() !== "" && Number.isInteger(value) && value >= 0 && value <= MAX_REST_SECONDS ? value : null;
}

/** Only http(s): the link is opened by anyone who can see the exercise. Mirrors the DB check. */
function isWebUrl(raw: string): boolean {
  try {
    const { protocol } = new URL(raw);
    return protocol === "https:" || protocol === "http:";
  } catch {
    return false;
  }
}

/** Checks a draft the same way the database will, so the user sees why before saving. */
export function validateDraft(draft: ExerciseDraft): { ok: true; value: ExerciseInput } | { ok: false; errors: DraftErrors } {
  const errors: DraftErrors = {};
  const name = draft.name.trim();
  if (!name) errors.name = "Give it a name.";

  const restMin = parseSeconds(draft.restMin);
  const restMax = parseSeconds(draft.restMax);
  if (restMin === null) errors.restMin = `Whole seconds, 0–${MAX_REST_SECONDS}.`;
  if (restMax === null) errors.restMax = `Whole seconds, 0–${MAX_REST_SECONDS}.`;
  if (restMin !== null && restMax !== null && restMin > restMax) errors.restMax = "Can't be less than the minimum.";

  const youtubeUrl = draft.youtubeUrl.trim();
  if (youtubeUrl && !isWebUrl(youtubeUrl)) errors.youtubeUrl = "Paste a full link starting with https://";

  if (Object.keys(errors).length > 0 || restMin === null || restMax === null) return { ok: false, errors };
  return {
    ok: true,
    value: {
      name,
      muscleGroup: draft.muscleGroup,
      equipment: draft.equipment || null,
      restSeconds: [restMin, restMax],
      warmupProtocol: draft.warmupProtocol,
      isBodyweight: draft.isBodyweight,
      weightPerSide: draft.weightPerSide,
      formNote: draft.formNote.trim() || null,
      youtubeUrl: youtubeUrl || null,
    },
  };
}
