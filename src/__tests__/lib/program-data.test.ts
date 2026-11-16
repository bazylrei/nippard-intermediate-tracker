import { describe, it, expect } from "vitest";
import {
  getSessionNumber, getTotalSessions, orderedPositions, programRun,
} from "@/lib/program-data";
import type { WeekSchedule, WorkoutDay, WorkoutPosition } from "@/lib/types";

// ─── Schedule navigation ──────────────────────────────────────────────────────

const day = {} as WorkoutDay;
/** A program of `weeks` weeks with `daysPerWeek` days each. */
const uniform = (weeks: number, daysPerWeek: number): WeekSchedule[] =>
  Array.from({ length: weeks }, (_, w) => ({ week: w + 1, days: Array(daysPerWeek).fill(day) }));

const nippard = uniform(12, 5);

/** Every scheduled day up to and including `last`, as if done in order. */
const doneThrough = (last: WorkoutPosition | null, schedule: WeekSchedule[]): WorkoutPosition[] => {
  if (!last) return [];
  const all = orderedPositions(schedule);
  return all.slice(0, all.findIndex((p) => p.week === last.week && p.dayIndex === last.dayIndex) + 1);
};
/** Next workout when the program has been followed in order up to `last`. */
const nextAfter = (last: WorkoutPosition | null, schedule: WeekSchedule[]) => programRun(doneThrough(last, schedule), schedule).next;

describe("on the standard 12 × 5 program (previous hard-coded behaviour)", () => {
  it("numbers sessions 1…60", () => {
    expect(getSessionNumber({ week: 1, dayIndex: 0 }, nippard)).toBe(1);
    expect(getSessionNumber({ week: 2, dayIndex: 0 }, nippard)).toBe(6);
    expect(getSessionNumber({ week: 12, dayIndex: 4 }, nippard)).toBe(60);
    expect(getTotalSessions(nippard)).toBe(60);
  });

  it("advances day by day, week by week, and wraps after the last session", () => {
    expect(nextAfter(null, nippard)).toEqual({ week: 1, dayIndex: 0 });
    expect(nextAfter({ week: 3, dayIndex: 2 }, nippard)).toEqual({ week: 3, dayIndex: 3 });
    expect(nextAfter({ week: 5, dayIndex: 4 }, nippard)).toEqual({ week: 6, dayIndex: 0 });
    expect(nextAfter({ week: 12, dayIndex: 4 }, nippard)).toEqual({ week: 1, dayIndex: 0 });
  });
});

describe("on programs edited in the builder", () => {
  it("continues into week 13 instead of wrapping when the program has 13 weeks", () => {
    expect(nextAfter({ week: 12, dayIndex: 4 }, uniform(13, 5))).toEqual({ week: 13, dayIndex: 0 });
    expect(getTotalSessions(uniform(13, 5))).toBe(65);
  });

  it("moves to the next week after the last day of a short week", () => {
    expect(nextAfter({ week: 1, dayIndex: 3 }, uniform(2, 4))).toEqual({ week: 2, dayIndex: 0 });
  });

  it("supports a sixth day in a week", () => {
    expect(nextAfter({ week: 1, dayIndex: 4 }, uniform(2, 6))).toEqual({ week: 1, dayIndex: 5 });
  });

  it("skips gaps left by deleted days", () => {
    const days: WorkoutDay[] = [];
    days[0] = day;
    days[2] = day; // day 1 deleted
    const schedule = [{ week: 1, days }];
    expect(orderedPositions(schedule)).toEqual([{ week: 1, dayIndex: 0 }, { week: 1, dayIndex: 2 }]);
    expect(nextAfter({ week: 1, dayIndex: 0 }, schedule)).toEqual({ week: 1, dayIndex: 2 });
    expect(getSessionNumber({ week: 1, dayIndex: 2 }, schedule)).toBe(2);
  });

  it("orders weeks numerically even if the schedule arrives unsorted", () => {
    const schedule = [{ week: 2, days: [day] }, { week: 1, days: [day] }];
    expect(programRun([{ week: 1, dayIndex: 0 }], schedule).next).toEqual({ week: 2, dayIndex: 0 });
  });
});

describe("before the program has loaded", () => {
  it("has no next workout and no sessions", () => {
    expect(programRun([{ week: 3, dayIndex: 1 }], []).next).toBeNull();
    expect(programRun([{ week: 3, dayIndex: 1 }], []).doneCount).toBe(0);
    expect(getTotalSessions([])).toBe(0);
    expect(getSessionNumber({ week: 1, dayIndex: 0 }, [])).toBe(0);
  });
});

// ─── Choosing which workout to do ─────────────────────────────────────────────

describe("programRun — days done out of order", () => {
  const program = uniform(2, 3);
  const at = (week: number, dayIndex: number): WorkoutPosition => ({ week, dayIndex });

  it("marks only the days actually done", () => {
    const run = programRun([at(1, 2), at(1, 0)], program);
    expect(run.isDone(at(1, 0))).toBe(true);
    expect(run.isDone(at(1, 1))).toBe(false); // skipped, not ticked
    expect(run.isDone(at(1, 2))).toBe(true);
    expect(run.doneCount).toBe(2);
  });

  it("suggests the earliest day not done, so a skipped day isn't lost", () => {
    expect(programRun([at(1, 0), at(1, 2)], program).next).toEqual(at(1, 1));
    expect(programRun([at(2, 1)], program).next).toEqual(at(1, 0));
  });

  it("starts a fresh run once every day is done, keeping a day already redone", () => {
    const all = orderedPositions(program);
    const fresh = programRun(all, program);
    expect(fresh.doneCount).toBe(0);
    expect(fresh.next).toEqual(at(1, 0));

    const secondRun = programRun([...all, at(1, 1)], program);
    expect(secondRun.isDone(at(1, 1))).toBe(true);
    expect(secondRun.isDone(at(1, 0))).toBe(false);
    expect(secondRun.next).toEqual(at(1, 0));
  });

  it("counts a day done twice in one run only once", () => {
    const run = programRun([at(1, 0), at(1, 0)], program);
    expect(run.doneCount).toBe(1);
    expect(run.next).toEqual(at(1, 1));
  });

  it("ignores sessions for days no longer in the program", () => {
    const run = programRun([at(9, 0), at(1, 7)], program);
    expect(run.doneCount).toBe(0);
    expect(run.next).toEqual(at(1, 0));
  });
});
