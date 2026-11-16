import { describe, it, expect, vi, beforeEach } from "vitest";

/** A query builder whose every step returns itself and which resolves to `result` when awaited. */
let result: { data: unknown; error: { message: string; code?: string } | null };
const chain: Record<string, ReturnType<typeof vi.fn>> & { then?: unknown } = {};
for (const m of ["from", "select", "eq", "order", "maybeSingle", "upsert", "update", "rpc"]) {
  chain[m] = vi.fn(() => chain);
}
chain.then = (resolve: (r: typeof result) => unknown) => resolve(result);

vi.mock("@/lib/supabase", () => ({ createClient: () => chain }));

import { createExercise, deleteExercise, getCatalog, getCatalogExercise, newExerciseId, updateExercise } from "@/lib/db";
import type { ExerciseInput } from "@/lib/types";

const row = {
  id: "custom-1", name: "Cable Fly", muscle_group: "chest", equipment: "cable", rest_min: 60, rest_max: 90,
  warmup_protocol: "1-set", is_bodyweight: false, weight_per_side: true, form_note: null, instructions: null,
  youtube_url: null, created_by: "user-1",
};
const input: ExerciseInput = {
  name: "Cable Fly", muscleGroup: "chest", equipment: "cable", restSeconds: [60, 90], warmupProtocol: "1-set",
  isBodyweight: false, weightPerSide: true, formNote: null, youtubeUrl: null,
};
const dbRow = {
  name: "Cable Fly", muscle_group: "chest", equipment: "cable", rest_min: 60, rest_max: 90, warmup_protocol: "1-set",
  is_bodyweight: false, weight_per_side: true, form_note: null, youtube_url: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  result = { data: null, error: null };
});

describe("exercise catalogue queries", () => {
  it("maps catalogue rows, keeping who added each one", async () => {
    result = { data: [row], error: null };
    expect(await getCatalog()).toEqual([{
      id: "custom-1", name: "Cable Fly", muscleGroup: "chest", equipment: "cable", restSeconds: [60, 90], warmupProtocol: "1-set",
      isBodyweight: false, weightPerSide: true, formNote: null, instructions: null, youtubeUrl: null, createdBy: "user-1",
    }]);
    expect(chain.order).toHaveBeenCalledWith("name");
  });

  it("returns null for an exercise you can't see", async () => {
    expect(await getCatalogExercise("custom-x")).toBeNull();
  });

  it("creates with the given id and ignores a repeat, so a retried save adds it once", async () => {
    await createExercise("custom-1", input);
    expect(chain.upsert).toHaveBeenCalledWith({ id: "custom-1", ...dbRow }, { onConflict: "id", ignoreDuplicates: true });
  });

  it("never sends an owner: the database sets it to the signed-in user", async () => {
    await createExercise("custom-1", input);
    expect(chain.upsert.mock.calls[0][0]).not.toHaveProperty("created_by");
  });

  it("throws when saving fails", async () => {
    result = { data: null, error: { message: "new row violates check constraint" } };
    await expect(createExercise("custom-1", input)).rejects.toThrow("createExercise failed");
  });

  it("updates your own exercise", async () => {
    result = { data: [{ id: "custom-1" }], error: null };
    await updateExercise("custom-1", input);
    expect(chain.update).toHaveBeenCalledWith(dbRow);
    expect(chain.eq).toHaveBeenCalledWith("id", "custom-1");
  });

  it("fails loudly when the update matched nothing (not yours)", async () => {
    result = { data: [], error: null };
    await expect(updateExercise("r-bench", input)).rejects.toThrow("not found or not yours");
  });

  it.each([true, false])("reports whether the delete went through (%s)", async (deleted) => {
    result = { data: deleted, error: null };
    expect(await deleteExercise("custom-1")).toBe(deleted);
    expect(chain.rpc).toHaveBeenCalledWith("delete_own_exercise", { p_exercise_id: "custom-1" });
  });

  it("makes distinct custom ids", () => {
    expect(newExerciseId()).toMatch(/^custom-[0-9a-f-]{36}$/);
    expect(newExerciseId()).not.toBe(newExerciseId());
  });
});
