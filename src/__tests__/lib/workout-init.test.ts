import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Exercise, SetLog, WorkoutSession } from "@/lib/types";

const db = vi.hoisted(() => ({
  getPreferences: vi.fn(),
  getIncompleteSessionWithSets: vi.fn(),
  getLastSetsForExercises: vi.fn(),
  getBestSetsForExercises: vi.fn(),
  createSession: vi.fn(),
}));
const auth = vi.hoisted(() => ({ getSignedInUser: vi.fn() }));

vi.mock("@/lib/db", () => db);
vi.mock("@/lib/auth", () => auth);
vi.mock("@/lib/cache", () => ({ cacheSet: vi.fn(), cacheGet: vi.fn(), cacheDelete: vi.fn() }));

import { bootstrapWorkout } from "@/lib/workout-init";

const prefs = { unit: "kg", alternateSelections: {}, exerciseNotes: {} };
const exercises = [{ id: "bench", name: "Bench", alternates: ["", ""] }, { id: "row", name: "Row", alternates: ["", ""] }] as unknown as Exercise[];
const workoutDay = { dayType: "upper-a", exercises };
const session = (over: Partial<WorkoutSession> = {}): WorkoutSession => ({
  id: "sess-1", userId: "user-1", programId: null, week: 2, dayIndex: 1, dayType: "upper-a",
  startedAt: "", completedAt: null, currentExerciseIndex: 1, currentSetIndex: 2, ...over,
});
const sets = [{ id: "s1" }] as unknown as SetLog[];
const prev = { bench: [{ id: "p1" }] } as unknown as Record<string, SetLog[]>;
const best = { bench: { id: "b1" }, row: { id: "b2" } } as unknown as Record<string, SetLog>;

beforeEach(() => {
  vi.clearAllMocks();
  auth.getSignedInUser.mockResolvedValue({ id: "user-1" });
  db.getPreferences.mockResolvedValue(prefs);
  db.getLastSetsForExercises.mockResolvedValue(prev);
  db.getBestSetsForExercises.mockResolvedValue(best);
  db.createSession.mockResolvedValue(session({ id: "new", currentExerciseIndex: 0, currentSetIndex: 0 }));
});

describe("bootstrapWorkout", () => {
  it("returns null when nobody is signed in", async () => {
    auth.getSignedInUser.mockResolvedValue(null);
    expect(await bootstrapWorkout({ week: 2, dayIndex: 1, programId: null, workoutDay })).toBeNull();
    expect(db.getPreferences).not.toHaveBeenCalled();
  });

  it("resumes a matching session using its embedded sets, with no follow-up queries", async () => {
    db.getIncompleteSessionWithSets.mockResolvedValue({ session: session(), sets });
    const boot = await bootstrapWorkout({ week: 2, dayIndex: 1, programId: null, workoutDay });

    expect(db.createSession).not.toHaveBeenCalled();
    expect(boot).toMatchObject({ sessionSets: sets, exerciseIndex: 1, setIndex: 2, phase: "sets" });
  });

  it("prefetches last-session sets and all-time bests for every exercise of the day", async () => {
    db.getIncompleteSessionWithSets.mockResolvedValue(null);
    const boot = await bootstrapWorkout({ week: 2, dayIndex: 1, programId: null, workoutDay });

    expect(db.getLastSetsForExercises).toHaveBeenCalledWith(["bench", "row"]);
    expect(db.getBestSetsForExercises).toHaveBeenCalledWith(["bench", "row"]);
    expect(boot?.recordsByExercise).toEqual({
      bench: { lastSets: prev.bench, bestSet: best.bench },
      row: { lastSets: [], bestSet: best.row },
    });
  });

  it("resumes in the warm-up when the session was left at the warm-up position", async () => {
    db.getIncompleteSessionWithSets.mockResolvedValue({ session: session({ currentExerciseIndex: 0, currentSetIndex: -1 }), sets: [] });
    const boot = await bootstrapWorkout({ week: 2, dayIndex: 1, programId: null, workoutDay });

    expect(boot).toMatchObject({ exerciseIndex: 0, setIndex: -1, phase: "warmup" });
  });

  it("starts a new session when the unfinished one is for a different day", async () => {
    db.getIncompleteSessionWithSets.mockResolvedValue({ session: session({ dayIndex: 4 }), sets });
    const boot = await bootstrapWorkout({ week: 2, dayIndex: 1, programId: "prog-1", workoutDay });

    expect(db.createSession).toHaveBeenCalledWith("user-1", 2, 1, "upper-a", "prog-1");
    expect(boot).toMatchObject({ sessionSets: [], exerciseIndex: 0, setIndex: 0, phase: "overview" });
  });
});
