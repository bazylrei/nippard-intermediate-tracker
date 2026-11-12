import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import type { WeekSchedule, WorkoutDay } from "@/lib/types";

// Stable like Next's real router — a new object per render would re-run the load effect forever.
const router = vi.hoisted(() => ({ replace: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));

const db = vi.hoisted(() => ({
  getIncompleteSession: vi.fn(),
  getLastCompletedWorkout: vi.fn(),
  getRecentWorkouts: vi.fn(),
}));
vi.mock("@/lib/db", () => db);
vi.mock("@/lib/auth", () => ({ getSignedInUser: vi.fn().mockResolvedValue({ id: "user-1" }) }));

const day = {} as WorkoutDay;
let program: WeekSchedule[] = [];
vi.mock("@/context/ProgramContext", () => ({ useProgramContext: () => ({ program }) }));

import { useHomeFeed } from "@/hooks/useHomeFeed";

const weeks = (n: number, days: number): WeekSchedule[] =>
  Array.from({ length: n }, (_, w) => ({ week: w + 1, days: Array(days).fill(day) }));

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  program = weeks(13, 5);
  db.getIncompleteSession.mockResolvedValue(null);
  db.getLastCompletedWorkout.mockResolvedValue({ week: 12, dayIndex: 4 });
  db.getRecentWorkouts.mockResolvedValue({ sessions: [], sets: [] });
});

describe("useHomeFeed", () => {
  it("suggests the next workout from the program's real schedule (week 13 exists here)", async () => {
    const { result } = renderHook(() => useHomeFeed());
    await waitFor(() => expect(result.current.feed).not.toBeNull());
    expect(result.current.feed?.nextSession).toEqual({ week: 13, dayIndex: 0 });
    expect(result.current.feed?.hasResume).toBe(false);
  });

  it("prefers resuming an unfinished workout", async () => {
    db.getIncompleteSession.mockResolvedValue({ week: 4, dayIndex: 2 });
    const { result } = renderHook(() => useHomeFeed());
    await waitFor(() => expect(result.current.feed?.hasResume).toBe(true));
    expect(result.current.feed?.nextSession).toEqual({ week: 4, dayIndex: 2 });
  });

  it("loads everything in one parallel batch (sessions and their sets together)", async () => {
    const { result } = renderHook(() => useHomeFeed());
    await waitFor(() => expect(result.current.feed).not.toBeNull());
    expect(db.getRecentWorkouts).toHaveBeenCalledTimes(1);
    expect(db.getRecentWorkouts).toHaveBeenCalledWith("user-1", 20);
  });
});

describe("useHomeFeed — failures", () => {
  it("reports failure when loading fails and nothing is cached", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    db.getRecentWorkouts.mockRejectedValue(new Error("offline"));
    const { result } = renderHook(() => useHomeFeed());
    await waitFor(() => expect(result.current.failed).toBe(true));
    expect(result.current.feed).toBeNull();
  });
});
