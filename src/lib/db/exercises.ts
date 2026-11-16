import { createClient } from "../supabase";
import type { Tables, TablesInsert } from "../database.types";
import type { CatalogExercise, ExerciseInput, MuscleGroup, WarmupProtocol } from "../types";
import { DbError, unwrap } from "./result";

const COLUMNS =
  "id, name, muscle_group, equipment, rest_min, rest_max, warmup_protocol, is_bodyweight, weight_per_side, form_note, instructions, youtube_url, created_by";

function mapExercise(row: Tables<"exercises">): CatalogExercise {
  return {
    id: row.id,
    name: row.name,
    muscleGroup: row.muscle_group as MuscleGroup,
    equipment: row.equipment,
    restSeconds: [row.rest_min, row.rest_max],
    warmupProtocol: row.warmup_protocol as WarmupProtocol,
    isBodyweight: row.is_bodyweight,
    weightPerSide: row.weight_per_side,
    formNote: row.form_note,
    instructions: row.instructions,
    youtubeUrl: row.youtube_url,
    createdBy: row.created_by,
  };
}

function toRow(input: ExerciseInput): Omit<TablesInsert<"exercises">, "id"> {
  return {
    name: input.name,
    muscle_group: input.muscleGroup,
    equipment: input.equipment,
    rest_min: input.restSeconds[0],
    rest_max: input.restSeconds[1],
    warmup_protocol: input.warmupProtocol,
    is_bodyweight: input.isBodyweight,
    weight_per_side: input.weightPerSide,
    form_note: input.formNote,
    youtube_url: input.youtubeUrl,
  };
}

/** A fresh id for a new custom exercise; the form makes it once, so a retried save can't add a duplicate. */
export function newExerciseId(): string {
  return `custom-${crypto.randomUUID()}`;
}

/** Every exercise you can see (built in, yours, or used by a program you can see), by name. */
export async function getCatalog(): Promise<CatalogExercise[]> {
  const sb = createClient();
  const rows = unwrap("getCatalog", await sb.from("exercises").select(COLUMNS).order("name"));
  return (rows ?? []).map(mapExercise);
}

/** Null when it doesn't exist or isn't visible to you. */
export async function getCatalogExercise(id: string): Promise<CatalogExercise | null> {
  const sb = createClient();
  const row = unwrap("getCatalogExercise", await sb.from("exercises").select(COLUMNS).eq("id", id).maybeSingle());
  return row ? mapExercise(row) : null;
}

/** Adds one of your own exercises. Safe to retry with the same id. The owner is set by the database. */
export async function createExercise(id: string, input: ExerciseInput): Promise<void> {
  const sb = createClient();
  unwrap("createExercise", await sb
    .from("exercises")
    .upsert({ id, ...toRow(input) }, { onConflict: "id", ignoreDuplicates: true }));
}

/** Edits one of your own exercises; throws if it isn't yours (RLS matches no row). */
export async function updateExercise(id: string, input: ExerciseInput): Promise<void> {
  const sb = createClient();
  const rows = unwrap("updateExercise", await sb.from("exercises").update(toRow(input)).eq("id", id).select("id"));
  if (!rows?.length) throw new DbError("updateExercise", { message: "exercise not found or not yours" });
}

/**
 * Deletes one of your own exercises unless a program or a logged set uses it.
 * True when it's gone (also when it already was), false when it's in use.
 */
export async function deleteExercise(id: string): Promise<boolean> {
  const sb = createClient();
  return unwrap("deleteExercise", await sb.rpc("delete_own_exercise", { p_exercise_id: id }));
}
