import { useState } from "react";
import { saveExerciseNote, upsertPreferences } from "@/lib/db";
import { cachePrefs, DEFAULT_PREFS, readCachedPrefs } from "@/lib/prefs-cache";
import type { UserPreferences } from "@/lib/types";

/** User preferences during a workout: state, local cache and persistence in one place. */
export function useWorkoutPrefs(userId: string | null) {
  const [prefs, setPrefs] = useState<UserPreferences>(() => readCachedPrefs() ?? DEFAULT_PREFS);

  function update(next: UserPreferences) {
    setPrefs(next);
    cachePrefs(next);
  }

  /**
   * Saves which exercise to do by default in place of `mainId` (the main exercise
   * itself clears the default). Optimistic; reverts and rethrows if the save fails.
   */
  async function setDefaultAlternate(mainId: string, chosenId: string) {
    const previous = prefs;
    const alternateSelections = { ...prefs.alternateSelections };
    if (chosenId === mainId) delete alternateSelections[mainId];
    else alternateSelections[mainId] = chosenId;
    update({ ...prefs, alternateSelections });
    if (!userId) return;
    try {
      await upsertPreferences(userId, { alternateSelections });
    } catch (error) {
      update(previous);
      throw error;
    }
  }

  async function saveNote(exerciseId: string, note: string) {
    if (!userId) return;
    const current = prefs.exerciseNotes ?? {};
    await saveExerciseNote(userId, exerciseId, note, current);
    update({ ...prefs, exerciseNotes: { ...current, [exerciseId]: note } });
  }

  return { prefs, setPrefs, setDefaultAlternate, saveNote };
}
