import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import type { Exercise } from "@/lib/types";

const db = vi.hoisted(() => ({ getExerciseHistory: vi.fn(), getExerciseWorkingSets: vi.fn(), getBodyWeightLogs: vi.fn(), logBodyWeight: vi.fn() }));
vi.mock("@/lib/db", () => db);

import { usePostHistory } from "@/hooks/useWorkoutHistory";
import { localYmd } from "@/lib/dates";

const exercises = [{ id: "bench" }, { id: "row" }, { id: "pull-up", isBodyweight: true }] as Exercise[];
const set = (sessionId: string, exerciseId: string, weightKg: number, reps: number, loggedAt: string) => ({ sessionId, exerciseId, weightKg, reps, loggedAt });

beforeEach(() => {
  vi.clearAllMocks();
  db.getExerciseHistory.mockImplementation(async (_u: string, id: string) => [{ date: "2026-11-15", weight: id === "bench" ? 100 : 60, reps: 8 }]);
  db.getExerciseWorkingSets.mockResolvedValue([]);
  db.getBodyWeightLogs.mockResolvedValue([{ loggedOn: "2026-11-01", weightKg: 82, source: "manual" }, { loggedOn: "2026-11-10", weightKg: 81, source: "manual" }]);
});

describe("usePostHistory", () => {
  it("waits until the workout is done", () => {
    renderHook(() => usePostHistory(false, "user-1", exercises));
    expect(db.getExerciseHistory).not.toHaveBeenCalled();
    expect(db.getExerciseWorkingSets).not.toHaveBeenCalled();
    expect(db.getBodyWeightLogs).not.toHaveBeenCalled();
  });

  it("loads each exercise's history and the latest body weight", async () => {
    const { result } = renderHook(() => usePostHistory(true, "user-1", exercises));
    await waitFor(() => expect(result.current.bodyWeightKg).toBe(81));
    expect(Object.keys(result.current.history)).toEqual(["bench", "row", "pull-up"]);
    expect(result.current.history.row[0].weight).toBe(60);
  });

  it("asks for working sets of exactly the workout's exercises", async () => {
    renderHook(() => usePostHistory(true, "user-1", exercises));
    await waitFor(() => expect(db.getExerciseWorkingSets).toHaveBeenCalledWith("user-1", ["bench", "row", "pull-up"]));
  });

  it("turns working sets into volume per session", async () => {
    db.getExerciseWorkingSets.mockResolvedValue([
      set("s1", "bench", 100, 5, "2026-11-05T10:00:00Z"), set("s2", "bench", 100, 6, "2026-11-12T10:00:00Z"),
    ]);
    const { result } = renderHook(() => usePostHistory(true, "user-1", exercises));
    await waitFor(() => expect(result.current.volumes.bench).toBeDefined());
    expect(result.current.volumes.bench).toEqual([{ date: "2026-11-05", volume: 500 }, { date: "2026-11-12", volume: 600 }]);
  });

  it("has no body weight before the first weigh-in", async () => {
    db.getBodyWeightLogs.mockResolvedValue([]);
    const { result } = renderHook(() => usePostHistory(true, "user-1", exercises));
    await waitFor(() => expect(result.current.history.bench).toBeDefined());
    expect(result.current.bodyWeightKg).toBeNull();
  });

  it("logs today's weigh-in and uses it straight away", async () => {
    db.getBodyWeightLogs.mockResolvedValue([]);
    db.logBodyWeight.mockResolvedValue(undefined);
    const { result } = renderHook(() => usePostHistory(true, "user-1", exercises));
    await waitFor(() => expect(result.current.history.bench).toBeDefined());

    await act(() => result.current.logBodyWeight(80));
    expect(db.logBodyWeight).toHaveBeenCalledWith("user-1", localYmd(new Date()), 80);
    expect(result.current.bodyWeightKg).toBe(80);
  });

  it("counts a weigh-in logged on the report in bodyweight volume straight away", async () => {
    db.getBodyWeightLogs.mockResolvedValue([]);
    db.getExerciseWorkingSets.mockResolvedValue([set("s1", "pull-up", 10, 8, `${localYmd(new Date())}T10:00:00Z`)]);
    db.logBodyWeight.mockResolvedValue(undefined);
    const { result } = renderHook(() => usePostHistory(true, "user-1", exercises));
    await waitFor(() => expect(result.current.volumes["pull-up"]?.[0].volume).toBe(80)); // added weight only

    await act(() => result.current.logBodyWeight(80));
    expect(result.current.volumes["pull-up"][0].volume).toBe(720); // (80 + 10) × 8
  });
});

