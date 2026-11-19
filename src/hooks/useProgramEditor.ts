import { useState } from "react";
import { canEditProgram } from "@/lib/program-access";
import { useSaveError } from "./useSaveError";
import { useProgramLoad } from "./program-editor/useProgramLoad";
import { useWeekActions } from "./program-editor/useWeekActions";
import { useDayActions } from "./program-editor/useDayActions";
import { useExerciseActions } from "./program-editor/useExerciseActions";
import { useDetailsActions } from "./program-editor/useDetailsActions";
import type { EditorContext } from "./program-editor/context";

export type { ProgramEditorStatus } from "./program-editor/useProgramLoad";

/**
 * Loads a program for editing and owns every change to it. Each action saves first and
 * updates the local copy only on success: on failure the program is untouched and the
 * message shows through `saveError`. Actions resolve with what happened (a flag, or the new
 * week / exercise) so the page can follow up (open a sheet, expand a week) without knowing how saving works.
 */
export function useProgramEditor(programId: string) {
  const { userId, status, program, allExercises, change } = useProgramLoad(programId);
  const saveError = useSaveError();
  /** What's being deleted right now, as "week:N" / "day:id" / "ex:id". */
  const [deletingKey, setDeletingKey] = useState<string | null>(null);

  const context: EditorContext = {
    program, allExercises, change, attempt: saveError.attempt,
    whileDeleting: async (key, run) => {
      setDeletingKey(key);
      try { return await run(); } finally { setDeletingKey(null); }
    },
  };
  const { duplicatingWeek, ...weeks } = useWeekActions(context);

  return {
    status, program, allExercises, saveError, deletingKey, duplicatingWeek,
    canEdit: !!program && canEditProgram(program, userId),
    actions: { ...weeks, ...useDayActions(context), ...useExerciseActions(context), ...useDetailsActions(context) },
  };
}
