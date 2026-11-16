import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act, within, waitFor } from "@testing-library/react";

const router = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn() }));
let pathname = "/";
vi.mock("next/navigation", () => ({ useRouter: () => router, usePathname: () => pathname }));
const auth = vi.hoisted(() => ({ getSignedInUser: vi.fn() }));
vi.mock("@/lib/auth", () => auth);
const next = vi.hoisted(() => ({ findNextWorkout: vi.fn() }));
vi.mock("@/lib/next-workout", () => next);

import AppNav from "@/components/BottomNav";
import { RestTimerProvider, useRestTimer } from "@/context/RestTimerContext";
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
  auth.getSignedInUser.mockResolvedValue({ id: "user-1" });
  next.findNextWorkout.mockResolvedValue({ week: 3, dayIndex: 2 });
});

describe("AppNav", () => {
  it("shows Home and Progress, then the Start button in the middle, then Community and Profile", () => {
    render(<AppNav />);
    expect(tabLabels()).toEqual(["Home", "Progress", "Start", "Community", "Profile"]);
    expect(mobileBar().getByRole("button", { name: "Home" })).toHaveAttribute("aria-current", "page");
  });

  it.each(["/profile", "/program", "/builder/prog-1", "/settings"])("selects Profile on %s, which is opened from it", (path) => {
    pathname = path;
    render(<AppNav />);
    expect(mobileBar().getByRole("button", { name: "Profile" })).toHaveAttribute("aria-current", "page");
    expect(mobileBar().getByRole("button", { name: "Home" })).not.toHaveAttribute("aria-current");
  });

  it("selects Community on its page", () => {
    pathname = "/community";
    render(<AppNav />);
    expect(mobileBar().getByRole("button", { name: "Community" })).toHaveAttribute("aria-current", "page");
  });

  it("starts the next workout from the middle button when none is in progress", async () => {
    render(<AppNav />);
    fireEvent.click(mobileBar().getByRole("button", { name: "Start workout" }));
    await waitFor(() => expect(router.push).toHaveBeenCalledWith("/workout?week=3&day=2"));
    expect(next.findNextWorkout).toHaveBeenCalledWith("user-1", expect.any(Array));
  });

  it("goes Home when the next workout can't be worked out", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    next.findNextWorkout.mockRejectedValue(new Error("offline"));
    render(<AppNav />);
    fireEvent.click(mobileBar().getByRole("button", { name: "Start workout" }));
    await waitFor(() => expect(router.push).toHaveBeenCalledWith("/"));
  });

  it("sends a signed-out visitor to sign in instead of starting a workout", async () => {
    auth.getSignedInUser.mockResolvedValue(null);
    render(<AppNav />);
    fireEvent.click(mobileBar().getByRole("button", { name: "Start workout" }));
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/auth"));
    expect(router.push).not.toHaveBeenCalled();
  });

  it("turns the middle button into the Workout tab while a workout is in progress, leading back to it", () => {
    saveActiveWorkout(inProgress);
    pathname = "/progress";
    render(<AppNav />);

    expect(tabLabels()).toEqual(["Home", "Progress", "Workout", "Community", "Profile"]);
    const workoutTab = mobileBar().getByRole("button", { name: "Workout" });
    expect(workoutTab).not.toHaveAttribute("aria-current");

    fireEvent.click(workoutTab);
    expect(router.push).toHaveBeenCalledWith("/workout?week=2&day=1");
    expect(next.findNextWorkout).not.toHaveBeenCalled();
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

  it("switches between Start and Workout, in the same place, as a workout starts and finishes", () => {
    render(<AppNav />);
    expect(tabLabels()[2]).toBe("Start");

    act(() => saveActiveWorkout(inProgress));
    expect(tabLabels()[2]).toBe("Workout");

    act(() => clearActiveWorkout());
    expect(tabLabels()[2]).toBe("Start");
  });
});

describe("AppNav — the Workout tab's live clock", () => {
  const START = new Date("2026-11-15T10:00:00Z");
  let startRest: (seconds: number) => void = () => {};

  function RestStarter() {
    startRest = useRestTimer().start;
    return null;
  }

  function renderWithTimer() {
    return render(<RestTimerProvider><RestStarter /><AppNav /></RestTimerProvider>);
  }

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(START.getTime() + 24 * 60_000 + 10_000));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows how long the workout has been going", () => {
    saveActiveWorkout({ ...inProgress, startedAt: START.toISOString() });
    renderWithTimer();

    expect(mobileBar().getByRole("timer", { name: "Workout duration" })).toHaveTextContent("24:10");
    act(() => { vi.advanceTimersByTime(2000); });
    expect(mobileBar().getByRole("timer")).toHaveTextContent("24:12");
  });

  it("counts down the rest instead while resting, then goes back to the workout time", () => {
    saveActiveWorkout({ ...inProgress, startedAt: START.toISOString() });
    renderWithTimer();

    act(() => startRest(90));
    expect(mobileBar().getByRole("timer", { name: "Rest remaining" })).toHaveTextContent("1:30");

    act(() => { vi.advanceTimersByTime(91_000); });
    expect(mobileBar().getByRole("timer", { name: "Workout duration" })).toHaveTextContent("25:41");
  });

  it("shows no clock on the Start button, even while a rest timer runs", () => {
    renderWithTimer();
    act(() => startRest(90));
    expect(mobileBar().getByRole("button", { name: "Start workout" })).toBeInTheDocument();
    expect(mobileBar().queryByRole("timer")).toBeNull();
  });

  it("shows just the icon for a workout saved without a start time", () => {
    saveActiveWorkout(inProgress); // saved by an older version of the app
    renderWithTimer();
    expect(mobileBar().getByRole("button", { name: "Workout" })).toBeInTheDocument();
    expect(mobileBar().queryByRole("timer")).toBeNull();
  });
});
