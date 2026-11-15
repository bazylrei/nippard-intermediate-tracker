import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import type { Exercise } from "@/lib/types";

const db = vi.hoisted(() => ({ getExerciseHistory: vi.fn(), getLatestBodyWeight: vi.fn(), logBodyWeight: vi.fn() }));
vi.mock("@/lib/db", () => db);

import { usePostHistory } from "@/hooks/useWorkoutHistory";
import { localYmd } from "@/lib/dates";

const exercises = [{ id: "bench" }, { id: "row" }] as Exercise[];

beforeEach(() => {
  vi.clearAllMocks();
  db.getExerciseHistory.mockImplementation(async (_u: string, id: string) => [{ date: "2026-11-15", weight: id === "bench" ? 100 : 60, reps: 8 }]);
  db.getLatestBodyWeight.mockResolvedValue({ loggedOn: "2026-11-16", weightKg: 81, source: "manual" });
});

describe("usePostHistory", () => {
  it("waits until the workout is done", () => {
    renderHook(() => usePostHistory(false, "user-1", exercises));
    expect(db.getExerciseHistory).not.toHaveBeenCalled();
    expect(db.getLatestBodyWeight).not.toHaveBeenCalled();
  });

  it("loads each exercise's history and the latest body weight", async () => {
    const { result } = renderHook(() => usePostHistory(true, "user-1", exercises));
    await waitFor(() => expect(result.current.bodyWeightKg).toBe(81));
    expect(Object.keys(result.current.history)).toEqual(["bench", "row"]);
    expect(result.current.history.row[0].weight).toBe(60);
  });

  it("has no body weight before the first weigh-in", async () => {
    db.getLatestBodyWeight.mockResolvedValue(null);
    const { result } = renderHook(() => usePostHistory(true, "user-1", exercises));
    await waitFor(() => expect(result.current.history.bench).toBeDefined());
    expect(result.current.bodyWeightKg).toBeNull();
  });

  it("logs today's weigh-in and uses it straight away", async () => {
    db.getLatestBodyWeight.mockResolvedValue(null);
    db.logBodyWeight.mockResolvedValue(undefined);
    const { result } = renderHook(() => usePostHistory(true, "user-1", exercises));
    await waitFor(() => expect(result.current.history.bench).toBeDefined());

    await act(() => result.current.logBodyWeight(80));
    expect(db.logBodyWeight).toHaveBeenCalledWith("user-1", localYmd(new Date()), 80);
    expect(result.current.bodyWeightKg).toBe(80);
  });
});

