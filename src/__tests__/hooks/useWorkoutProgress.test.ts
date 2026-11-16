import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import type { Exercise, SetLog, WorkoutSession } from "@/lib/types";

const db = vi.hoisted(() => ({
  updateSessionProgress: vi.fn(),
  completeSession: vi.fn(),
  logSetAndAdvance: vi.fn(),
  updateSetLog: vi.fn(),
}));
vi.mock("@/lib/db", () => db);

import { useWorkoutProgress, START } from "@/hooks/useWorkoutProgress";
import { readActiveWorkout } from "@/lib/active-workout";

// Two exercises with 2 working sets each.
const exercise = (id: string) => ({ id, name: id, earlySetCount: 1, lastSetCount: 1, restSeconds: [60, 120] }) as unknown as Exercise;
const exercises = [exercise("bench"), exercise("fly")];
const session = { id: "sess-1", week: 1, dayIndex: 0, dayType: "upper-a", startedAt: "" } as WorkoutSession;
const logged = (exerciseId: string, setIndex: number) => ({ id: `${exerciseId}-${setIndex}`, exerciseId, setIndex, weight: 100, reps: 8, rpe: null }) as SetLog;

function setup() {
  const saveError = { attempt: vi.fn(async (save: () => Promise<unknown>) => { try { await save(); return true; } catch { return false; } }), report: vi.fn(), clear: vi.fn() };
  const onRest = vi.fn();
  const hook = renderHook(() => useWorkoutProgress({ session, userId: "user-1", exercises, saveError, onRest }));
  return { ...hook, saveError, onRest };
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  for (const fn of Object.values(db)) fn.mockResolvedValue(undefined);
});

describe("useWorkoutProgress — position", () => {
  it("starts on the overview with nothing logged, and restore replaces the position", () => {
    const { result } = setup();
    expect(result.current).toMatchObject({ phase: "overview", exerciseIndex: 0, done: false, sessionSets: [] });

    act(() => result.current.restore({ sessionSets: [logged("bench", 0)], exerciseIndex: 0, setIndex: 1, phase: "sets" }));

    expect(result.current).toMatchObject({ phase: "sets", workingSetIndex: 1 });
    expect(result.current.currentExercise?.id).toBe("bench");
  });

  it("begins at the warm-up", () => {
    const { result } = setup();
    act(() => result.current.begin());
    expect(result.current.phase).toBe("warmup");
  });

  it("finishing the warm-up moves to the first unlogged set and saves the place", () => {
    const { result } = setup();
    act(() => result.current.restore({ ...START, setIndex: -1, phase: "warmup" }));

    act(() => result.current.completeWarmup());

    expect(result.current).toMatchObject({ phase: "sets", workingSetIndex: 0 });
    expect(db.updateSessionProgress).toHaveBeenCalledWith("sess-1", 0, 0);
  });
});

describe("useWorkoutProgress — moving between exercises", () => {
  it("goes back to a started exercise at its next set and records it as in progress", () => {
    const { result } = setup();
    act(() => result.current.restore({ sessionSets: [logged("bench", 0)], exerciseIndex: 1, setIndex: -1, phase: "warmup" }));

    act(() => result.current.goToExercise(0));

    expect(result.current).toMatchObject({ exerciseIndex: 0, phase: "sets", workingSetIndex: 1 });
    expect(db.updateSessionProgress).toHaveBeenCalledWith("sess-1", 0, 1);
    expect(readActiveWorkout()).toMatchObject({ exerciseName: "bench", exerciseIndex: 0 });
  });

  it("skipping the last exercise completes the session", async () => {
    const { result } = setup();
    act(() => result.current.restore({ ...START, exerciseIndex: 1, phase: "sets" }));

    await act(() => result.current.skipExercise());

    expect(db.completeSession).toHaveBeenCalledWith("sess-1");
    expect(result.current.done).toBe(true);
  });

  it("stays on the workout when completing via skip fails", async () => {
    db.completeSession.mockRejectedValue(new Error("offline"));
    const { result } = setup();
    act(() => result.current.restore({ ...START, exerciseIndex: 1, phase: "sets" }));

    await act(() => result.current.skipExercise());

    expect(result.current.done).toBe(false);
  });

  it("knows which exercises are done", () => {
    const { result } = setup();
    act(() => result.current.restore({ ...START, sessionSets: [logged("bench", 0), logged("bench", 1)], phase: "sets" }));
    expect(result.current.isExerciseDone(0)).toBe(true);
    expect(result.current.isExerciseDone(1)).toBe(false);
    expect(result.current.isExerciseDone(5)).toBe(false);
  });
});

describe("useWorkoutProgress — logging sets", () => {
  it("advances and starts the rest at once, saving the set and next position together", async () => {
    const { result, onRest } = setup();
    act(() => result.current.restore({ ...START, phase: "sets" }));

    await act(() => result.current.logSet(100, 8, 8, null));

    expect(result.current.workingSetIndex).toBe(1);
    expect(onRest).toHaveBeenCalledWith(90);
    expect(db.logSetAndAdvance).toHaveBeenCalledWith(expect.objectContaining({
      sessionId: "sess-1", exerciseId: "bench", setIndex: 0, nextExerciseIndex: 0, nextSetIndex: 1, completeSession: false,
    }));
  });

  it("moves to the next exercise's warm-up after an exercise's last set", async () => {
    const { result } = setup();
    act(() => result.current.restore({ ...START, sessionSets: [logged("bench", 0)], setIndex: 1, phase: "sets" }));

    await act(() => result.current.logSet(100, 8, null, true));

    expect(result.current).toMatchObject({ exerciseIndex: 1, phase: "warmup" });
  });

  it("rolls back and reports when the set can't be saved", async () => {
    db.logSetAndAdvance.mockRejectedValue(new Error("offline"));
    const { result, saveError } = setup();
    act(() => result.current.restore({ ...START, phase: "sets" }));

    await act(() => result.current.logSet(100, 8, null, null));

    expect(result.current).toMatchObject({ sessionSets: [], workingSetIndex: 0, done: false });
    expect(saveError.report).toHaveBeenCalledWith(expect.stringContaining("Couldn't save that set"), expect.any(Error));
  });

  it("edits a logged set in place once it's saved", async () => {
    const { result } = setup();
    act(() => result.current.restore({ ...START, sessionSets: [logged("bench", 0)], phase: "sets" }));

    await act(() => result.current.editSet("bench-0", 105, 6, 9));

    expect(db.updateSetLog).toHaveBeenCalledWith("bench-0", 105, 6, 9);
    expect(result.current.sessionSets[0]).toMatchObject({ weight: 105, reps: 6, rpe: 9 });
  });
});
