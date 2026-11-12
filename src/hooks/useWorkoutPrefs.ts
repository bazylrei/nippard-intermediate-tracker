import { useState } from "react";
import { saveExerciseNote, upsertPreferences } from "@/lib/db";
import { cacheGet, cacheSet } from "@/lib/cache";
import type { UserPreferences } from "@/lib/types";

const DEFAULT_PREFS: UserPreferences = { unit: "kg", alternateSelections: {}, exerciseNotes: {} };

/** User preferences during a workout: state, local cache and persistence in one place. */
export function useWorkoutPrefs(userId: string | null) {
  const [prefs, setPrefs] = useState<UserPreferences>(() => cacheGet<UserPreferences>("prefs") ?? DEFAULT_PREFS);

  function update(next: UserPreferences) {
    setPrefs(next);
    cacheSet("prefs", next);
  }

  /** Cycle main → alternate 1 → alternate 2 → main. */
  async function toggleAlternate(exerciseId: string) {
    const current = prefs.alternateSelections[exerciseId] ?? 0;
    const alternateSelections = { ...prefs.alternateSelections, [exerciseId]: (current + 1) % 3 };
    update({ ...prefs, alternateSelections });
    if (userId) await upsertPreferences(userId, { alternateSelections });
  }

  async function saveNote(exerciseId: string, note: string) {
    if (!userId) return;
    const current = prefs.exerciseNotes ?? {};
    await saveExerciseNote(userId, exerciseId, note, current);
    update({ ...prefs, exerciseNotes: { ...current, [exerciseId]: note } });
  }

  return { prefs, setPrefs, toggleAlternate, saveNote };
}
