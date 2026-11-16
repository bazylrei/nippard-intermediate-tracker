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
    localStorage.setItem("workout_cache_prefs", JSON.stringify({ unit: "lbs", alternateSelections: { bench: "db-bench" }, exerciseNotes: {} }));
    const { result } = renderHook(() => useWorkoutPrefs("user-1"));
    expect(result.current.prefs.unit).toBe("lbs");
  });

  it("saves an alternate as the default for an exercise, and caches it", async () => {
    const { result } = renderHook(() => useWorkoutPrefs("user-1"));

    await act(() => result.current.setDefaultAlternate("bench", "db-bench"));

    expect(result.current.prefs.alternateSelections).toEqual({ bench: "db-bench" });
    expect(db.upsertPreferences).toHaveBeenLastCalledWith("user-1", { alternateSelections: { bench: "db-bench" } });
    expect(JSON.parse(localStorage.getItem("workout_cache_prefs")!).alternateSelections).toEqual({ bench: "db-bench" });
  });

  it("changes one exercise's default without touching the others", async () => {
    localStorage.setItem("workout_cache_prefs", JSON.stringify({ unit: "kg", alternateSelections: { bench: "db-bench", row: "cable-row" }, exerciseNotes: {} }));
    const { result } = renderHook(() => useWorkoutPrefs("user-1"));

    await act(() => result.current.setDefaultAlternate("bench", "machine-press"));

    expect(result.current.prefs.alternateSelections).toEqual({ bench: "machine-press", row: "cable-row" });
  });

  it("clears the default when the main exercise is chosen again", async () => {
    localStorage.setItem("workout_cache_prefs", JSON.stringify({ unit: "kg", alternateSelections: { bench: "db-bench", row: "cable-row" }, exerciseNotes: {} }));
    const { result } = renderHook(() => useWorkoutPrefs("user-1"));

    await act(() => result.current.setDefaultAlternate("bench", "bench"));

    expect(result.current.prefs.alternateSelections).toEqual({ row: "cable-row" });
    expect(db.upsertPreferences).toHaveBeenLastCalledWith("user-1", { alternateSelections: { row: "cable-row" } });
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
    await act(() => result.current.setDefaultAlternate("bench", "db-bench"));

    expect(db.saveExerciseNote).not.toHaveBeenCalled();
    expect(db.upsertPreferences).not.toHaveBeenCalled();
  });
});

describe("useWorkoutPrefs — failed default", () => {
  it("reverts the default and rethrows when saving it fails", async () => {
    db.upsertPreferences.mockRejectedValueOnce(new Error("offline"));
    const { result } = renderHook(() => useWorkoutPrefs("user-1"));

    await act(async () => {
      await expect(result.current.setDefaultAlternate("bench", "db-bench")).rejects.toThrow("offline");
    });
    expect(result.current.prefs.alternateSelections).toEqual({});
  });
});
