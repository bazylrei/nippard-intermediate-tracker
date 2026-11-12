import { describe, it, expect } from "vitest";
import {
  resolveExercises, totalSetsForExercise, loggedWorkingSets, isExerciseComplete, planAfterSet,
} from "@/lib/workout-helpers";
import type { Exercise, SetLog } from "@/lib/types";

const ex = {
  id: "bench", name: "Bench", alternates: ["Dumbbell Press", "Push-up"],
  earlySetCount: 2, lastSetCount: 1,
} as unknown as Exercise;

const set = (exerciseId: string, setIndex: number) => ({ exerciseId, setIndex }) as unknown as SetLog;

describe("resolveExercises", () => {
  it("keeps the original name for index 0 or unset", () => {
    expect(resolveExercises([ex], {})[0].name).toBe("Bench");
  });
  it("swaps in the first and second alternates", () => {
    expect(resolveExercises([ex], { bench: 1 })[0].name).toBe("Dumbbell Press");
    expect(resolveExercises([ex], { bench: 2 })[0].name).toBe("Push-up");
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
