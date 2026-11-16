import { describe, it, expect } from "vitest";
import {
  resolveExercises, totalSetsForExercise, loggedWorkingSets, isExerciseComplete, planAfterSet,
  bestSetToShow, recordFor, saveWorkoutInProgress, clearWorkoutInProgress,
} from "@/lib/workout-helpers";
import { readActiveWorkout } from "@/lib/active-workout";
import type { Exercise, SetLog, WorkoutSession } from "@/lib/types";

const alt = (id: string, name: string) => ({ id, name, alternates: [], earlySetCount: 2, lastSetCount: 1 }) as unknown as Exercise;
const ex = {
  id: "bench", name: "Bench", alternates: [alt("db-press", "Dumbbell Press"), alt("push-up", "Push-up")],
  earlySetCount: 2, lastSetCount: 1,
} as unknown as Exercise;

const set = (exerciseId: string, setIndex: number) => ({ exerciseId, setIndex }) as unknown as SetLog;

describe("resolveExercises", () => {
  it("keeps the slot's own exercise when nothing is chosen", () => {
    expect(resolveExercises([ex], {})[0].name).toBe("Bench");
  });
  it("swaps in a chosen alternate, as its own exercise with its own id", () => {
    const [resolved] = resolveExercises([ex], { bench: "push-up" });
    expect(resolved).toMatchObject({ id: "push-up", name: "Push-up" });
  });
  it("resolves each slot independently", () => {
    const row = { id: "row", name: "Row", alternates: [alt("cable-row", "Cable Row")] } as unknown as Exercise;
    expect(resolveExercises([ex, row], { row: "cable-row" }).map((e) => e.id)).toEqual(["bench", "cable-row"]);
  });
});

describe("set counting", () => {
  it("totals early + last sets", () => {
    expect(totalSetsForExercise(ex)).toBe(3);
  });
  it("ignores warmup sets and other exercises", () => {
    const sets = [set("bench", -1), set("bench", 0), set("squat", 0)];
    expect(loggedWorkingSets(sets, "bench")).toHaveLength(1);
  });
  it("is complete only when all working sets are logged", () => {
    expect(isExerciseComplete(ex, [set("bench", 0), set("bench", 1)])).toBe(false);
    expect(isExerciseComplete(ex, [set("bench", 0), set("bench", 1), set("bench", 2)])).toBe(true);
  });
});

describe("planAfterSet", () => {
  // Two exercises with 2 working sets each.
  const a = { id: "a", earlySetCount: 1, lastSetCount: 1 } as unknown as Exercise;
  const b = { id: "b", earlySetCount: 1, lastSetCount: 1 } as unknown as Exercise;
  const c = { id: "c", earlySetCount: 1, lastSetCount: 1 } as unknown as Exercise;

  it("moves to the next set when the exercise has sets left", () => {
    expect(planAfterSet([a, b], [set("a", 0)], 0, 0)).toEqual({ kind: "nextSet", exerciseIndex: 0, setIndex: 1 });
  });

  it("moves to the next unfinished exercise's warm-up after the last set", () => {
    const sets = [set("a", 0), set("a", 1)];
    expect(planAfterSet([a, b], sets, 0, 1)).toEqual({ kind: "nextExercise", exerciseIndex: 1, setIndex: -1 });
  });

  it("skips exercises that are already complete", () => {
    const sets = [set("b", 0), set("b", 1), set("a", 0), set("a", 1)];
    expect(planAfterSet([a, b, c], sets, 0, 1)).toEqual({ kind: "nextExercise", exerciseIndex: 2, setIndex: -1 });
  });

  it("goes back to an earlier unfinished exercise", () => {
    const sets = [set("b", 0), set("b", 1)];
    expect(planAfterSet([a, b], sets, 1, 1)).toEqual({ kind: "nextExercise", exerciseIndex: 0, setIndex: -1 });
  });

  it("completes the workout when every exercise is done", () => {
    const sets = [set("a", 0), set("a", 1), set("b", 0), set("b", 1)];
    expect(planAfterSet([a, b], sets, 1, 1)).toEqual({ kind: "complete", exerciseIndex: 1, setIndex: 1 });
  });

  it("falls back to the following exercise when only the current one is short of sets", () => {
    // Last set logged for "a" but an earlier set is missing; "b" is done.
    const sets = [set("a", 1), set("b", 0), set("b", 1)];
    expect(planAfterSet([a, b], sets, 0, 1)).toEqual({ kind: "nextExercise", exerciseIndex: 1, setIndex: -1 });
  });
});

describe("bestSetToShow", () => {
  const lifted = (weight: number) => ({ weight, reps: 8 }) as SetLog;

  it("shows the best when it's heavier than everything last session", () => {
    const best = lifted(110);
    expect(bestSetToShow({ lastSets: [lifted(95), lifted(100)], bestSet: best })).toBe(best);
  });

  it("hides the best when last session matched it, since Last time already shows it", () => {
    expect(bestSetToShow({ lastSets: [lifted(95), lifted(110)], bestSet: lifted(110) })).toBeUndefined();
  });

  it("hides it when there is no best yet", () => {
    expect(bestSetToShow({ lastSets: [] })).toBeUndefined();
  });

  it("shows the best when there are no last-session sets to compare with", () => {
    const best = lifted(60);
    expect(bestSetToShow({ lastSets: [], bestSet: best })).toBe(best);
  });
});

describe("recordFor", () => {
  it("returns the exercise's record, or the same empty record when it has none", () => {
    const record = { lastSets: [set("bench", 0)] };
    expect(recordFor({ bench: record }, ex)).toBe(record);
    expect(recordFor({}, ex)).toEqual({ lastSets: [] });
    expect(recordFor({}, ex)).toBe(recordFor({}, undefined));
  });
});

describe("saveWorkoutInProgress", () => {
  const session = {
    id: "sess-1", week: 3, dayIndex: 2, dayType: "lower-a", startedAt: "2026-11-15T10:00:00Z",
  } as WorkoutSession;

  it("records the session's position and start time for the Workout tab", () => {
    saveWorkoutInProgress(0, [ex], session);
    expect(readActiveWorkout()).toEqual({
      week: 3, dayIndex: 2, dayType: "lower-a", exerciseName: "Bench",
      exerciseIndex: 0, exerciseTotal: 1, startedAt: "2026-11-15T10:00:00Z",
    });

    clearWorkoutInProgress();
    expect(readActiveWorkout()).toBeNull();
  });
});
