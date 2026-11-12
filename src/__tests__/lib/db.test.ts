import { describe, it, expect, vi, beforeEach } from "vitest";

// Build a chainable mock where each method returns the chain itself,
// and the terminal async methods return resolved values we can override per test.
const mockSingle = vi.fn().mockResolvedValue({ data: null, error: null });
const mockUpsert = vi.fn().mockResolvedValue({ data: null, error: null });

const mockChain: Record<string, ReturnType<typeof vi.fn>> = {};

const chainableMethods = [
  "from", "select", "eq", "neq", "is", "not", "order",
  "limit", "update", "delete", "filter", "in", "gte", "or",
];

chainableMethods.forEach((m) => {
  mockChain[m] = vi.fn().mockReturnValue(mockChain);
});

// Override terminal async methods (single-row reads use maybeSingle so "no row" isn't an error)
mockChain.single = mockSingle;
mockChain.maybeSingle = mockSingle;
mockChain.upsert = mockUpsert;

// insert returns the chain (so .insert().select().single() works)
mockChain.insert = vi.fn().mockReturnValue(mockChain);

vi.mock("@/lib/supabase", () => ({
  createClient: () => mockChain,
}));

import {
  getLastCompletedWorkout, getPreferences, saveExerciseNote, getIncompleteSession, getRecentWorkouts,
} from "@/lib/db";

beforeEach(() => {
  vi.clearAllMocks();
  // Reset terminal mocks to default after clearAllMocks
  mockChain.single = mockSingle;
  mockChain.maybeSingle = mockSingle;
  mockChain.upsert = mockUpsert;
  mockChain.insert = vi.fn().mockReturnValue(mockChain);
  chainableMethods.forEach((m) => {
    mockChain[m] = vi.fn().mockReturnValue(mockChain);
  });
  mockSingle.mockResolvedValue({ data: null, error: null });
  mockUpsert.mockResolvedValue({ data: null, error: null });
});

// ─── getLastCompletedWorkout ───────────────────────────────────────────────────
// (What comes *next* depends on the program schedule — see program-data tests.)

describe("getLastCompletedWorkout", () => {
  it("returns null when no session has been completed", async () => {
    mockSingle.mockResolvedValue({ data: null, error: null });
    expect(await getLastCompletedWorkout("user-1")).toBeNull();
  });

  it("returns the position of the most recently completed session", async () => {
    mockSingle.mockResolvedValue({ data: { week: 12, day_index: 4 }, error: null });
    expect(await getLastCompletedWorkout("user-1")).toEqual({ week: 12, dayIndex: 4 });
    expect(mockChain.order).toHaveBeenCalledWith("completed_at", { ascending: false });
  });
});

// ─── getPreferences ────────────────────────────────────────────────────────────

describe("getPreferences", () => {
  it("returns defaults when data is null", async () => {
    mockSingle.mockResolvedValue({ data: null, error: null });
    const result = await getPreferences("user-1");
    expect(result).toEqual({
      unit: "kg",
      alternateSelections: {},
      bodyWeightKg: null,
      heightCm: null,
      exerciseNotes: {},
    });
  });

  it("maps DB row fields to camelCase correctly", async () => {
    mockSingle.mockResolvedValue({
      data: {
        unit: "lbs",
        alternate_selections: { ex1: 1 },
        body_weight_kg: 80,
        height_cm: 180,
        exercise_notes: { ex1: "my note" },
      },
      error: null,
    });
    const result = await getPreferences("user-1");
    expect(result).toEqual({
      unit: "lbs",
      alternateSelections: { ex1: 1 },
      bodyWeightKg: 80,
      heightCm: 180,
      exerciseNotes: { ex1: "my note" },
    });
  });
});

// ─── saveExerciseNote ──────────────────────────────────────────────────────────

