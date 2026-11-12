import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import { cacheSet, cacheDelete } from "@/lib/cache";
import type { ActiveWorkoutInfo } from "@/components/ActiveWorkoutBanner";

const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

// Import after mock is set up
import ActiveWorkoutBanner from "@/components/ActiveWorkoutBanner";
import { fireEvent } from "@testing-library/react";

const workoutInfo: ActiveWorkoutInfo = {
  week: 2,
  dayIndex: 1,
  dayType: "upper-a",
  exerciseName: "Bench Press",
  exerciseIndex: 2,
  exerciseTotal: 5,
};

describe("ActiveWorkoutBanner", () => {
  beforeEach(() => {
    localStorage.clear();
    mockPush.mockClear();
  });

  afterEach(() => {
    cacheDelete("active_workout");
  });

  it("renders nothing when no cache entry exists", () => {
    const { container } = render(<ActiveWorkoutBanner />);
    expect(container.firstChild).toBeNull();
  });

  it("renders the banner when cache entry is present", () => {
    cacheSet("active_workout", workoutInfo);
    render(<ActiveWorkoutBanner />);
    expect(screen.getByText("Bench Press")).toBeInTheDocument();
  });

  it("shows the exercise name", () => {
    cacheSet("active_workout", workoutInfo);
    render(<ActiveWorkoutBanner />);
    expect(screen.getByText("Bench Press")).toBeInTheDocument();
  });

  it("shows week and day label", () => {
    cacheSet("active_workout", workoutInfo);
    render(<ActiveWorkoutBanner />);
    // "Week 2 · Upper — Strength"
    expect(screen.getByText(/Week 2/)).toBeInTheDocument();
    expect(screen.getByText(/Upper — Strength/)).toBeInTheDocument();
  });

  it("shows exercise progress fraction '3/5'", () => {
    cacheSet("active_workout", workoutInfo);
    render(<ActiveWorkoutBanner />);
    // exerciseIndex+1 / exerciseTotal = 3/5
    expect(screen.getByText("3/5")).toBeInTheDocument();
  });

  it("clicking the button navigates to /workout?week=2&day=1", () => {
    cacheSet("active_workout", workoutInfo);
    render(<ActiveWorkoutBanner />);
    const button = screen.getByRole("button");
    fireEvent.click(button);
    expect(mockPush).toHaveBeenCalledWith("/workout?week=2&day=1");
  });

  it("re-renders with new data when active_workout_changed event fires", async () => {
    const updatedWorkout: ActiveWorkoutInfo = {
      ...workoutInfo,
      exerciseName: "Squat",
    };

    cacheSet("active_workout", workoutInfo);
    render(<ActiveWorkoutBanner />);
    expect(screen.getByText("Bench Press")).toBeInTheDocument();

    // Update cache and dispatch event
    await act(async () => {
      cacheSet("active_workout", updatedWorkout);
      window.dispatchEvent(new Event("active_workout_changed"));
    });

    await waitFor(() => {
      expect(screen.getByText("Squat")).toBeInTheDocument();
    });
  });

  it("disappears after cache is cleared and event dispatched", async () => {
    cacheSet("active_workout", workoutInfo);
    render(<ActiveWorkoutBanner />);
    expect(screen.getByText("Bench Press")).toBeInTheDocument();

    await act(async () => {
      cacheDelete("active_workout");
      window.dispatchEvent(new Event("active_workout_changed"));
    });

    await waitFor(() => {
      expect(screen.queryByText("Bench Press")).not.toBeInTheDocument();
    });
  });
});
