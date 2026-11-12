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

// Override terminal async methods
mockChain.single = mockSingle;
mockChain.upsert = mockUpsert;

// insert returns the chain (so .insert().select().single() works)
mockChain.insert = vi.fn().mockReturnValue(mockChain);

vi.mock("@/lib/supabase", () => ({
  createClient: () => mockChain,
}));

import { getNextSession, getPreferences, saveExerciseNote, getIncompleteSession } from "@/lib/db";

beforeEach(() => {
  vi.clearAllMocks();
  // Reset terminal mocks to default after clearAllMocks
  mockChain.single = mockSingle;
  mockChain.upsert = mockUpsert;
  mockChain.insert = vi.fn().mockReturnValue(mockChain);
  chainableMethods.forEach((m) => {
    mockChain[m] = vi.fn().mockReturnValue(mockChain);
  });
  mockSingle.mockResolvedValue({ data: null, error: null });
  mockUpsert.mockResolvedValue({ data: null, error: null });
});

// ─── getNextSession ────────────────────────────────────────────────────────────

describe("getNextSession", () => {
  it("returns week 1, dayIndex 0 when no completed session exists", async () => {
    mockSingle.mockResolvedValue({ data: null, error: null });
    const result = await getNextSession("user-1");
    expect(result).toEqual({ week: 1, dayIndex: 0 });
  });

  it("returns next day in same week when day_index < 4", async () => {
    // last session: week 3, day 2 → next: week 3, day 3
    mockSingle.mockResolvedValue({ data: { week: 3, day_index: 2 }, error: null });
    const result = await getNextSession("user-1");
    expect(result).toEqual({ week: 3, dayIndex: 3 });
  });

  it("advances to next week when day_index is 4", async () => {
    // last session: week 5, day 4 → next: week 6, day 0
    mockSingle.mockResolvedValue({ data: { week: 5, day_index: 4 }, error: null });
    const result = await getNextSession("user-1");
    expect(result).toEqual({ week: 6, dayIndex: 0 });
  });

  it("restarts at week 1, day 0 when last session was week 12, day 4", async () => {
    mockSingle.mockResolvedValue({ data: { week: 12, day_index: 4 }, error: null });
    const result = await getNextSession("user-1");
    expect(result).toEqual({ week: 1, dayIndex: 0 });
  });

  it("advances to week 12 when last session was week 11, day 4", async () => {
    mockSingle.mockResolvedValue({ data: { week: 11, day_index: 4 }, error: null });
    const result = await getNextSession("user-1");
    expect(result).toEqual({ week: 12, dayIndex: 0 });
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
