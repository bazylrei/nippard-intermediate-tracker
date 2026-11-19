import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@/test-utils/render-with-prefs";
import { DEFAULT_PREFS } from "@/lib/prefs-cache";
import type { UserPreferences } from "@/lib/types";

const auth = vi.hoisted(() => ({ getSignedInUser: vi.fn(), onAuthUserChange: () => () => {} }));
vi.mock("@/lib/auth", () => auth);
const db = vi.hoisted(() => ({ getPreferences: vi.fn(), upsertPreferences: vi.fn() }));
vi.mock("@/lib/db", () => db);

import { useWorkoutPrefs } from "@/hooks/useWorkoutPrefs";
import { usePreferences } from "@/context/PreferencesContext";

const account = (over: Partial<UserPreferences> = {}): UserPreferences => ({ ...DEFAULT_PREFS, ...over });

/** Both hooks, once the account's preferences have loaded. */
async function loaded() {
  const hook = renderHook(() => ({ workout: useWorkoutPrefs(), provider: usePreferences() }));
  await waitFor(() => expect(hook.result.current.provider.ready).toBe(true));
  return hook;
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  auth.getSignedInUser.mockResolvedValue({ id: "user-1" });
  db.getPreferences.mockResolvedValue(account());
  db.upsertPreferences.mockResolvedValue(undefined);
});

describe("useWorkoutPrefs", () => {
  it("starts from cached prefs when present", () => {
    localStorage.setItem("workout_cache_prefs", JSON.stringify({ unit: "lbs", alternateSelections: { bench: "db-bench" }, exerciseNotes: {} }));
    const { result } = renderHook(() => useWorkoutPrefs());
    expect(result.current.prefs.unit).toBe("lbs");
  });

  it("saves an alternate as the default for an exercise, and caches it", async () => {
    const { result } = await loaded();

    await act(() => result.current.workout.setDefaultAlternate("bench", "db-bench"));

    expect(result.current.workout.prefs.alternateSelections).toEqual({ bench: "db-bench" });
    expect(db.upsertPreferences).toHaveBeenLastCalledWith("user-1", { alternateSelections: { bench: "db-bench" } });
    expect(JSON.parse(localStorage.getItem("workout_cache_prefs")!).alternateSelections).toEqual({ bench: "db-bench" });
  });

  it("changes one exercise's default without touching the others", async () => {
    db.getPreferences.mockResolvedValue(account({ alternateSelections: { bench: "db-bench", row: "cable-row" } }));
    const { result } = await loaded();

    await act(() => result.current.workout.setDefaultAlternate("bench", "machine-press"));

    expect(result.current.workout.prefs.alternateSelections).toEqual({ bench: "machine-press", row: "cable-row" });
  });

  it("clears the default when the main exercise is chosen again", async () => {
    db.getPreferences.mockResolvedValue(account({ alternateSelections: { bench: "db-bench", row: "cable-row" } }));
    const { result } = await loaded();

    await act(() => result.current.workout.setDefaultAlternate("bench", "bench"));

    expect(result.current.workout.prefs.alternateSelections).toEqual({ row: "cable-row" });
    expect(db.upsertPreferences).toHaveBeenLastCalledWith("user-1", { alternateSelections: { row: "cable-row" } });
  });

  it("saves a note alongside the others and merges it into prefs", async () => {
    db.getPreferences.mockResolvedValue(account({ exerciseNotes: { row: "chest up" } }));
    const { result } = await loaded();
    await act(() => result.current.workout.saveNote("bench", "elbows in"));

    expect(db.upsertPreferences).toHaveBeenCalledWith("user-1", { exerciseNotes: { row: "chest up", bench: "elbows in" } });
    expect(result.current.workout.prefs.exerciseNotes).toEqual({ row: "chest up", bench: "elbows in" });
  });

  it("persists nothing, and says so, when nobody is signed in", async () => {
    auth.getSignedInUser.mockResolvedValue(null);
    const { result } = renderHook(() => useWorkoutPrefs());
    await act(async () => {});
    await act(async () => { await expect(result.current.saveNote("bench", "x")).rejects.toThrow("Not signed in"); });
    await act(async () => { await expect(result.current.setDefaultAlternate("bench", "db-bench")).rejects.toThrow("Not signed in"); });

    expect(db.upsertPreferences).not.toHaveBeenCalled();
  });
});

describe("useWorkoutPrefs — failed saves", () => {
  it("reverts the default and rethrows when saving it fails", async () => {
    const { result } = await loaded();
    db.upsertPreferences.mockRejectedValueOnce(new Error("offline"));

    await act(async () => {
      await expect(result.current.workout.setDefaultAlternate("bench", "db-bench")).rejects.toThrow("offline");
    });
    expect(result.current.workout.prefs.alternateSelections).toEqual({});
  });

  it("reverts the note and rethrows when saving it fails, for the notes sheet to show", async () => {
    const { result } = await loaded();
    db.upsertPreferences.mockRejectedValueOnce(new Error("offline"));

    await act(async () => {
      await expect(result.current.workout.saveNote("bench", "elbows in")).rejects.toThrow("offline");
    });
    expect(result.current.workout.prefs.exerciseNotes).toEqual({});
  });
});
