import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import WorkoutTimer from "@/components/workout/WorkoutTimer";

const START = new Date("2026-11-15T10:00:00Z");

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("WorkoutTimer", () => {
  it("shows the time since the workout started and ticks every second", () => {
    vi.setSystemTime(new Date(START.getTime() + 5 * 60_000));
    render(<WorkoutTimer startedAt={START.toISOString()} />);
    expect(screen.getByRole("timer", { name: "Workout duration" })).toHaveTextContent("5:00");

    act(() => { vi.advanceTimersByTime(3000); });
    expect(screen.getByRole("timer")).toHaveTextContent("5:03");
  });

  it("catches up from the clock after the app was asleep", () => {
    vi.setSystemTime(START);
    render(<WorkoutTimer startedAt={START.toISOString()} />);

    // Timers don't fire while the phone is locked; the clock still moves.
    act(() => { vi.setSystemTime(new Date(START.getTime() + 75 * 60_000)); vi.advanceTimersByTime(1000); });
    expect(screen.getByRole("timer")).toHaveTextContent("1:15:01");
  });

  it("never shows negative time when the server clock is ahead", () => {
    vi.setSystemTime(START);
    render(<WorkoutTimer startedAt={new Date(START.getTime() + 4000).toISOString()} />);
    expect(screen.getByRole("timer")).toHaveTextContent("0:00");
  });
});
