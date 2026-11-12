import { createClient } from "../supabase";
import type { UserPreferences } from "../types";

export async function getPreferences(userId: string): Promise<UserPreferences> {
  const sb = createClient();
  const { data } = await sb
    .from("user_preferences")
    .select("unit, alternate_selections, body_weight_kg, height_cm, exercise_notes")
    .eq("user_id", userId)
    .single();

  const row = data as Record<string, unknown> | null;
  return {
    unit: (row?.unit as "kg" | "lbs") ?? "kg",
    alternateSelections: (row?.alternate_selections as Record<string, number>) ?? {},
    bodyWeightKg: (row?.body_weight_kg as number | null) ?? null,
    heightCm: (row?.height_cm as number | null) ?? null,
    exerciseNotes: (row?.exercise_notes as Record<string, string>) ?? {},
  };
}

export async function upsertPreferences(
  userId: string,
  prefs: Partial<UserPreferences>
): Promise<void> {
  const sb = createClient();
  await sb.from("user_preferences").upsert(
    { user_id: userId, ...prefs },
    { onConflict: "user_id" }
  );
}

export async function saveExerciseNote(userId: string, exerciseId: string, note: string, current: Record<string, string>): Promise<void> {
  const sb = createClient();
  const updated = { ...current, [exerciseId]: note };
  await sb.from("user_preferences").upsert(
    { user_id: userId, exercise_notes: updated },
    { onConflict: "user_id" }
  );
}
