import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Exercise, SetLog, WorkoutSession } from "@/lib/types";

const db = vi.hoisted(() => ({
  getPreferences: vi.fn(),
  getIncompleteSessionWithSets: vi.fn(),
  getLastSetsForExercises: vi.fn(),
  getBestSetsForExercises: vi.fn(),
  createSession: vi.fn(),
}));

vi.mock("@/lib/db", () => db);
vi.mock("@/lib/cache", () => ({ cacheSet: vi.fn(), cacheGet: vi.fn(), cacheDelete: vi.fn() }));

import { beginWorkout, bootstrapWorkout } from "@/lib/workout-init";
import { cacheSet } from "@/lib/cache";

const prefs = { unit: "kg", alternateSelections: {}, exerciseNotes: {} };
const alt = (id: string, name: string) => ({ id, name, alternates: [] });
const exercises = [
  { id: "bench", name: "Bench", alternates: [alt("db-bench", "DB Bench"), alt("machine-press", "Machine Press")] },
  { id: "row", name: "Row", alternates: [alt("cable-row", "Cable Row"), alt("bb-row", "Barbell Row")] },
] as unknown as Exercise[];
const workoutDay = { dayType: "upper-a", exercises };
const session = (over: Partial<WorkoutSession> = {}): WorkoutSession => ({
  id: "sess-1", userId: "user-1", programId: null, week: 2, dayIndex: 1, dayType: "upper-a",
  startedAt: "", completedAt: null, currentExerciseIndex: 1, currentSetIndex: 2, exerciseSwaps: {}, ...over,
});
const sets = [{ id: "s1" }] as unknown as SetLog[];
const prev = { bench: [{ id: "p1" }] } as unknown as Record<string, SetLog[]>;
const best = { bench: { id: "b1" }, row: { id: "b2" } } as unknown as Record<string, SetLog>;

beforeEach(() => {
  vi.clearAllMocks();
  db.getPreferences.mockResolvedValue(prefs);
  db.getLastSetsForExercises.mockResolvedValue(prev);
  db.getBestSetsForExercises.mockResolvedValue(best);
  db.createSession.mockResolvedValue(session({ id: "new", currentExerciseIndex: 0, currentSetIndex: 0 }));
});

