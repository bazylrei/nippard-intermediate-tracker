import { describe, it, expect, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { loadFullProgram } from "@/lib/program-db";
import { BUILDER_DAY_SELECT } from "@/lib/db/builder";

// program_day_exercises can reference exercises more than once (its own exercise
// and, since alternates, up to two more). An embed that doesn't name which
// relationship it means is refused by the API, so every embed must name it.
const MAIN_FK = "exercises!program_day_exercises_exercise_id_fkey(";

const exerciseRow = {
  id: "bench", name: "Bench Press", muscle_group: "chest",
  rest_min: 90, rest_max: 120, warmup_protocol: "3-set", form_note: null, youtube_url: null, instructions: null,
  is_bodyweight: false, weight_per_side: false,
};
// Alternates are exercises in their own right: own id, own flags, own rest and warm-up.
const dbBenchRow = { ...exerciseRow, id: "alt-db-bench-press", name: "DB Bench Press", weight_per_side: true, rest_min: 120, rest_max: 150, warmup_protocol: "2-set" };
const machineRow = { ...exerciseRow, id: "alt-machine-press", name: "Machine Press" };
const slotRow = {
  position: 0, rep_range_min: 6, rep_range_max: 10, early_set_count: 2, last_set_count: 1,
  early_set_rpe_min: 7, early_set_rpe_max: 8, last_set_rpe_min: null, last_set_rpe_max: null,
  last_set_target: "failure", exercises: exerciseRow, alternate_1: dbBenchRow, alternate_2: machineRow,
};

/** A client whose tables answer with canned rows and remember the columns each was asked for. */
function fakeClient(slot: Record<string, unknown> = slotRow) {
  const selected: Record<string, string> = {};
  const rows: Record<string, unknown> = {
    programs: { data: { id: "prog-1", program_days: [{ week: 1, day_index: 0, day_type: "upper-a", program_day_exercises: [slot] }] }, error: null },
    warmup_protocols: { data: [{ id: "3-set", steps: ["a", "b", "c"] }], error: null },
    failure_techniques: { data: [{ id: "failure", label: "Failure", description: "Go to failure" }], error: null },
  };
  const client = {
    from: (table: string) => {
      const query: Record<string, unknown> = {};
      query.select = vi.fn((columns: string) => { selected[table] = columns; return query; });
      query.eq = vi.fn(() => query);
      query.single = vi.fn(async () => rows[table]);
      query.then = (resolve: (r: unknown) => unknown) => Promise.resolve(rows[table]).then(resolve);
      return query;
    },
  };
  return { client: client as unknown as SupabaseClient, selected };
}

describe("loadFullProgram", () => {
  it("names the exercises relationship in its embed, so extra references to exercises can't make it ambiguous", async () => {
    const { client, selected } = fakeClient();
    await loadFullProgram(client);
    expect(selected.programs).toContain(MAIN_FK);
    expect(selected.programs).not.toMatch(/[ ,(]exercises\(/);
  });

  it("maps a slot's exercise with its prescription", async () => {
    const { client } = fakeClient();
    const loaded = await loadFullProgram(client);
    const exercise = loaded!.program[0].days[0].exercises[0];
    expect(exercise).toMatchObject({
      id: "bench", name: "Bench Press", muscleGroup: "chest", repRange: [6, 10], earlySetCount: 2, lastSetCount: 1,
      restSeconds: [90, 120], warmupProtocol: "3-set",
    });
    expect(loaded!.programId).toBe("prog-1");
  });
});

describe("loadFullProgram — alternates", () => {
  const MAIN_AND_ALTERNATE_FKS = [
    "alternate_1:exercises!program_day_exercises_alternate_1_exercise_id_fkey(",
    "alternate_2:exercises!program_day_exercises_alternate_2_exercise_id_fkey(",
  ];

  it("loads both alternates with each slot, through their own named relationships", async () => {
    const { client, selected } = fakeClient();
    await loadFullProgram(client);
    for (const embed of MAIN_AND_ALTERNATE_FKS) expect(selected.programs).toContain(embed);
  });

  it("builds each alternate as a full exercise: its own id, flags, rest and warm-up, and the slot's sets, reps and RPE", async () => {
    const { client } = fakeClient();
    const loaded = await loadFullProgram(client);
    const bench = loaded!.program[0].days[0].exercises[0];

    expect(bench.alternates.map((a) => a.id)).toEqual(["alt-db-bench-press", "alt-machine-press"]);
    expect(bench.alternates[0]).toMatchObject({
      name: "DB Bench Press", weightPerSide: true, restSeconds: [120, 150], warmupProtocol: "2-set",
      repRange: [6, 10], earlySetRpe: [7, 8], earlySetCount: 2, lastSetCount: 1, alternates: [],
    });
    expect(bench.weightPerSide).toBe(false); // the main exercise keeps its own flags
  });

  it("has fewer alternates for a slot that has fewer", async () => {
    const { client } = fakeClient({ ...slotRow, alternate_2: null });
    const loaded = await loadFullProgram(client);
    expect(loaded!.program[0].days[0].exercises[0].alternates.map((a) => a.id)).toEqual(["alt-db-bench-press"]);
  });

  it("has none for a slot with no alternates", async () => {
    const { client } = fakeClient({ ...slotRow, alternate_1: null, alternate_2: null });
    const loaded = await loadFullProgram(client);
    expect(loaded!.program[0].days[0].exercises[0].alternates).toEqual([]);
  });
});

describe("builder queries", () => {
  it("name the exercises relationship in their embed", () => {
    expect(BUILDER_DAY_SELECT).toContain(MAIN_FK);
    expect(BUILDER_DAY_SELECT).not.toMatch(/[ ,(]exercises\(/);
  });
});
