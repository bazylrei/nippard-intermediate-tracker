import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import HistoryTab from "@/app/(main)/progress/HistoryTab";
import type { WorkoutSession } from "@/lib/types";

const item = (id: string) => ({
  session: { id, dayType: "push", week: 1, completedAt: "2026-11-01T10:00:00Z" } as WorkoutSession,
  exerciseCount: 5, setCount: 15,
});

describe("HistoryTab", () => {
  it("lists workouts with the shared cell, each linking to its detail page", () => {
    render(<HistoryTab items={[item("a"), item("b")]} loaded failed={false} />);
    expect(screen.getAllByRole("link").map((l) => l.getAttribute("href"))).toEqual(["/history/a", "/history/b"]);
  });

  it("shows loading, empty and failure states", () => {
    const { rerender } = render(<HistoryTab items={[]} loaded={false} failed={false} />);
    expect(screen.getByText(/Loading history/)).toBeInTheDocument();
    rerender(<HistoryTab items={[]} loaded failed={false} />);
    expect(screen.getByText("No completed workouts yet.")).toBeInTheDocument();
    rerender(<HistoryTab items={[]} loaded failed />);
    expect(screen.getByText(/Couldn't load your history/)).toBeInTheDocument();
  });
});
