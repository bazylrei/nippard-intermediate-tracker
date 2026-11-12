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
  logSetAndAdvance, getLastSetsForExercises, duplicateProgramWeek, getPrograms,
  getIncompleteSessionWithSets, getExerciseHistory, upsertPreferences, completeSession,
  deleteWorkoutSession, deleteProgramDay,
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

// ─── upsertPreferences ───────────────────────────────────────────────────────

describe("upsertPreferences", () => {
  it("maps camelCase fields to snake_case columns (regression: fields were spread as-is)", async () => {
    await upsertPreferences("user-1", { alternateSelections: { bench: 1 }, bodyWeightKg: 80 });
    expect(fn("upsert")).toHaveBeenCalledWith(
      { user_id: "user-1", alternate_selections: { bench: 1 }, body_weight_kg: 80 },
      { onConflict: "user_id" },
    );
  });
});
