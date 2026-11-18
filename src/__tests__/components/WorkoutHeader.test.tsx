import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import WorkoutHeader from "@/components/workout/WorkoutHeader";

vi.mock("@/components/workout/WorkoutTimer", () => ({ default: () => null }));

function renderHeader() {
  return render(
    <WorkoutHeader
      week={1}
      dayType="upper"
      startedAt="2026-01-01T00:00:00Z"
      exerciseIndex={1}
      exerciseCount={7}
      isDone={() => false}
      onOpenList={() => {}}
    />
  );
}

describe("WorkoutHeader", () => {
  it("shows the exercise position", () => {
    renderHeader();
    expect(screen.getByText("Exercise 2 of 7")).toBeInTheDocument();
  });

  it("keeps the position label in the same group as the progress dots", () => {
    const { container } = renderHeader();
    const label = screen.getByText("Exercise 2 of 7");
    const group = label.parentElement as HTMLElement;
    expect(group.querySelectorAll(".rounded-full")).toHaveLength(7);
    expect(container.contains(group)).toBe(true);
  });
});
