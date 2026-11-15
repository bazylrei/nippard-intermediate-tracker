import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act, within } from "@testing-library/react";

const router = vi.hoisted(() => ({ push: vi.fn() }));
let pathname = "/";
vi.mock("next/navigation", () => ({ useRouter: () => router, usePathname: () => pathname }));

import AppNav from "@/components/BottomNav";
import { clearActiveWorkout, saveActiveWorkout } from "@/lib/active-workout";

const inProgress = { week: 2, dayIndex: 1, dayType: "upper-a", exerciseName: "Bench Press", exerciseIndex: 0, exerciseTotal: 5 };

/** The mobile bar (the desktop sidebar renders the same tabs). */
function mobileBar() {
  return within(screen.getAllByRole("navigation").at(-1)!);
}

function tabLabels() {
  return mobileBar().getAllByRole("button").map((b) => b.textContent);
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  pathname = "/";
});

describe("AppNav", () => {
  it("shows the four tabs and no Workout tab when no workout is in progress", () => {
    render(<AppNav />);
    expect(tabLabels()).toEqual(["Home", "Program", "Progress", "Builder"]);
    expect(mobileBar().getByRole("button", { name: "Home" })).toHaveAttribute("aria-current", "page");
  });

  it("adds a Workout tab after Home while a workout is in progress, leading back to it", () => {
    saveActiveWorkout(inProgress);
    pathname = "/progress";
    render(<AppNav />);

    expect(tabLabels()).toEqual(["Home", "Workout", "Program", "Progress", "Builder"]);
    const workoutTab = mobileBar().getByRole("button", { name: "Workout" });
    expect(workoutTab).not.toHaveAttribute("aria-current");

    fireEvent.click(workoutTab);
    expect(router.push).toHaveBeenCalledWith("/workout?week=2&day=1");
  });

  it("selects the Workout tab while you're in the workout, and tapping it stays put", () => {
    saveActiveWorkout(inProgress);
    pathname = "/workout";
    render(<AppNav />);

    expect(mobileBar().getByRole("button", { name: "Workout" })).toHaveAttribute("aria-current", "page");
    expect(mobileBar().getByRole("button", { name: "Home" })).not.toHaveAttribute("aria-current");

    fireEvent.click(mobileBar().getByRole("button", { name: "Workout" }));
    expect(router.push).not.toHaveBeenCalled();
    fireEvent.click(mobileBar().getByRole("button", { name: "Home" }));
    expect(router.push).toHaveBeenCalledWith("/");
  });

  it("keeps the Workout tab selected on the finished screen, after the workout is cleared", () => {
    pathname = "/workout";
    render(<AppNav />);
    expect(mobileBar().getByRole("button", { name: "Workout" })).toHaveAttribute("aria-current", "page");
  });

  it("adds and removes the tab as a workout starts and finishes", () => {
    render(<AppNav />);
    expect(tabLabels()).not.toContain("Workout");

    act(() => saveActiveWorkout(inProgress));
    expect(tabLabels()).toContain("Workout");

    act(() => clearActiveWorkout());
    expect(tabLabels()).not.toContain("Workout");
  });
});
