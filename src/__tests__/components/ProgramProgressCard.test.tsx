import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import ProgramProgressCard from "@/components/program/ProgramProgressCard";

describe("ProgramProgressCard", () => {
  it("shows the count, the percentage and the weeks at either end", () => {
    render(<ProgramProgressCard doneCount={12} totalSessions={48} firstWeek={1} lastWeek={12} />);
    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText("/ 48")).toBeInTheDocument();
    expect(screen.getByText("25% complete")).toBeInTheDocument();
    expect(screen.getByText("Week 1")).toBeInTheDocument();
    expect(screen.getByText("Week 12")).toBeInTheDocument();
  });

  it("reads 0% for a program with no workouts rather than dividing by zero", () => {
    render(<ProgramProgressCard doneCount={0} totalSessions={0} firstWeek={1} lastWeek={1} />);
    expect(screen.getByText("0% complete")).toBeInTheDocument();
  });
});
