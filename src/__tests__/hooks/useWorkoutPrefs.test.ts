import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

const db = vi.hoisted(() => ({
  upsertPreferences: vi.fn().mockResolvedValue(undefined),
  saveExerciseNote: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@/lib/db", () => db);

import { useWorkoutPrefs } from "@/hooks/useWorkoutPrefs";

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
});

describe("useWorkoutPrefs", () => {
  it("starts from cached prefs when present", () => {
    localStorage.setItem("workout_cache_prefs", JSON.stringify({ unit: "lbs", alternateSelections: { bench: 2 }, exerciseNotes: {} }));
    const { result } = renderHook(() => useWorkoutPrefs("user-1"));
    expect(result.current.prefs.unit).toBe("lbs");
  });

  it("cycles an exercise main → alt 1 → alt 2 → main, persisting each step", async () => {
    const { result } = renderHook(() => useWorkoutPrefs("user-1"));

    for (const expected of [1, 2, 0]) {
      await act(() => result.current.toggleAlternate("bench"));
      expect(result.current.prefs.alternateSelections.bench).toBe(expected);
      expect(db.upsertPreferences).toHaveBeenLastCalledWith("user-1", { alternateSelections: { bench: expected } });
    }
    expect(JSON.parse(localStorage.getItem("workout_cache_prefs")!).alternateSelections.bench).toBe(0);
  });

  it("saves a note and merges it into prefs", async () => {
    const { result } = renderHook(() => useWorkoutPrefs("user-1"));
    await act(() => result.current.saveNote("bench", "elbows in"));

    expect(db.saveExerciseNote).toHaveBeenCalledWith("user-1", "bench", "elbows in", {});
    expect(result.current.prefs.exerciseNotes.bench).toBe("elbows in");
  });

  it("does not persist anything before the user is known", async () => {
    const { result } = renderHook(() => useWorkoutPrefs(null));
    await act(() => result.current.saveNote("bench", "x"));
    await act(() => result.current.toggleAlternate("bench"));

    expect(db.saveExerciseNote).not.toHaveBeenCalled();
    expect(db.upsertPreferences).not.toHaveBeenCalled();
  });
});
