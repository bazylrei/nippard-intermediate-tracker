import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import WeekDayTile from "@/components/program/WeekDayTile";
import type { WorkoutDay } from "@/lib/types";

const day = { dayType: "lower-a", exercises: [{}, {}, {}] } as unknown as WorkoutDay;

describe("WeekDayTile", () => {
  it("links a completed day to its workout details", () => {
    render(<WeekDayTile day={day} number={1} isDone isNext={false} href="/history/s1" />);
    expect(screen.getByRole("link")).toHaveAttribute("href", "/history/s1");
    expect(screen.getByText("✓")).toBeInTheDocument();
  });

  it("is not a link for an upcoming day", () => {
    render(<WeekDayTile day={day} number={4} isDone={false} isNext={false} />);
    expect(screen.queryByRole("link")).toBeNull();
    expect(screen.getByText("4")).toBeInTheDocument();
    expect(screen.getByText("Lower — Strength")).toBeInTheDocument();
    expect(screen.getByText("3 exercises")).toBeInTheDocument();
  });
});
