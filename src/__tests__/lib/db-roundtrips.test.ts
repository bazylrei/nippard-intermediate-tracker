import type { WeeklyVolume } from "@/lib/volume";
import { describe, it, expect, vi, beforeEach } from "vitest";

// An awaitable query-builder mock: every chained method returns the chain, and
// each `await` consumes the next queued response (default: empty success).
const { chain, responses } = vi.hoisted(() => {
  type Response = { data: unknown; error: { message: string; code?: string } | null };
  const responses: Response[] = [];
  const chain: Record<string, unknown> = {};
  const methods = [
    "from", "select", "eq", "is", "not", "order", "limit", "update", "delete",
    "insert", "upsert", "in", "gte", "or", "rpc", "single", "maybeSingle",
  ];
  for (const m of methods) chain[m] = vi.fn(() => chain);
  chain.then = (resolve: (r: Response) => unknown, reject: (e: unknown) => unknown) =>
    Promise.resolve(responses.shift() ?? { data: null, error: null }).then(resolve, reject);
  return { chain, responses };
});

vi.mock("@/lib/supabase", () => ({ createClient: () => chain }));

import {
  logSetAndAdvance, createSession, getLastSetsForExercises, getBestSetsForExercises, duplicateProgramWeek, getPrograms,
  getIncompleteSessionWithSets, getExerciseHistory, upsertPreferences, completeSession,
  getLatestBodyWeight, logBodyWeight, saveExerciseSwaps,
  deleteWorkoutSession, deleteProgramDay, getWorkoutDetail, getCompletedSlots, getRecentWorkouts,
  getWeeklyVolume, getLoggedExerciseIds,
} from "@/lib/db";
import { DbError } from "@/lib/db/result";

const fn = (name: string) => chain[name] as ReturnType<typeof vi.fn>;
const failure = (message: string) => ({ data: null, error: { message, code: "XX000" } });

const setRow = (over: Record<string, unknown> = {}) => ({
  id: "set-1", session_id: "sess-1", user_id: "user-1", exercise_id: "bench",
  set_index: 0, is_last_set: false, weight_kg: 100, reps: 8, rpe: null,
  failure_hit: null, logged_at: "2026-11-01T10:00:00Z", ...over,
});

const sessionRow = {
  id: "sess-1", user_id: "user-1", program_id: null, week: 2, day_index: 1,
  day_type: "lower-a", started_at: "2026-11-01T09:00:00Z", completed_at: null,
  current_exercise_index: 1, current_set_index: 2,
};

beforeEach(() => {
  vi.clearAllMocks();
  responses.length = 0;
});

// ─── Fail fast ───────────────────────────────────────────────────────────────

describe("completeSession", () => {
  it("only finishes a session that isn't finished yet, so a retry keeps the first finish time", async () => {
    responses.push({ data: null, error: null });
    await completeSession("sess-1");
    expect(fn("eq")).toHaveBeenCalledWith("id", "sess-1");
    expect(fn("is")).toHaveBeenCalledWith("completed_at", null);
  });
});

describe("writes fail fast", () => {
  it("completeSession throws a DbError naming the operation when Supabase errors", async () => {
    responses.push(failure("network down"));
    await expect(completeSession("sess-1")).rejects.toThrow(DbError);
    responses.push(failure("network down"));
    await expect(completeSession("sess-1")).rejects.toThrow("completeSession failed: network down");
  });
});

// ─── logSetAndAdvance ────────────────────────────────────────────────────────

