import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import WeekDayTile from "@/components/program/WeekDayTile";
import type { WorkoutDay } from "@/lib/types";

const day = { dayType: "lower-a", exercises: [{}, {}, {}] } as unknown as WorkoutDay;

describe("WeekDayTile", () => {
  it("ticks a done day and links it to its workout details", () => {
    render(<WeekDayTile day={day} number={1} status="done" href="/history/s1" />);
    expect(screen.getByRole("link")).toHaveAttribute("href", "/history/s1");
    expect(screen.getByText("✓")).toBeInTheDocument();
  });

  it("lets a day not done yet be chosen", () => {
    const onSelect = vi.fn();
    render(<WeekDayTile day={day} number={4} status="todo" onSelect={onSelect} />);
    expect(screen.getByText("4")).toBeInTheDocument();
    expect(screen.getByText("3 exercises")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Lower — Strength/ }));
    expect(onSelect).toHaveBeenCalled();
  });

  it("marks the suggested day and the unfinished one", () => {
    const { unmount } = render(<WeekDayTile day={day} number={2} status="next" onSelect={vi.fn()} />);
    expect(screen.getByText("Up next")).toBeInTheDocument();
    unmount();
    render(<WeekDayTile day={day} number={2} status="in-progress" onSelect={vi.fn()} />);
    expect(screen.getByText("In progress")).toBeInTheDocument();
  });

  it("is plain when there's nothing to open", () => {
    render(<WeekDayTile day={day} number={3} status="todo" />);
    expect(screen.queryByRole("link")).toBeNull();
    expect(screen.queryByRole("button")).toBeNull();
  });
});
