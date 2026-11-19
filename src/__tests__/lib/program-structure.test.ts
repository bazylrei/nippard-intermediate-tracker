import { describe, it, expect } from "vitest";
import { lastWeek, nextDayIndex, totalWeeksAfterDeletingWeek } from "@/lib/program-structure";

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

describe("totalWeeksAfterDeletingWeek", () => {
  const days = (...weeks: number[]) => weeks.map((week) => ({ week }));

  it("shrinks the program by one when its last week is deleted", () => {
    expect(totalWeeksAfterDeletingWeek({ totalWeeks: 3, days: days(1, 2, 3) }, 3)).toBe(2);
  });

  it("keeps the count when a middle week is deleted", () => {
    expect(totalWeeksAfterDeletingWeek({ totalWeeks: 3, days: days(1, 2, 3) }, 2)).toBe(3);
  });

  it("never drops below the last week that still has days", () => {
    // Declared 5 weeks, but week 4 is still in use: deleting week 5 leaves 4.
    expect(totalWeeksAfterDeletingWeek({ totalWeeks: 5, days: days(1, 4, 5) }, 5)).toBe(4);
  });

  it("goes down to zero when the only week is deleted", () => {
    expect(totalWeeksAfterDeletingWeek({ totalWeeks: 1, days: days(1) }, 1)).toBe(0);
  });
});