describe("logSetAndAdvance", () => {
  const input = {
    id: "set-1", sessionId: "sess-1", exerciseId: "bench", setIndex: 0, isLastSet: false,
    weight: 100, reps: 8, rpe: null, failureHit: null,
    nextExerciseIndex: 0, nextSetIndex: 1, completeSession: false,
  };

  it("saves the set and the next position in one RPC call", async () => {
    responses.push({ data: setRow(), error: null });
    const result = await logSetAndAdvance(input);

    expect(fn("rpc")).toHaveBeenCalledTimes(1);
    expect(fn("rpc")).toHaveBeenCalledWith("log_set", {
      p_id: "set-1", p_session_id: "sess-1", p_exercise_id: "bench", p_set_index: 0,
      p_is_last_set: false, p_weight_kg: 100, p_reps: 8, p_rpe: null, p_failure_hit: null,
      p_next_exercise_index: 0, p_next_set_index: 1, p_complete: false,
    });
    expect(fn("from")).not.toHaveBeenCalled();
    expect(result).toMatchObject({ id: "set-1", exerciseId: "bench", weight: 100, reps: 8 });
  });

  it("throws when the save fails so the caller can roll back", async () => {
    responses.push(failure("session not found"));
    await expect(logSetAndAdvance(input)).rejects.toThrow(DbError);
  });
});

// ─── createSession ───────────────────────────────────────────────────────────

describe("createSession", () => {
  it("starts at the first exercise's warm-up, so leaving before a set resumes there", async () => {
    responses.push({ data: { ...sessionRow, current_exercise_index: 0, current_set_index: -1 }, error: null });
    const session = await createSession("user-1", 2, 1, "lower-a", null);

    expect(fn("insert")).toHaveBeenCalledWith(expect.objectContaining({ current_set_index: -1 }));
    expect(session.currentSetIndex).toBe(-1);
  });
});

// ─── getLastSetsForExercises ─────────────────────────────────────────────────

describe("getLastSetsForExercises", () => {
  it("skips the network entirely for an empty list", async () => {
    expect(await getLastSetsForExercises([])).toEqual({});
    expect(fn("rpc")).not.toHaveBeenCalled();
  });

  it("fetches every exercise in one call and groups sets by exercise", async () => {
    responses.push({
      data: [
        setRow({ id: "a", exercise_id: "bench", set_index: 0 }),
        setRow({ id: "b", exercise_id: "bench", set_index: 1 }),
        setRow({ id: "c", exercise_id: "squat", set_index: 0 }),
      ],
      error: null,
    });
    const result = await getLastSetsForExercises(["bench", "squat", "row"]);

    expect(fn("rpc")).toHaveBeenCalledTimes(1);
    expect(fn("rpc")).toHaveBeenCalledWith("last_sets_for_exercises", { p_exercise_ids: ["bench", "squat", "row"] });
    expect(result.bench.map((s) => s.id)).toEqual(["a", "b"]);
    expect(result.squat.map((s) => s.id)).toEqual(["c"]);
    expect(result.row).toBeUndefined();
  });
});

// ─── getBestSetsForExercises ─────────────────────────────────────────────────

describe("getBestSetsForExercises", () => {
  it("skips the network entirely for an empty list", async () => {
    expect(await getBestSetsForExercises([])).toEqual({});
    expect(fn("rpc")).not.toHaveBeenCalled();
  });

  it("fetches every exercise in one call, keyed by exercise", async () => {
    responses.push({
      data: [setRow({ id: "a", exercise_id: "bench", weight_kg: 120 }), setRow({ id: "b", exercise_id: "squat", weight_kg: 160 })],
      error: null,
    });
    const result = await getBestSetsForExercises(["bench", "squat", "row"]);

    expect(fn("rpc")).toHaveBeenCalledTimes(1);
    expect(fn("rpc")).toHaveBeenCalledWith("best_sets_for_exercises", { p_exercise_ids: ["bench", "squat", "row"] });
    expect(result.bench).toMatchObject({ id: "a", weight: 120 });
    expect(result.squat).toMatchObject({ id: "b", weight: 160 });
    expect(result.row).toBeUndefined();
  });

  it("throws a DbError instead of hiding a failed query", async () => {
    responses.push(failure("boom"));
    await expect(getBestSetsForExercises(["bench"])).rejects.toThrow(DbError);
  });
});

// ─── getIncompleteSessionWithSets ────────────────────────────────────────────

