import { createClient } from "../supabase";
import type { TablesUpdate } from "../database.types";
import type { UserPreferences } from "../types";
import { unwrap } from "./result";

export async function getPreferences(userId: string): Promise<UserPreferences> {
  const sb = createClient();
  const row = unwrap("getPreferences", await sb
    .from("user_preferences")
    .select("unit, alternate_selections, body_weight_kg, height_cm, exercise_notes")
    .eq("user_id", userId)
    .maybeSingle());

  return {
    unit: row?.unit === "lbs" ? "lbs" : "kg",
    alternateSelections: (row?.alternate_selections as Record<string, number> | undefined) ?? {},
    bodyWeightKg: row?.body_weight_kg ?? null,
    heightCm: row?.height_cm ?? null,
    exerciseNotes: (row?.exercise_notes as Record<string, string> | undefined) ?? {},
  };
}

/** camelCase domain fields → snake_case columns; only fields that are present. */
export function toPreferencesRow(prefs: Partial<UserPreferences>): TablesUpdate<"user_preferences"> {
  const row: TablesUpdate<"user_preferences"> = {};
  if (prefs.unit !== undefined) row.unit = prefs.unit;
  if (prefs.alternateSelections !== undefined) row.alternate_selections = prefs.alternateSelections;
  if (prefs.bodyWeightKg !== undefined) row.body_weight_kg = prefs.bodyWeightKg;
  if (prefs.heightCm !== undefined) row.height_cm = prefs.heightCm;
  if (prefs.exerciseNotes !== undefined) row.exercise_notes = prefs.exerciseNotes;
  return row;
}

export async function upsertPreferences(
  userId: string,
  prefs: Partial<UserPreferences>
): Promise<void> {
  const sb = createClient();
  unwrap("upsertPreferences", await sb.from("user_preferences").upsert(
    { user_id: userId, ...toPreferencesRow(prefs) },
    { onConflict: "user_id" }
  ));
}

export async function saveExerciseNote(userId: string, exerciseId: string, note: string, current: Record<string, string>): Promise<void> {
  const sb = createClient();
  const updated = { ...current, [exerciseId]: note };
  unwrap("saveExerciseNote", await sb.from("user_preferences").upsert(
    { user_id: userId, exercise_notes: updated },
    { onConflict: "user_id" }
  ));
}
