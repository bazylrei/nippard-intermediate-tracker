import { usePreferences } from "@/context/PreferencesContext";

/** What a workout changes in the user's preferences: default alternates and exercise notes. */
export function useWorkoutPrefs() {
  const { prefs, save } = usePreferences();

  /**
   * Saves which exercise to do by default in place of `mainId` (the main exercise
   * itself clears the default). Optimistic; reverts and rejects if the save fails.
   */
  async function setDefaultAlternate(mainId: string, chosenId: string) {
    const alternateSelections = { ...prefs.alternateSelections };
    if (chosenId === mainId) delete alternateSelections[mainId];
    else alternateSelections[mainId] = chosenId;
    await save({ alternateSelections });
  }

  /** Saves the note for an exercise; rejects (so the notes sheet can say so) if that fails. */
  async function saveNote(exerciseId: string, note: string) {
    await save({ exerciseNotes: { ...prefs.exerciseNotes, [exerciseId]: note } });
  }

  return { prefs, setDefaultAlternate, saveNote };
}
