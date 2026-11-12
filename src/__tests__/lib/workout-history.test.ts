import { describe, it, expect } from "vitest";
import { groupWorkingSets, latestSessionBySlot, workoutDetailHref } from "@/lib/workout-history";
import type { SetLog } from "@/lib/types";

const set = (id: string, exerciseId: string, setIndex: number) => ({ id, exerciseId, setIndex }) as unknown as SetLog;

describe("workoutDetailHref", () => {
  it("points at the history detail route", () => {
    expect(workoutDetailHref("abc")).toBe("/history/abc");
  });
});

describe("groupWorkingSets", () => {
  it("drops warm-ups and groups by exercise in first-logged order", () => {
    const groups = groupWorkingSets([
      set("w1", "bench", -1),
      set("a", "bench", 0),
      set("b", "row", 0),
      set("c", "bench", 1),
    ]);
    expect(groups.map((g) => [g.exerciseId, g.sets.map((s) => s.id)])).toEqual([
      ["bench", ["a", "c"]],
      ["row", ["b"]],
    ]);
  });

  it("omits an exercise that only has warm-ups", () => {
    expect(groupWorkingSets([set("w", "squat", -2)])).toEqual([]);
  });
});

describe("latestSessionBySlot", () => {
  it("resolves each slot to the newest session (input is newest-first)", () => {
    const lookup = latestSessionBySlot([
      { sessionId: "new", week: 1, dayIndex: 0 },
      { sessionId: "other", week: 1, dayIndex: 1 },
      { sessionId: "old", week: 1, dayIndex: 0 },
    ]);
    expect(lookup({ week: 1, dayIndex: 0 })).toBe("new");
    expect(lookup({ week: 1, dayIndex: 1 })).toBe("other");
    expect(lookup({ week: 2, dayIndex: 0 })).toBeUndefined();
  });
});
