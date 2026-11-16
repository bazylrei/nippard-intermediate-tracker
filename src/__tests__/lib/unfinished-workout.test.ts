import { describe, it, expect, vi, beforeEach } from "vitest";

const db = vi.hoisted(() => ({ completeSession: vi.fn(), deleteWorkoutSession: vi.fn() }));
vi.mock("@/lib/db", () => db);
const helpers = vi.hoisted(() => ({ clearWorkoutInProgress: vi.fn() }));
vi.mock("@/lib/workout-helpers", () => helpers);

import { settleUnfinishedWorkout } from "@/lib/unfinished-workout";

beforeEach(() => {
  vi.clearAllMocks();
  db.completeSession.mockResolvedValue(undefined);
  db.deleteWorkoutSession.mockResolvedValue(undefined);
});

describe("settleUnfinishedWorkout", () => {
  it("saves it as finished, with what was logged", async () => {
    await settleUnfinishedWorkout("s1", "save");
    expect(db.completeSession).toHaveBeenCalledWith("s1");
    expect(db.deleteWorkoutSession).not.toHaveBeenCalled();
    expect(helpers.clearWorkoutInProgress).toHaveBeenCalled();
  });

  it("discards it", async () => {
    await settleUnfinishedWorkout("s1", "discard");
    expect(db.deleteWorkoutSession).toHaveBeenCalledWith("s1");
    expect(db.completeSession).not.toHaveBeenCalled();
    expect(helpers.clearWorkoutInProgress).toHaveBeenCalled();
  });

  it("keeps the workout in progress when the write fails", async () => {
    db.completeSession.mockRejectedValue(new Error("offline"));
    await expect(settleUnfinishedWorkout("s1", "save")).rejects.toThrow("offline");
    expect(helpers.clearWorkoutInProgress).not.toHaveBeenCalled();
  });
});
