import type { BuilderProgram } from "@/lib/types";
import type { ExerciseInfo } from "@/components/builder/constants";

/** What the editor's action groups share: the program, how to change it, and how to report a failed save. */
export interface EditorContext {
  program: BuilderProgram | null;
  allExercises: ExerciseInfo[];
  /** Updates the local copy (after a save worked); does nothing before the program has loaded. */
  change: (update: (program: BuilderProgram) => BuilderProgram) => void;
  /** Runs a save; resolves false (with the message shown) if it throws. */
  attempt: (save: () => Promise<unknown>, failureMessage: string) => Promise<boolean>;
  /** Marks `key` ("week:N", "day:id", "ex:id") as being deleted while `run` is in flight. */
  whileDeleting: <T>(key: string, run: () => Promise<T>) => Promise<T>;
}
