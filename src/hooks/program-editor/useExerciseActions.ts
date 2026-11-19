import { addExerciseToDay, deleteProgramDayExercise, updateProgramDayExercise } from "@/lib/db";
import type { BuilderExercise } from "@/lib/types";
import type { EditorContext } from "./context";

/** Adding, editing and removing the exercises of a day. */
export function useExerciseActions({ program, allExercises, change, attempt, whileDeleting }: EditorContext) {
  async function saveExercise(pdeId: string, fields: Partial<BuilderExercise>): Promise<boolean> {
    const ok = await attempt(() => updateProgramDayExercise(pdeId, {
      exerciseId: fields.exerciseId,
      repRangeMin: fields.repRangeMin,
      repRangeMax: fields.repRangeMax,
      earlySetCount: fields.earlySetCount,
      lastSetCount: fields.lastSetCount,
      earlySetRpeMin: fields.earlySetRpeMin,
      earlySetRpeMax: fields.earlySetRpeMax,
      lastSetTarget: fields.lastSetTarget,
    }), "Couldn't save the exercise. Try again.");
    if (!ok) return false;
    const saved = { ...fields };
    // A different exercise was chosen: show its name too.
    const chosen = fields.exerciseId ? allExercises.find((e) => e.id === fields.exerciseId) : undefined;
    if (chosen) saved.name = chosen.name;
    change((p) => ({
      ...p,
      days: p.days.map((day) => ({
        ...day,
        exercises: day.exercises.map((ex) => (ex.pdeId === pdeId ? { ...ex, ...saved } : ex)),
      })),
    }));
    return true;
  }

  /** Appends an exercise to a day; resolves with it, or null if saving failed. */
  async function addExercise(pdId: string, exerciseId: string): Promise<BuilderExercise | null> {
    const day = program?.days.find((d) => d.pdId === pdId);
    const info = allExercises.find((e) => e.id === exerciseId);
    if (!day || !info) return null;
    let created: BuilderExercise | null = null;
    const ok = await attempt(async () => {
      created = await addExerciseToDay(pdId, exerciseId, info.name, info.warmupProtocol, day.exercises.length);
    }, "Couldn't add the exercise. Try again.");
    if (!ok || !created) return null;
    const exercise: BuilderExercise = created;
    change((p) => ({ ...p, days: p.days.map((d) => (d.pdId === pdId ? { ...d, exercises: [...d.exercises, exercise] } : d)) }));
    return exercise;
  }

  async function deleteExercise(pdeId: string): Promise<boolean> {
    const ok = await whileDeleting(`ex:${pdeId}`, () => attempt(() => deleteProgramDayExercise(pdeId), "Couldn't delete the exercise. Try again."));
    if (ok) change((p) => ({ ...p, days: p.days.map((d) => ({ ...d, exercises: d.exercises.filter((ex) => ex.pdeId !== pdeId) })) }));
    return ok;
  }

  return { saveExercise, addExercise, deleteExercise };
}
