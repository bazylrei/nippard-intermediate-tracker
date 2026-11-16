export const EXERCISES_PATH = "/exercises";
export const NEW_EXERCISE_PATH = "/exercises/new";

export function exerciseHref(id: string): string {
  return `${EXERCISES_PATH}/${encodeURIComponent(id)}`;
}

export function editExerciseHref(id: string): string {
  return `${exerciseHref(id)}/edit`;
}
