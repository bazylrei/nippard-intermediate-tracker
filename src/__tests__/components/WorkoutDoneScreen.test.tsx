import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import WorkoutDoneScreen from "@/components/workout/WorkoutDoneScreen";
import type { Exercise, SetLog } from "@/lib/types";

vi.mock("recharts", () => ({
  ResponsiveContainer: () => null, LineChart: () => null, Line: () => null, Tooltip: () => null, YAxis: () => null,
}));

const exercise = { id: "bench", name: "Bench", muscleGroup: "chest", weightPerSide: false } as Exercise;
const sets = [{ id: "s", exerciseId: "bench", setIndex: 0, weight: 105, reps: 5 }] as SetLog[];
const postHistory = { bench: [{ date: "a", weight: 100, reps: 5 }, { date: "b", weight: 105, reps: 5 }] };

function renderDone(unit: "kg" | "lbs") {
  render(
    <WorkoutDoneScreen week={2} dayType="full-body" exercises={[exercise]} sessionSets={sets}
      postHistory={postHistory} unit={unit} onHome={vi.fn()} onProgress={vi.fn()} />,
  );
}

describe("WorkoutDoneScreen", () => {
  it("converts the change vs last time to lbs (was kg labelled lbs)", () => {
    renderDone("lbs");
    expect(screen.getByText(/\+11lbs vs last/)).toBeInTheDocument(); // 5kg ≈ 11.02 lbs
    expect(screen.getByText("231.5lbs")).toBeInTheDocument(); // 105kg
  });

  it("shows kg as stored, and labels a builder day type", () => {
    renderDone("kg");
    expect(screen.getByText(/\+5kg vs last/)).toBeInTheDocument();
    expect(screen.getByText(/Full Body/)).toBeInTheDocument();
  });
});
