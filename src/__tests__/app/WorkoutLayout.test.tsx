import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

const router = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router, usePathname: () => "/workout" }));

vi.mock("@/components/RestTimerBar", () => ({ default: ({ placement = "overlay" }: { placement?: string }) => <div data-rest-bar={placement} /> }));

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

  it("shows the workout in progress as a Workout tab on the other tabs, with no banner", () => {
    render(<MainLayout><p>home</p></MainLayout>);
    expect(screen.getAllByRole("button", { name: "Workout" }).length).toBeGreaterThan(0);
    expect(screen.queryByText("Bench Press")).toBeNull(); // the old banner showed the exercise
  });
});

describe("single scroll pane", () => {
  it("never scrolls the workout viewport itself, so pages own their scrolling", () => {
    const { container } = render(<WorkoutLayout><p>workout</p></WorkoutLayout>);
    const viewport = container.querySelector(".workout-viewport");
    expect(viewport).toHaveClass("overflow-hidden");
    expect(viewport).not.toHaveClass("overflow-y-auto");
  });
});

describe("rest bar placement", () => {
  it("overlays the rest bar on the other tabs", () => {
    const { container } = render(<MainLayout><p>home</p></MainLayout>);
    expect(container.querySelector('[data-rest-bar="overlay"]')).not.toBeNull();
  });

  it("leaves the rest bar to the workout page, which puts it inline above its header", () => {
    const { container } = render(<WorkoutLayout><p>workout</p></WorkoutLayout>);
    expect(container.querySelector("[data-rest-bar]")).toBeNull();
  });
});
