import { describe, it, expect } from "vitest";
import {
  resolveExercises, totalSetsForExercise, loggedWorkingSets, isExerciseComplete,
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
