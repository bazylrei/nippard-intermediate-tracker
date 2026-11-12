import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import NextWorkoutCard from "@/components/workouts/NextWorkoutCard";
import CompletedWorkoutCell from "@/components/workouts/CompletedWorkoutCell";
import type { WorkoutDay, WorkoutSession } from "@/lib/types";

const ex = (name: string) => ({ name });
const day = (n: number): WorkoutDay => ({
  dayType: "push",
  exercises: Array.from({ length: n }, (_, i) => ex(`Ex${i + 1}`)),
}) as unknown as WorkoutDay;

describe("NextWorkoutCard", () => {
  it("shows the suggestion, day label, session number and the program's real week count", () => {
    render(<NextWorkoutCard week={2} totalWeeks={13} sessionNumber={9} day={day(5)} isResume={false} onStart={vi.fn()} />);
    expect(screen.getByText("Suggested next")).toBeInTheDocument();
    expect(screen.getByText("Push — Hypertrophy")).toBeInTheDocument();
    expect(screen.getByText("Session 9")).toBeInTheDocument();
    expect(screen.getByText(/Week 2 of 13/)).toBeInTheDocument();
  });

  it("previews three exercises and counts the rest", () => {
    render(<NextWorkoutCard week={1} totalWeeks={12} sessionNumber={1} day={day(5)} isResume={false} onStart={vi.fn()} />);
    expect(screen.getByText(/Ex1 · Ex2 · Ex3 · \+2 more/)).toBeInTheDocument();
  });

  it("offers Resume instead of Start for an unfinished session, and fires onStart", () => {
    const onStart = vi.fn();
    render(<NextWorkoutCard week={1} totalWeeks={12} sessionNumber={1} day={day(2)} isResume onStart={onStart} />);
    fireEvent.click(screen.getByRole("button", { name: /Resume workout/ }));
    expect(onStart).toHaveBeenCalledTimes(1);
    expect(screen.queryByText(/more/)).toBeNull();
  });
});

describe("CompletedWorkoutCell", () => {
  const session = {
    id: "s1", dayType: "upper-a", week: 4, completedAt: new Date().toISOString(),
  } as unknown as WorkoutSession;

  it("renders label, week, counts and relative date", () => {
    render(<CompletedWorkoutCell item={{ session, exerciseCount: 6, setCount: 18 }} />);
    expect(screen.getByText("Upper — Strength")).toBeInTheDocument();
    expect(screen.getByText(/Week 4/)).toBeInTheDocument();
    expect(screen.getByText("6 exercises · 18 sets")).toBeInTheDocument();
    expect(screen.getByText("Today")).toBeInTheDocument();
  });

  it("links to the workout's detail page", () => {
    render(<CompletedWorkoutCell item={{ session, exerciseCount: 6, setCount: 18 }} />);
    expect(screen.getByRole("link")).toHaveAttribute("href", "/history/s1");
  });
});
