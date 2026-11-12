import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import type { SetLog, WorkoutSession } from "@/lib/types";

const router = vi.hoisted(() => ({ replace: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));

const auth = vi.hoisted(() => ({ getSignedInUser: vi.fn() }));
vi.mock("@/lib/auth", () => auth);

const db = vi.hoisted(() => ({
  getWorkoutDetail: vi.fn(),
  updateSetLog: vi.fn(),
  deleteSetLog: vi.fn(),
  deleteExerciseSetsFromSession: vi.fn(),
  updateExerciseIdForSets: vi.fn(),
  addSetsToSession: vi.fn(),
  deleteWorkoutSession: vi.fn(),
}));
vi.mock("@/lib/db", () => db);

import { useWorkoutDetail } from "@/hooks/useWorkoutDetail";

const session = { id: "sess-1", week: 1, dayType: "push" } as WorkoutSession;
const set = (id: string, exerciseId: string, over: Partial<SetLog> = {}) =>
  ({ id, exerciseId, setIndex: 0, weight: 100, reps: 8, rpe: 8, ...over }) as SetLog;

async function loaded() {
  const hook = renderHook(() => useWorkoutDetail("sess-1"));
  await waitFor(() => expect(hook.result.current.status).toBe("ready"));
  return hook;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
  auth.getSignedInUser.mockResolvedValue({ id: "user-1" });
  db.getWorkoutDetail.mockResolvedValue({ session, sets: [set("a", "bench"), set("b", "row")] });
  for (const k of ["updateSetLog", "deleteSetLog", "deleteExerciseSetsFromSession", "updateExerciseIdForSets", "deleteWorkoutSession"] as const) {
    db[k].mockResolvedValue(undefined);
  }
});

describe("loading", () => {
  it("loads the session and its sets", async () => {
    const { result } = await loaded();
    expect(result.current.session).toBe(session);
    expect(result.current.sets).toHaveLength(2);
  });

  it("redirects to /auth when signed out", async () => {
    auth.getSignedInUser.mockResolvedValue(null);
    renderHook(() => useWorkoutDetail("sess-1"));
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/auth"));
    expect(db.getWorkoutDetail).not.toHaveBeenCalled();
  });

  it("reports not-found when the workout doesn't exist", async () => {
    db.getWorkoutDetail.mockResolvedValue(null);
    const { result } = renderHook(() => useWorkoutDetail("sess-1"));
    await waitFor(() => expect(result.current.status).toBe("not-found"));
  });

  it("reports an error instead of hanging on Loading when the query fails", async () => {
    db.getWorkoutDetail.mockRejectedValue(new Error("offline"));
    const { result } = renderHook(() => useWorkoutDetail("sess-1"));
    await waitFor(() => expect(result.current.status).toBe("error"));
  });
});

describe("edits", () => {
  it("updates a set locally after saving, keeping the rest of the row", async () => {
    const { result } = await loaded();
    await act(async () => { expect(await result.current.actions.updateSet("a", 110, 6, 8)).toBe(true); });
    expect(db.updateSetLog).toHaveBeenCalledWith("a", 110, 6, 8);
    expect(result.current.sets[0]).toMatchObject({ id: "a", weight: 110, reps: 6, rpe: 8 });
  });

  it("leaves local state alone and surfaces a message when a save fails", async () => {
    db.updateSetLog.mockRejectedValue(new Error("offline"));
    const { result } = await loaded();
    await act(async () => { expect(await result.current.actions.updateSet("a", 110, 6, 8)).toBe(false); });
    expect(result.current.sets[0].weight).toBe(100);
    expect(result.current.saveError.message).toBe("Couldn't save that set. Try again.");
  });

  it("deletes a set", async () => {
    const { result } = await loaded();
    await act(async () => { await result.current.actions.deleteSet("a"); });
    expect(result.current.sets.map((s) => s.id)).toEqual(["b"]);
  });

  it("removes every set of an exercise", async () => {
    const { result } = await loaded();
    await act(async () => { await result.current.actions.removeExercise("bench"); });
    expect(db.deleteExerciseSetsFromSession).toHaveBeenCalledWith("sess-1", "bench");
    expect(result.current.sets.map((s) => s.exerciseId)).toEqual(["row"]);
  });

  it("swaps an exercise, and treats picking the same one as a no-op", async () => {
    const { result } = await loaded();
    await act(async () => { await result.current.actions.swapExercise("bench", "bench"); });
    expect(db.updateExerciseIdForSets).not.toHaveBeenCalled();
    await act(async () => { await result.current.actions.swapExercise("bench", "dips"); });
    expect(db.updateExerciseIdForSets).toHaveBeenCalledWith("sess-1", "bench", "dips");
    expect(result.current.sets[0].exerciseId).toBe("dips");
  });

  it("adds an exercise with the new rows from the DB", async () => {
    db.addSetsToSession.mockResolvedValue([set("c", "curl")]);
    const { result } = await loaded();
    await act(async () => { await result.current.actions.addExercise("curl", [{ weight: 20, reps: 10 }]); });
    expect(db.addSetsToSession).toHaveBeenCalledWith("sess-1", "curl", "user-1", [{ weight: 20, reps: 10 }]);
    expect(result.current.sets.map((s) => s.id)).toEqual(["a", "b", "c"]);
  });

  it("deletes the workout and reports success", async () => {
    const { result } = await loaded();
    let ok = false;
    await act(async () => { ok = await result.current.actions.deleteWorkout(); });
    expect(ok).toBe(true);
    expect(db.deleteWorkoutSession).toHaveBeenCalledWith("sess-1");
  });
});
