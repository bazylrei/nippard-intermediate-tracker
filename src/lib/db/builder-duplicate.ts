import { createClient } from "../supabase";
import type { BuilderDay } from "../types";
import { BUILDER_DAY_SELECT, mapRawDay, sortDays } from "./builder";
import { unwrap } from "./result";

/**
 * Copy every day (and its exercises) from one week to another and set the new
 * week count — atomically, in a single database transaction. Returns the new days.
 */
export async function duplicateProgramWeek(
  programId: string, sourceWeek: number, targetWeek: number, newTotalWeeks: number
): Promise<BuilderDay[]> {
  const sb = createClient();
  unwrap("duplicateProgramWeek", await sb.rpc("duplicate_program_week", {
    p_program_id: programId,
    p_source_week: sourceWeek,
    p_target_week: targetWeek,
    p_new_total_weeks: newTotalWeeks,
  }));

  const days = unwrap("duplicateProgramWeek fetch", await sb
    .from("program_days")
    .select(BUILDER_DAY_SELECT)
    .eq("program_id", programId)
    .eq("week", targetWeek));
  return sortDays((days ?? []).map(mapRawDay));
}
