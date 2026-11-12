import { describe, it, expect } from "vitest";
import {
  estimateOneRm, getSessionNumber, getTotalSessions, nextWorkout, orderedPositions,
} from "@/lib/program-data";
import type { WeekSchedule, WorkoutDay } from "@/lib/types";

describe("estimateOneRm", () => {
  it("returns weight unchanged when reps is 0", () => {
    expect(estimateOneRm(100, 0)).toBe(100);
  });

  it("calculates correctly for 100kg at 10 reps", () => {
    // Math.round(100 * (1 + 10/30)) = Math.round(100 * 1.333...) = Math.round(133.33...) = 133
    expect(estimateOneRm(100, 10)).toBe(133);
  });

  it("calculates correctly for 80kg at 15 reps", () => {
    // Math.round(80 * (1 + 15/30)) = Math.round(80 * 1.5) = 120
    expect(estimateOneRm(80, 15)).toBe(120);
  });

  it("calculates correctly for 60kg at 5 reps", () => {
    // Math.round(60 * (1 + 5/30)) = Math.round(60 * 1.1666...) = Math.round(70.0) = 70
    expect(estimateOneRm(60, 5)).toBe(70);
  });

  it("handles single rep (1RM itself)", () => {
    // Math.round(100 * (1 + 1/30)) = Math.round(103.33) = 103
    expect(estimateOneRm(100, 1)).toBe(103);
  });
});

// ─── Schedule navigation ──────────────────────────────────────────────────────

const day = {} as WorkoutDay;
/** A program of `weeks` weeks with `daysPerWeek` days each. */
const uniform = (weeks: number, daysPerWeek: number): WeekSchedule[] =>
  Array.from({ length: weeks }, (_, w) => ({ week: w + 1, days: Array(daysPerWeek).fill(day) }));

const nippard = uniform(12, 5);

describe("on the standard 12 × 5 program (previous hard-coded behaviour)", () => {
  it("numbers sessions 1…60", () => {
    expect(getSessionNumber({ week: 1, dayIndex: 0 }, nippard)).toBe(1);
    expect(getSessionNumber({ week: 2, dayIndex: 0 }, nippard)).toBe(6);
    expect(getSessionNumber({ week: 12, dayIndex: 4 }, nippard)).toBe(60);
    expect(getTotalSessions(nippard)).toBe(60);
  });

  it("advances day by day, week by week, and wraps after the last session", () => {
    expect(nextWorkout(null, nippard)).toEqual({ week: 1, dayIndex: 0 });
    expect(nextWorkout({ week: 3, dayIndex: 2 }, nippard)).toEqual({ week: 3, dayIndex: 3 });
    expect(nextWorkout({ week: 5, dayIndex: 4 }, nippard)).toEqual({ week: 6, dayIndex: 0 });
    expect(nextWorkout({ week: 12, dayIndex: 4 }, nippard)).toEqual({ week: 1, dayIndex: 0 });
  });
});

describe("on programs edited in the builder", () => {
  it("continues into week 13 instead of wrapping when the program has 13 weeks", () => {
    expect(nextWorkout({ week: 12, dayIndex: 4 }, uniform(13, 5))).toEqual({ week: 13, dayIndex: 0 });
    expect(getTotalSessions(uniform(13, 5))).toBe(65);
  });

  it("moves to the next week after the last day of a short week", () => {
    expect(nextWorkout({ week: 1, dayIndex: 3 }, uniform(2, 4))).toEqual({ week: 2, dayIndex: 0 });
  });

  it("supports a sixth day in a week", () => {
    expect(nextWorkout({ week: 1, dayIndex: 4 }, uniform(2, 6))).toEqual({ week: 1, dayIndex: 5 });
  });

  it("skips gaps left by deleted days", () => {
    const days: WorkoutDay[] = [];
    days[0] = day;
    days[2] = day; // day 1 deleted
    const schedule = [{ week: 1, days }];
    expect(orderedPositions(schedule)).toEqual([{ week: 1, dayIndex: 0 }, { week: 1, dayIndex: 2 }]);
    expect(nextWorkout({ week: 1, dayIndex: 0 }, schedule)).toEqual({ week: 1, dayIndex: 2 });
    expect(getSessionNumber({ week: 1, dayIndex: 2 }, schedule)).toBe(2);
  });

  it("orders weeks numerically even if the schedule arrives unsorted", () => {
    const schedule = [{ week: 2, days: [day] }, { week: 1, days: [day] }];
    expect(nextWorkout({ week: 1, dayIndex: 0 }, schedule)).toEqual({ week: 2, dayIndex: 0 });
  });
});

describe("before the program has loaded", () => {
  it("has no next workout and no sessions", () => {
    expect(nextWorkout({ week: 3, dayIndex: 1 }, [])).toBeNull();
    expect(getTotalSessions([])).toBe(0);
    expect(getSessionNumber({ week: 1, dayIndex: 0 }, [])).toBe(0);
  });
});
