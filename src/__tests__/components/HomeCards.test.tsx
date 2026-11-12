import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import NextWorkoutCard from "@/components/home/NextWorkoutCard";
import WorkoutFeedCard from "@/components/home/WorkoutFeedCard";
import type { WorkoutDay, WorkoutSession } from "@/lib/types";

const ex = (name: string) => ({ name });
const day = (n: number): WorkoutDay => ({
  dayType: "push",
  exercises: Array.from({ length: n }, (_, i) => ex(`Ex${i + 1}`)),
}) as unknown as WorkoutDay;

describe("NextWorkoutCard", () => {
  it("shows the suggestion, day label and session number", () => {
    render(<NextWorkoutCard week={2} dayIndex={3} day={day(5)} isResume={false} onStart={vi.fn()} />);
    expect(screen.getByText("Suggested next")).toBeInTheDocument();
    expect(screen.getByText("Push — Hypertrophy")).toBeInTheDocument();
    expect(screen.getByText("Session 9")).toBeInTheDocument(); // (2-1)*5 + 3 + 1
  });

  it("previews three exercises and counts the rest", () => {
    render(<NextWorkoutCard week={1} dayIndex={0} day={day(5)} isResume={false} onStart={vi.fn()} />);
    expect(screen.getByText(/Ex1 · Ex2 · Ex3 · \+2 more/)).toBeInTheDocument();
  });

  it("offers Resume instead of Start for an unfinished session, and fires onStart", () => {
    const onStart = vi.fn();
    render(<NextWorkoutCard week={1} dayIndex={0} day={day(2)} isResume onStart={onStart} />);
    fireEvent.click(screen.getByRole("button", { name: /Resume workout/ }));
    expect(onStart).toHaveBeenCalledTimes(1);
    expect(screen.queryByText(/more/)).toBeNull();
  });
});

describe("WorkoutFeedCard", () => {
  const session = {
    id: "s1", dayType: "upper-a", week: 4, completedAt: new Date().toISOString(),
  } as unknown as WorkoutSession;

  it("renders label, week, counts and relative date", () => {
    render(<WorkoutFeedCard item={{ session, exerciseCount: 6, setCount: 18 }} />);
    expect(screen.getByText("Upper — Strength")).toBeInTheDocument();
    expect(screen.getByText(/Week 4/)).toBeInTheDocument();
    expect(screen.getByText("6 exercises · 18 sets")).toBeInTheDocument();
    expect(screen.getByText("Today")).toBeInTheDocument();
  });
});
