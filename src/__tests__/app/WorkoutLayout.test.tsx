import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

const router = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router, usePathname: () => "/workout" }));

import WorkoutLayout from "@/app/(workout)/layout";
import MainLayout from "@/app/(main)/layout";
import { saveActiveWorkout } from "@/lib/active-workout";

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  saveActiveWorkout({ week: 1, dayIndex: 0, dayType: "upper-a", exerciseName: "Bench Press", exerciseIndex: 0, exerciseTotal: 5 });
});

describe("WorkoutLayout", () => {
  it("keeps the tab bar on the workout so you can leave without a back button", () => {
    render(<WorkoutLayout><p>workout</p></WorkoutLayout>);

    expect(screen.getByText("workout")).toBeInTheDocument();
    // Mobile bar + desktop sidebar each render the tabs.
    fireEvent.click(screen.getAllByRole("button", { name: "Home" })[0]);
    expect(router.push).toHaveBeenCalledWith("/");
    expect(screen.getAllByRole("button", { name: "Progress" }).length).toBeGreaterThan(0);
  });

  it("doesn't show the resume-workout banner while you're in the workout", () => {
    render(<WorkoutLayout><p>workout</p></WorkoutLayout>);
    expect(screen.queryByText("Bench Press")).toBeNull();
  });

  it("still shows the banner on the other tabs", () => {
    render(<MainLayout><p>home</p></MainLayout>);
    expect(screen.getByText("Bench Press")).toBeInTheDocument();
  });
});
