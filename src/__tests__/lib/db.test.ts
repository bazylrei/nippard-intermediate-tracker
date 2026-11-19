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
  getPreferences, upsertPreferences, getRecentWorkouts,
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

// ─── getPreferences ────────────────────────────────────────────────────────────

describe("getPreferences", () => {
  it("ignores saved alternate selections in the old position / boolean format", async () => {
    mockSingle.mockResolvedValue({
      data: { unit: "kg", alternate_selections: { bench: 2, row: 0, curl: true, press: "db-press" }, height_cm: null, exercise_notes: {}, week_starts_on: 1 },
      error: null,
    });
    const result = await getPreferences("user-1");
    expect(result.alternateSelections).toEqual({ press: "db-press" });
  });

  it("returns defaults when data is null", async () => {
    mockSingle.mockResolvedValue({ data: null, error: null });
    const result = await getPreferences("user-1");
    expect(result).toEqual({
      unit: "kg",
      alternateSelections: {},
      heightCm: null,
      exerciseNotes: {},
      weekStartsOn: 1,
    });
  });

  it("maps DB row fields to camelCase correctly", async () => {
    mockSingle.mockResolvedValue({
      data: {
        unit: "lbs",
        alternate_selections: { ex1: "ex1-alt" },
        height_cm: 180,
        exercise_notes: { ex1: "my note" },
        week_starts_on: 0,
      },
      error: null,
    });
    const result = await getPreferences("user-1");
    expect(result).toEqual({
      unit: "lbs",
      alternateSelections: { ex1: "ex1-alt" },
      heightCm: 180,
      exerciseNotes: { ex1: "my note" },
      weekStartsOn: 0,
    });
  });
});

// ─── upsertPreferences: notes ──────────────────────────────────────────────────

describe("upsertPreferences — exercise notes", () => {
  it("writes the whole notes map under exercise_notes (what the client merged), touching nothing else", async () => {
    await upsertPreferences("user-1", { exerciseNotes: { "ex-1": "note 1", "ex-2": "note 2" } });

    expect(mockUpsert).toHaveBeenCalledWith(
      { user_id: "user-1", exercise_notes: { "ex-1": "note 1", "ex-2": "note 2" } },
      { onConflict: "user_id" }
    );
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
