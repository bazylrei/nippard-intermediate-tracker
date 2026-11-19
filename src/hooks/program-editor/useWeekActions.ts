import { useState } from "react";
import { addProgramWeek, deleteProgramWeek, duplicateProgramWeek } from "@/lib/db";
import { lastWeek, totalWeeksAfterDeletingWeek } from "@/lib/program-structure";
import type { BuilderProgram } from "@/lib/types";
import type { EditorContext } from "./context";

/** Adding, copying and deleting whole weeks. */
export function useWeekActions({ program, change, attempt, whileDeleting }: EditorContext) {
  const [duplicatingWeek, setDuplicatingWeek] = useState<number | null>(null);

  /** Adds an empty week at the end; resolves with its number, or null if saving failed. */
  async function addWeek(): Promise<number | null> {
    if (!program) return null;
    const totalWeeks = program.totalWeeks + 1;
    if (!(await attempt(() => addProgramWeek(program.id, totalWeeks), "Couldn't add a week. Try again."))) return null;
    change((p) => ({ ...p, totalWeeks }));
    return totalWeeks;
  }

  /** Copies a week to a new last week; resolves with the new week's number, or null (also while another copy is running). */
  async function duplicateWeek(week: number): Promise<number | null> {
    if (!program || duplicatingWeek !== null) return null;
    setDuplicatingWeek(week);
    const targetWeek = lastWeek(program) + 1;
    let newDays: BuilderProgram["days"] = [];
    const ok = await attempt(async () => {
      newDays = await duplicateProgramWeek(program.id, week, targetWeek, targetWeek);
    }, "Couldn't duplicate the week. Try again.");
    setDuplicatingWeek(null);
    if (!ok) return null;
    change((p) => ({ ...p, totalWeeks: targetWeek, days: [...p.days, ...newDays] }));
    return targetWeek;
  }

  async function deleteWeek(week: number): Promise<boolean> {
    if (!program) return false;
    const ok = await whileDeleting(`week:${week}`, () => attempt(() => deleteProgramWeek(program.id, week), "Couldn't delete the week. Try again."));
    if (ok) change((p) => ({ ...p, totalWeeks: totalWeeksAfterDeletingWeek(p, week), days: p.days.filter((d) => d.week !== week) }));
    return ok;
  }

  return { duplicatingWeek, addWeek, duplicateWeek, deleteWeek };
}
