import type { Exercise } from "./types";

/** An exercise id -> the id of the exercise chosen in its place. */
export type ExerciseChoices = Record<string, string>;

/**
 * Keeps only entries that map an exercise id to another exercise id. Saved data
 * from older versions used positions (0 / 1 / 2) or booleans; those carry no
 * exercise to resolve, so they're ignored rather than guessed at.
 */
export function parseExerciseChoices(raw: unknown): ExerciseChoices {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const choices: ExerciseChoices = {};
  for (const [mainId, chosen] of Object.entries(raw)) {
    if (typeof chosen === "string" && chosen) choices[mainId] = chosen;
  }
  return choices;
}

/** Today's swaps win over the saved defaults. */
export function mergeChoices(defaults: ExerciseChoices, todays: ExerciseChoices): ExerciseChoices {
  return { ...defaults, ...todays };
}

/** What can be done in this slot: the exercise itself, then its alternates. */
export function exerciseOptions(exercise: Exercise): Exercise[] {
  return [exercise, ...exercise.alternates];
}

/**
 * The exercise to do for a slot: the chosen alternate when this slot offers it,
 * otherwise the slot's own exercise. Choosing the exercise itself counts as
 * "the main one", which is how a workout overrides a saved default.
 */
export function chooseExercise(exercise: Exercise, choices: ExerciseChoices): Exercise {
  const chosenId = choices[exercise.id];
  if (!chosenId) return exercise;
  return exercise.alternates.find((alternate) => alternate.id === chosenId) ?? exercise;
}
