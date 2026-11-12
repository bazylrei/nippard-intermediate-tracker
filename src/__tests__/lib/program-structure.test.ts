import { describe, it, expect } from "vitest";
import { lastWeek, nextDayIndex } from "@/lib/program-structure";

describe("nextDayIndex", () => {
  it("appends after the highest index in the week", () => {
    expect(nextDayIndex([{ week: 1, dayIndex: 0 }, { week: 1, dayIndex: 1 }], 1)).toBe(2);
  });

  it("does not collide with an existing day after a deletion (regression)", () => {
    // Day 1 was deleted: two days remain, but index 2 is taken.
    const days = [{ week: 1, dayIndex: 0 }, { week: 1, dayIndex: 2 }];
    expect(nextDayIndex(days, 1)).toBe(3);
  });

  it("starts at 0 for an empty week and ignores other weeks", () => {
    expect(nextDayIndex([{ week: 2, dayIndex: 4 }], 1)).toBe(0);
  });
});

describe("lastWeek", () => {
  it("uses the declared total when it is the highest", () => {
    expect(lastWeek({ totalWeeks: 4, days: [{ week: 2 }] })).toBe(4);
  });
  it("uses a later week that has days", () => {
    expect(lastWeek({ totalWeeks: 2, days: [{ week: 5 }] })).toBe(5);
  });
  it("is 0 for an empty program", () => {
    expect(lastWeek({ totalWeeks: 0, days: [] })).toBe(0);
  });
});