describe("getIncompleteSessionWithSets", () => {
  it("returns null when there is no unfinished session", async () => {
    responses.push({ data: null, error: null });
    expect(await getIncompleteSessionWithSets("user-1")).toBeNull();
  });

  it("returns the session and its embedded sets from a single query", async () => {
    responses.push({ data: { ...sessionRow, set_logs: [setRow({ id: "a" }), setRow({ id: "b" })] }, error: null });
    const result = await getIncompleteSessionWithSets("user-1");

    expect(fn("select")).toHaveBeenCalledWith("*, set_logs(*)");
    expect(result?.session).toMatchObject({ id: "sess-1", week: 2, currentExerciseIndex: 1, currentSetIndex: 2 });
    expect(result?.session).not.toHaveProperty("set_logs");
    expect(result?.sets.map((s) => s.id)).toEqual(["a", "b"]);
  });
});

// ─── getExerciseHistory ──────────────────────────────────────────────────────

describe("getExerciseHistory", () => {
  it("reads day type from the embedded session instead of a second query", async () => {
    responses.push({
      data: [{ weight_kg: 100, reps: 8, logged_at: "2026-11-01T10:00:00Z", workout_sessions: { day_type: "upper-a" } }],
      error: null,
    });
    const result = await getExerciseHistory("user-1", "bench");

    expect(fn("from")).toHaveBeenCalledTimes(1);
    expect(result).toEqual([{ date: "2026-11-01", weight: 100, reps: 8, dayType: "upper-a" }]);
  });
});

// ─── Builder ─────────────────────────────────────────────────────────────────

describe("getPrograms", () => {
  it("takes user counts from the server-side RPC, not from RLS-filtered sessions", async () => {
    responses.push({
      data: [{
        id: "p1", name: "Nippard", description: null, category: null, total_weeks: 12,
        created_by: "user-1", is_public: true, created_at: "2026-11-01T00:00:00Z",
      }],
      error: null,
    });
    responses.push({ data: [{ program_id: "p1", user_count: 7 }], error: null });

    const [program] = await getPrograms("user-1");

    expect(fn("rpc")).toHaveBeenCalledWith("program_user_counts", { p_program_ids: ["p1"] });
    expect(fn("from")).not.toHaveBeenCalledWith("workout_sessions");
    expect(program.userCount).toBe(7);
  });
});

describe("duplicateProgramWeek", () => {
  const dayRow = (id: string, dayIndex: number) => ({
    id, week: 3, day_index: dayIndex, day_type: "upper-a", program_day_exercises: [],
  });

  it("duplicates atomically via RPC, then returns the new week's days in order", async () => {
    responses.push({ data: null, error: null });
    responses.push({ data: [dayRow("d2", 1), dayRow("d1", 0)], error: null });

    const days = await duplicateProgramWeek("p1", 2, 3, 3);

    expect(fn("rpc")).toHaveBeenCalledWith("duplicate_program_week", {
      p_program_id: "p1", p_source_week: 2, p_target_week: 3, p_new_total_weeks: 3,
    });
    expect(fn("insert")).not.toHaveBeenCalled();
    expect(days.map((d) => d.pdId)).toEqual(["d1", "d2"]);
  });

  it("throws and does not fetch when the duplication fails", async () => {
    responses.push(failure("duplicate key"));
    await expect(duplicateProgramWeek("p1", 2, 3, 3)).rejects.toThrow(DbError);
    expect(fn("from")).not.toHaveBeenCalled();
  });
});

// ─── Cascading deletes are a single request ──────────────────────────────────

describe("deletes rely on ON DELETE CASCADE", () => {
  it("deleteWorkoutSession deletes only the session row", async () => {
    await deleteWorkoutSession("sess-1");
    expect(fn("from")).toHaveBeenCalledTimes(1);
    expect(fn("from")).toHaveBeenCalledWith("workout_sessions");
  });

  it("deleteProgramDay deletes only the day row", async () => {
    await deleteProgramDay("day-1");
    expect(fn("from")).toHaveBeenCalledTimes(1);
    expect(fn("from")).toHaveBeenCalledWith("program_days");
  });
});