describe("saveExerciseNote", () => {
  it("calls upsert with current notes merged with the new note", async () => {
    const current = { "ex-existing": "old note" };
    await saveExerciseNote("user-1", "ex-new", "my note", current);

    expect(mockUpsert).toHaveBeenCalledWith(
      {
        user_id: "user-1",
        exercise_notes: { "ex-existing": "old note", "ex-new": "my note" },
      },
      { onConflict: "user_id" }
    );
  });

  it("preserves existing notes while adding a new one", async () => {
    const current = { "ex-1": "note 1", "ex-2": "note 2" };
    await saveExerciseNote("user-1", "ex-3", "note 3", current);

    const upsertArg = mockUpsert.mock.calls[0][0] as { exercise_notes: Record<string, string> };
    expect(upsertArg.exercise_notes).toEqual({
      "ex-1": "note 1",
      "ex-2": "note 2",
      "ex-3": "note 3",
    });
  });

  it("overwrites an existing note for the same exerciseId", async () => {
    const current = { "ex-1": "old note" };
    await saveExerciseNote("user-1", "ex-1", "updated note", current);

    const upsertArg = mockUpsert.mock.calls[0][0] as { exercise_notes: Record<string, string> };
    expect(upsertArg.exercise_notes).toEqual({ "ex-1": "updated note" });
  });

  it("works with an empty current object", async () => {
    await saveExerciseNote("user-1", "ex-1", "first note", {});

    const upsertArg = mockUpsert.mock.calls[0][0] as { exercise_notes: Record<string, string> };
    expect(upsertArg.exercise_notes).toEqual({ "ex-1": "first note" });
  });
});

// ─── getIncompleteSession ──────────────────────────────────────────────────────

describe("getIncompleteSession", () => {
  it("returns null when data is null", async () => {
    mockSingle.mockResolvedValue({ data: null, error: null });
    const result = await getIncompleteSession("user-1");
    expect(result).toBeNull();
  });

  it("maps a DB row to a WorkoutSession with camelCase fields", async () => {
    const mockRow = {
      id: "sess-1",
      user_id: "user-1",
      program_id: null,
      week: 2,
      day_index: 1,
      day_type: "upper-a",
      started_at: "2024-01-01T10:00:00Z",
      completed_at: null,
      current_exercise_index: 3,
      current_set_index: 2,
    };
    mockSingle.mockResolvedValue({ data: mockRow, error: null });

    const result = await getIncompleteSession("user-1");
    expect(result).toEqual({
      id: "sess-1",
      userId: "user-1",
      programId: null,
      week: 2,
      dayIndex: 1,
      dayType: "upper-a",
      startedAt: "2024-01-01T10:00:00Z",
      completedAt: null,
      currentExerciseIndex: 3,
      currentSetIndex: 2,
    });
  });

  it("maps programId correctly when present", async () => {
    const mockRow = {
      id: "sess-2",
      user_id: "user-2",
      program_id: "prog-abc",
      week: 5,
      day_index: 2,
      day_type: "lower-a",
      started_at: "2024-02-15T08:00:00Z",
      completed_at: null,
      current_exercise_index: 0,
      current_set_index: 0,
    };
    mockSingle.mockResolvedValue({ data: mockRow, error: null });

    const result = await getIncompleteSession("user-2");
    expect(result?.programId).toBe("prog-abc");
    expect(result?.dayType).toBe("lower-a");
  });
});

// ─── getRecentWorkouts ─────────────────────────────────────────────────────────

describe("getRecentWorkouts", () => {
  it("fetches sessions and their working sets in one query", async () => {
    mockChain.limit = vi.fn().mockResolvedValue({
      data: [{
        id: "s1", user_id: "u1", program_id: null, week: 2, day_index: 1, day_type: "push",
        started_at: "2026-11-10T10:00:00Z", completed_at: "2026-11-10T11:00:00Z",
        current_exercise_index: 0, current_set_index: 0,
        set_logs: [{ exercise_id: "bench" }, { exercise_id: "bench" }, { exercise_id: "fly" }],
      }],
      error: null,
    });
    const { sessions, sets } = await getRecentWorkouts("u1", 5);

    expect(mockChain.from).toHaveBeenCalledTimes(1);
    expect(mockChain.select).toHaveBeenCalledWith("*, set_logs(exercise_id)");
    expect(mockChain.gte).toHaveBeenCalledWith("set_logs.set_index", 0); // warm-ups excluded
    expect(mockChain.not).toHaveBeenCalledWith("completed_at", "is", null);
    expect(mockChain.limit).toHaveBeenCalledWith(5);
    expect(sessions).toHaveLength(1);
    expect(sessions[0]).toMatchObject({ id: "s1", week: 2, dayIndex: 1, dayType: "push" });
    expect(sessions[0]).not.toHaveProperty("set_logs");
    expect(sets).toEqual([
      { sessionId: "s1", exerciseId: "bench" },
      { sessionId: "s1", exerciseId: "bench" },
      { sessionId: "s1", exerciseId: "fly" },
    ]);
  });

  it("returns empty lists when there are no completed sessions", async () => {
    mockChain.limit = vi.fn().mockResolvedValue({ data: [], error: null });
    expect(await getRecentWorkouts("u1", 5)).toEqual({ sessions: [], sets: [] });
  });
});
