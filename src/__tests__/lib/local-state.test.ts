import { describe, it, expect, vi, beforeEach } from "vitest";
import { cachePrefs, DEFAULT_PREFS, readCachedPrefs } from "@/lib/prefs-cache";
import { ACTIVE_WORKOUT_EVENT, clearActiveWorkout, readActiveWorkout, saveActiveWorkout } from "@/lib/active-workout";

beforeEach(() => localStorage.clear());

describe("prefs cache", () => {
  it("is empty until preferences are cached, then returns them", () => {
    expect(readCachedPrefs()).toBeNull();
    cachePrefs({ ...DEFAULT_PREFS, unit: "lbs" });
    expect(readCachedPrefs()?.unit).toBe("lbs");
  });

  it("defaults to kg with no selections or notes", () => {
    expect(DEFAULT_PREFS).toEqual({ unit: "kg", alternateSelections: {}, exerciseNotes: {} });
  });
});

describe("active workout", () => {
  const info = { week: 1, dayIndex: 2, dayType: "push", exerciseName: "Bench", exerciseIndex: 0, exerciseTotal: 5 };

  it("saves, reads and clears, announcing each change", () => {
    const listener = vi.fn();
    window.addEventListener(ACTIVE_WORKOUT_EVENT, listener);
    saveActiveWorkout(info);
    expect(readActiveWorkout()).toEqual(info);
    clearActiveWorkout();
    expect(readActiveWorkout()).toBeNull();
    expect(listener).toHaveBeenCalledTimes(2);
    window.removeEventListener(ACTIVE_WORKOUT_EVENT, listener);
  });
});
