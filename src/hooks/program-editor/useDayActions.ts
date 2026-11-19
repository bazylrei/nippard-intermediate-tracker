import { addProgramDay, deleteProgramDay } from "@/lib/db";
import { nextDayIndex } from "@/lib/program-structure";
import type { BuilderProgram } from "@/lib/types";
import type { EditorContext } from "./context";

/** Adding and deleting a week's days. */
export function useDayActions({ program, change, attempt, whileDeleting }: EditorContext) {
  async function addDay(week: number, dayType: string): Promise<boolean> {
    if (!program) return false;
    let added: BuilderProgram["days"][number] | null = null;
    const ok = await attempt(async () => {
      added = await addProgramDay(program.id, week, nextDayIndex(program.days, week), dayType);
    }, "Couldn't add the day. Try again.");
    if (!ok || !added) return false;
    const day = added;
    change((p) => ({ ...p, days: [...p.days, day] }));
    return true;
  }

  async function deleteDay(pdId: string): Promise<boolean> {
    const ok = await whileDeleting(`day:${pdId}`, () => attempt(() => deleteProgramDay(pdId), "Couldn't delete the day. Try again."));
    if (ok) change((p) => ({ ...p, days: p.days.filter((d) => d.pdId !== pdId) }));
    return ok;
  }

  return { addDay, deleteDay };
}