describe("bootstrapWorkout", () => {
  it("loads the given user's preferences and unfinished session", async () => {
    db.getIncompleteSessionWithSets.mockResolvedValue(null);
    await bootstrapWorkout({ userId: "user-1", week: 2, dayIndex: 1, workoutDay });
    expect(db.getPreferences).toHaveBeenCalledWith("user-1");
    expect(db.getIncompleteSessionWithSets).toHaveBeenCalledWith("user-1");
  });

  it("resumes a matching session using its embedded sets, with no follow-up queries", async () => {
    db.getIncompleteSessionWithSets.mockResolvedValue({ session: session(), sets });
    const boot = await bootstrapWorkout({ userId: "user-1", week: 2, dayIndex: 1, workoutDay });

    expect(db.createSession).not.toHaveBeenCalled();
    expect(boot).toMatchObject({ sessionSets: sets, exerciseIndex: 1, setIndex: 2, phase: "sets" });
  });

  it("prefetches last-session sets and all-time bests for every exercise of the day and each alternate", async () => {
    db.getIncompleteSessionWithSets.mockResolvedValue(null);
    const boot = await bootstrapWorkout({ userId: "user-1", week: 2, dayIndex: 1, workoutDay });

    // A slot can be swapped before its first set, so its alternates' history is needed too: one call, no duplicates.
    const everyOption = ["bench", "db-bench", "machine-press", "row", "cable-row", "bb-row"];
    expect(db.getLastSetsForExercises).toHaveBeenCalledWith(everyOption);
    expect(db.getBestSetsForExercises).toHaveBeenCalledWith(everyOption);
    expect(boot?.recordsByExercise).toEqual({
      bench: { lastSets: prev.bench, bestSet: best.bench },
      row: { lastSets: [], bestSet: best.row },
    });
  });

  it("resumes in the warm-up when the session was left at the warm-up position", async () => {
    db.getIncompleteSessionWithSets.mockResolvedValue({ session: session({ currentExerciseIndex: 0, currentSetIndex: -1 }), sets: [] });
    const boot = await bootstrapWorkout({ userId: "user-1", week: 2, dayIndex: 1, workoutDay });

    expect(boot).toMatchObject({ exerciseIndex: 0, setIndex: -1, phase: "warmup" });
  });

  it("only shows a new day: no session, nothing in progress, until it's begun", async () => {
    db.getIncompleteSessionWithSets.mockResolvedValue(null);
    const boot = await bootstrapWorkout({ userId: "user-1", week: 2, dayIndex: 1, workoutDay });

    expect(db.createSession).not.toHaveBeenCalled();
    expect(cacheSet).not.toHaveBeenCalledWith("active_workout", expect.anything());
    expect(boot).toMatchObject({ session: null, sessionSets: [], exerciseIndex: 0, setIndex: 0, phase: "overview" });
  });

  it("doesn't resume an unfinished workout for a different day", async () => {
    db.getIncompleteSessionWithSets.mockResolvedValue({ session: session({ dayIndex: 4 }), sets });
    const boot = await bootstrapWorkout({ userId: "user-1", week: 2, dayIndex: 1, workoutDay });

    expect(db.createSession).not.toHaveBeenCalled();
    expect(boot).toMatchObject({ session: null, sessionSets: [], phase: "overview" });
  });

  it("shows the exercise swapped in for this workout as the one in progress", async () => {
    db.getIncompleteSessionWithSets.mockResolvedValue({ session: session({ exerciseSwaps: { row: "cable-row" } }), sets });
    await bootstrapWorkout({ userId: "user-1", week: 2, dayIndex: 1, workoutDay });

    expect(cacheSet).toHaveBeenCalledWith("active_workout", expect.objectContaining({ exerciseName: "Cable Row", exerciseIndex: 1 }));
  });

  it("uses saved defaults for the in-progress exercise, and a swap over a default", async () => {
    db.getPreferences.mockResolvedValue({ ...prefs, alternateSelections: { row: "bb-row" } });
    db.getIncompleteSessionWithSets.mockResolvedValue({ session: session(), sets });
    await bootstrapWorkout({ userId: "user-1", week: 2, dayIndex: 1, workoutDay });
    expect(cacheSet).toHaveBeenLastCalledWith("active_workout", expect.objectContaining({ exerciseName: "Barbell Row" }));

    db.getIncompleteSessionWithSets.mockResolvedValue({ session: session({ exerciseSwaps: { row: "cable-row" } }), sets });
    await bootstrapWorkout({ userId: "user-1", week: 2, dayIndex: 1, workoutDay });
    expect(cacheSet).toHaveBeenLastCalledWith("active_workout", expect.objectContaining({ exerciseName: "Cable Row" }));
  });
});


describe("beginWorkout", () => {
  it("creates the session when the workout is begun, and marks it in progress", async () => {
    const started = await beginWorkout({ userId: "user-1", week: 2, dayIndex: 1, programId: "prog-1", dayType: "upper-a", exercises });

    expect(db.createSession).toHaveBeenCalledWith("user-1", 2, 1, "upper-a", "prog-1");
    expect(started.id).toBe("new");
    expect(cacheSet).toHaveBeenCalledWith("active_workout", expect.objectContaining({ exerciseName: "Bench", exerciseIndex: 0 }));
  });

  it("marks nothing in progress when the session can't be created", async () => {
    db.createSession.mockRejectedValue(new Error("offline"));
    await expect(beginWorkout({ userId: "user-1", week: 2, dayIndex: 1, programId: null, dayType: "upper-a", exercises })).rejects.toThrow("offline");
    expect(cacheSet).not.toHaveBeenCalled();
  });
});
