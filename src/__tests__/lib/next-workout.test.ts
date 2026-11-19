import { describe, it, expect, vi, beforeEach } from "vitest";
import type { WeekSchedule } from "@/lib/types";

const db = vi.hoisted(() => ({ getWorkoutOverview: vi.fn() }));
vi.mock("@/lib/db", () => db);

import { findNextWorkout } from "@/lib/next-workout";

const day = { dayType: "push", exercises: [] };
// Week 2 has a gap: only two days.
const program = [{ week: 1, days: [day, day, day] }, { week: 2, days: [day, day] }] as unknown as WeekSchedule[];
const done = (...positions: [number, number][]) => positions.map(([week, dayIndex], i) => ({ sessionId: `s${i}`, week, dayIndex }));

const overview = (unfinished: { week: number; dayIndex: number } | null, completed: ReturnType<typeof done>) =>
  db.getWorkoutOverview.mockResolvedValue({ unfinished, completed });

beforeEach(() => {
  vi.clearAllMocks();
  overview(null, []);
});

describe("findNextWorkout", () => {
  it("resumes the unfinished workout first", async () => {
    overview({ week: 1, dayIndex: 1 }, done([1, 0]));
    expect(await findNextWorkout(program)).toEqual({ week: 1, dayIndex: 1 });
  });

  it("starts at the beginning when nothing has been done", async () => {
    expect(await findNextWorkout(program)).toEqual({ week: 1, dayIndex: 0 });
  });

  it("follows the loaded schedule into the next week", async () => {
    overview(null, done([1, 2], [1, 1], [1, 0]));
    expect(await findNextWorkout(program)).toEqual({ week: 2, dayIndex: 0 });
  });

  it("goes back for a day skipped earlier", async () => {
    overview(null, done([2, 0], [1, 2], [1, 0]));
    expect(await findNextWorkout(program)).toEqual({ week: 1, dayIndex: 1 });
  });

  it("wraps to the start once the program is finished", async () => {
    overview(null, done([2, 1], [2, 0], [1, 2], [1, 1], [1, 0]));
    expect(await findNextWorkout(program)).toEqual({ week: 1, dayIndex: 0 });
  });

  it("returns null while the schedule hasn't loaded", async () => {
    expect(await findNextWorkout([])).toBeNull();
  });

  it("asks the database once, not once per table", async () => {
    await findNextWorkout(program);
    expect(db.getWorkoutOverview).toHaveBeenCalledTimes(1);
  });

  it("lets a failed query throw for the caller to handle", async () => {
    db.getWorkoutOverview.mockRejectedValue(new Error("offline"));
    await expect(findNextWorkout(program)).rejects.toThrow("offline");
  });
});