// ─── saveExerciseSwaps ───────────────────────────────────────────────────────

describe("saveExerciseSwaps", () => {
  it("writes the workout's whole swap map to its session", async () => {
    await saveExerciseSwaps("sess-1", { bench: "db-bench", row: "cable-row" });
    expect(fn("update")).toHaveBeenCalledWith({ exercise_swaps: { bench: "db-bench", row: "cable-row" } });
    expect(fn("eq")).toHaveBeenCalledWith("id", "sess-1");
  });

  it("throws a DbError instead of hiding a failed save", async () => {
    responses.push(failure("offline"));
    await expect(saveExerciseSwaps("sess-1", {})).rejects.toThrow(DbError);
  });
});

// ─── Body weight ─────────────────────────────────────────────────────────────

describe("getLatestBodyWeight", () => {
  it("returns the most recent weigh-in, mapped", async () => {
    responses.push({ data: { logged_on: "2026-11-16", weight_kg: 82.4, source: "manual" }, error: null });
    expect(await getLatestBodyWeight("user-1")).toEqual({ loggedOn: "2026-11-16", weightKg: 82.4, source: "manual" });
    expect(fn("order")).toHaveBeenCalledWith("logged_on", { ascending: false });
  });

  it("returns null before the first weigh-in", async () => {
    responses.push({ data: null, error: null });
    expect(await getLatestBodyWeight("user-1")).toBeNull();
  });
});

describe("logBodyWeight", () => {
  it("upserts one manual entry per day, so logging the same day again replaces it", async () => {
    await logBodyWeight("user-1", "2026-11-16", 82.4);
    expect(fn("upsert")).toHaveBeenCalledWith(
      { user_id: "user-1", logged_on: "2026-11-16", weight_kg: 82.4, source: "manual" },
      { onConflict: "user_id,logged_on" },
    );
  });

  it("throws a DbError instead of hiding a failed save", async () => {
    responses.push(failure("offline"));
    await expect(logBodyWeight("user-1", "2026-11-16", 82.4)).rejects.toThrow(DbError);
  });
});

// ─── upsertPreferences ───────────────────────────────────────────────────────

describe("upsertPreferences", () => {
  it("maps camelCase fields to snake_case columns (regression: fields were spread as-is)", async () => {
    // weekStartsOn 0 (Sunday) is falsy: it must still be written.
    await upsertPreferences("user-1", { alternateSelections: { bench: 1 }, weekStartsOn: 0 });
    expect(fn("upsert")).toHaveBeenCalledWith(
      { user_id: "user-1", alternate_selections: { bench: 1 }, week_starts_on: 0 },
      { onConflict: "user_id" },
    );
  });
});

// ─── Workout history / detail ────────────────────────────────────────────────

describe("getWorkoutDetail", () => {
  it("loads the session and its sets in one query, sets ordered by log time", async () => {
    responses.push({ data: { ...sessionRow, completed_at: "2026-11-01T10:30:00Z", set_logs: [setRow(), setRow({ id: "set-2" })] }, error: null });
    const result = await getWorkoutDetail("sess-1");

    expect(fn("from")).toHaveBeenCalledTimes(1);
    expect(fn("select")).toHaveBeenCalledWith("*, set_logs(*)");
    expect(fn("eq")).toHaveBeenCalledWith("id", "sess-1");
    expect(fn("order")).toHaveBeenCalledWith("logged_at", { referencedTable: "set_logs" });
    expect(result?.session).toMatchObject({ id: "sess-1", week: 2, dayType: "lower-a" });
    expect(result?.sets.map((s) => s.id)).toEqual(["set-1", "set-2"]);
  });

  it("returns null when the session doesn't exist (or RLS hides it)", async () => {
    responses.push({ data: null, error: null });
    expect(await getWorkoutDetail("missing")).toBeNull();
  });

  it("fails fast on a Supabase error", async () => {
    responses.push(failure("boom"));
    await expect(getWorkoutDetail("sess-1")).rejects.toThrow("getWorkoutDetail failed: boom");
  });
});

