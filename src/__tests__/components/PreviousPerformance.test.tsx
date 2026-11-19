import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import type { SetLog } from "@/lib/types";
import PreviousPerformance from "@/components/workout/PreviousPerformance";

const last = { id: "l", weight: 100, reps: 8, rpe: 8 } as SetLog;
const best = { id: "b", weight: 110, reps: 5, rpe: null } as SetLog;

describe("PreviousPerformance", () => {
  it("shows last time and the best, each with its own figures", () => {
    render(<PreviousPerformance lastSet={last} bestSet={best} unit="kg" weightPerSide={false} />);
    expect(screen.getByText("Last time").closest("div")).toHaveTextContent("100kg × 8 @ RPE 8");
    expect(screen.getByText("Best").parentElement).toHaveTextContent("110kg × 5");
  });

  it("marks last time as the best, in one row, when it is the best set", () => {
    render(<PreviousPerformance lastSet={best} bestSet={best} unit="kg" weightPerSide={false} />);
    expect(screen.getAllByText("Best")).toHaveLength(1);
    expect(screen.getByText("Last time").closest("div")).toHaveTextContent("Best");
    expect(screen.getByText("Last time").closest("div")).toHaveTextContent("110kg × 5");
  });

  it("treats a different set with the same weight and reps as the best too", () => {
    const sameFigures = { id: "other", weight: 110, reps: 5, rpe: 9 } as SetLog;
    render(<PreviousPerformance lastSet={sameFigures} bestSet={best} unit="kg" weightPerSide={false} />);
    expect(screen.getByText("Last time").closest("div")).toHaveTextContent("Best");
    expect(screen.getByText("Last time").closest("div")).toHaveTextContent("110kg × 5 @ RPE 9");
    expect(screen.getAllByText(/110kg × 5/)).toHaveLength(1); // not repeated in a second row
  });

  it("keeps the rows apart when only the weight or only the reps match", () => {
    render(<PreviousPerformance lastSet={{ id: "x", weight: 110, reps: 4, rpe: null } as SetLog} bestSet={best} unit="kg" weightPerSide={false} />);
    expect(screen.getByText("Best").parentElement).toHaveTextContent("110kg × 5");
    expect(screen.getByText("Last time").closest("div")).not.toHaveTextContent("Best");
  });

  it("converts to lbs and marks per-side weights", () => {
    render(<PreviousPerformance bestSet={best} unit="lbs" weightPerSide />);
    expect(screen.getByText("Best").parentElement).toHaveTextContent("2× 242.5lbs × 5");
    expect(screen.queryByText("Last time")).toBeNull();
  });

  it("renders nothing without any history", () => {
    const { container } = render(<PreviousPerformance unit="kg" weightPerSide={false} />);
    expect(container.firstChild).toBeNull();
  });
});