describe("getCompletedSlots", () => {
  it("selects only position columns for completed sessions, newest first", async () => {
    responses.push({ data: [{ id: "s2", week: 1, day_index: 1 }, { id: "s1", week: 1, day_index: 0 }], error: null });
    const result = await getCompletedSlots("user-1");

    expect(fn("select")).toHaveBeenCalledWith("id, week, day_index");
    expect(fn("not")).toHaveBeenCalledWith("completed_at", "is", null);
    expect(fn("order")).toHaveBeenCalledWith("completed_at", { ascending: false });
    expect(result).toEqual([
      { sessionId: "s2", week: 1, dayIndex: 1 },
      { sessionId: "s1", week: 1, dayIndex: 0 },
    ]);
  });
});

describe("getRecentWorkouts without a limit", () => {
  it("returns the full history (no .limit call)", async () => {
    responses.push({ data: [], error: null });
    await getRecentWorkouts("user-1");
    expect(fn("limit")).not.toHaveBeenCalled();
  });
});

// ─── Progress ────────────────────────────────────────────────────────────────

describe("getWeeklyVolume", () => {
  // Three parallel queries, answered in order: sets, exercises, weigh-ins.
  const totals = (result: WeeklyVolume) => result.weeks.map(({ week, volume }) => ({ week, volume }));
  const set = (exercise_id: string, weight_kg: number, reps: number, week: number) =>
    ({ exercise_id, weight_kg, reps, logged_at: "2026-11-10T10:00:00Z", workout_sessions: { week, completed_at: "x" } });

  it("sums kg × reps per week, rounds, and sorts weeks ascending", async () => {
    responses.push(
      { data: [set("bench", 100, 5, 2), set("bench", 50.5, 3, 1), set("bench", 100, 5, 2)], error: null },
      { data: [{ id: "bench", is_bodyweight: false, weight_per_side: false, muscle_group: "chest" }], error: null },
      { data: [], error: null },
    );
    const result = await getWeeklyVolume("user-1");
    expect(totals(result)).toEqual([{ week: 1, volume: 152 }, { week: 2, volume: 1000 }]);
    expect(result.weeks[1].byRegion.chest).toBe(1000);
    expect(result.missingBodyWeight).toBe(false);
    expect(fn("gte")).toHaveBeenCalledWith("set_index", 0);
  });

  it("doubles per-side weights and adds the body weight logged by then to bodyweight sets", async () => {
    responses.push(
      { data: [set("db-row", 30, 10, 1), set("pull-up", 10, 8, 1)], error: null },
      { data: [
        { id: "db-row", is_bodyweight: false, weight_per_side: true, muscle_group: "back" },
        { id: "pull-up", is_bodyweight: true, weight_per_side: false, muscle_group: "back" },
      ], error: null },
      { data: [{ logged_on: "2026-11-09", weight_kg: 80, source: "manual" }], error: null },
    );
    // 2 × 30 × 10 = 600, plus (80 + 10) × 8 = 720
    expect(totals(await getWeeklyVolume("user-1"))).toEqual([{ week: 1, volume: 1320 }]);
  });
});

describe("getLoggedExerciseIds", () => {
  it("returns each logged exercise once, working sets only", async () => {
    responses.push({ data: [{ exercise_id: "bench" }, { exercise_id: "row" }, { exercise_id: "bench" }], error: null });
    expect(await getLoggedExerciseIds("user-1")).toEqual(["bench", "row"]);
    expect(fn("select")).toHaveBeenCalledWith("exercise_id");
    expect(fn("gte")).toHaveBeenCalledWith("set_index", 0);
  });
});
