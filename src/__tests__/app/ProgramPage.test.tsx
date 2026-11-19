import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act, within } from "@testing-library/react";
import type { WeekSchedule } from "@/lib/types";

const router = vi.hoisted(() => ({ replace: vi.fn(), push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));
const auth = vi.hoisted(() => ({ getSignedInUser: vi.fn() }));
vi.mock("@/lib/auth", () => auth);

const db = vi.hoisted(() => ({
  getWorkoutOverview: vi.fn(),
  completeSession: vi.fn(),
  deleteWorkoutSession: vi.fn(),
  getPreferences: vi.fn(),
  getLatestBodyWeight: vi.fn(),
}));
vi.mock("@/lib/db", () => db);

const ex = { id: "bench", name: "Bench", repRange: [6, 8] };
const day = (dayType: string) => ({ dayType, exercises: [ex] });
const program = [
  { week: 1, days: [day("upper-a"), day("lower-a"), day("push")] },
  { week: 2, days: [day("upper-a"), day("lower-a"), day("push")] },
] as unknown as WeekSchedule[];
vi.mock("@/context/ProgramContext", () => ({ useProgramContext: () => ({ program }) }));

import MyProgram from "@/app/(main)/program/page";

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  vi.spyOn(console, "error").mockImplementation(() => {});
  auth.getSignedInUser.mockResolvedValue({ id: "user-1", email: "me@example.com" });
  db.completeSession.mockResolvedValue(undefined);
  db.deleteWorkoutSession.mockResolvedValue(undefined);
  db.getWorkoutOverview.mockResolvedValue({
    unfinished: null,
    completed: [
      { sessionId: "s2", week: 1, dayIndex: 1 },
      { sessionId: "s1", week: 1, dayIndex: 0 },
    ],
  });
});

async function renderPage() {
  render(<MyProgram />);
  await screen.findByText("Week 1 Overview");
}

const tile = (name: RegExp) => screen.getByRole("button", { name });
/** Two working sets logged (the warm-up isn't counted by the database). */
const unfinishedUpper = { sessionId: "u1", week: 1, dayIndex: 0, dayType: "upper-a", setCount: 2 };

describe("Program page — week overview", () => {
  it("links each completed day to its workout and leaves the rest plain", async () => {
    await renderPage();
    const hrefs = screen.getAllByRole("link").map((l) => l.getAttribute("href")).filter((href) => href !== "/profile");
    expect(hrefs).toEqual(["/history/s1", "/history/s2"]);
  });

  it("ticks only the days actually done, and suggests a skipped one", async () => {
    db.getWorkoutOverview.mockResolvedValue({ unfinished: null, completed: [{ sessionId: "s3", week: 1, dayIndex: 2 }, { sessionId: "s1", week: 1, dayIndex: 0 }] });
    await renderPage();
    const hrefs = screen.getAllByRole("link").map((l) => l.getAttribute("href")).filter((href) => href !== "/profile");
    expect(hrefs).toEqual(["/history/s1", "/history/s3"]);
    expect(within(tile(/Lower — Strength/)).getByText("Up next")).toBeInTheDocument();
    expect(within(tile(/Lower — Strength/)).getByText("2")).toBeInTheDocument(); // not ticked
  });

  it("counts progress from the days done", async () => {
    await renderPage();
    expect(screen.getByText("33% complete")).toBeInTheDocument(); // 2 of 6
  });

  it("browses other weeks", async () => {
    await renderPage();
    expect(screen.getByRole("button", { name: "Previous week" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Next week" }));
    expect(screen.getByText("Week 2 Overview")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Next week" })).toBeDisabled();
    expect(screen.getAllByRole("button", { name: /exercises/ })).toHaveLength(3); // none done in week 2
  });
});

describe("Program page — choosing a workout", () => {
  it("confirms a chosen day before starting it", async () => {
    await renderPage();
    fireEvent.click(screen.getByRole("button", { name: "Next week" }));
    fireEvent.click(tile(/Push/));
    const sheet = screen.getByRole("dialog", { name: "Start Push — Hypertrophy" });
    expect(router.push).not.toHaveBeenCalled();

    await act(async () => { fireEvent.click(within(sheet).getByRole("button", { name: "Start workout" })); });
    expect(router.push).toHaveBeenCalledWith("/workout?week=2&day=2");
  });

  it("saves the unfinished workout as it is, then starts the chosen one", async () => {
    db.getWorkoutOverview.mockResolvedValue({ unfinished: unfinishedUpper, completed: [] });
    await renderPage();
    fireEvent.click(tile(/Push/));
    expect(screen.getByText(/unfinished, with 2 sets logged/)).toBeInTheDocument(); // warm-up not counted

    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Save it & start" })); });
    expect(db.completeSession).toHaveBeenCalledWith("u1");
    expect(db.deleteWorkoutSession).not.toHaveBeenCalled();
    expect(router.push).toHaveBeenCalledWith("/workout?week=1&day=2");
  });

  it("can discard the unfinished workout instead", async () => {
    db.getWorkoutOverview.mockResolvedValue({ unfinished: unfinishedUpper, completed: [] });
    await renderPage();
    fireEvent.click(tile(/Push/));
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Discard it & start" })); });
    expect(db.deleteWorkoutSession).toHaveBeenCalledWith("u1");
    expect(router.push).toHaveBeenCalledWith("/workout?week=1&day=2");
  });

  it("doesn't start the new workout if settling the unfinished one fails", async () => {
    db.getWorkoutOverview.mockResolvedValue({ unfinished: unfinishedUpper, completed: [] });
    db.completeSession.mockRejectedValue(new Error("offline"));
    await renderPage();
    fireEvent.click(tile(/Push/));
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Save it & start" })); });
    expect(screen.getByRole("alert")).toHaveTextContent("Couldn't start the workout");
    expect(router.push).not.toHaveBeenCalled();
  });

  it("resumes the unfinished day straight away", async () => {
    db.getWorkoutOverview.mockResolvedValue({ unfinished: unfinishedUpper, completed: [] });
    await renderPage();
    fireEvent.click(tile(/In progress/));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(router.push).toHaveBeenCalledWith("/workout?week=1&day=0");
  });
});

describe("Program page — header", () => {
  it("leads back to Profile, which it is opened from", async () => {
    await renderPage();
    expect(screen.getByRole("link", { name: "Back to Profile" })).toHaveAttribute("href", "/profile");
  });

  it("leaves Settings and sign-out to Profile", async () => {
    await renderPage();
    expect(screen.queryByRole("link", { name: "Settings" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Sign out" })).toBeNull();
  });

  it("no longer loads preferences or weigh-ins: those are the Settings page's", async () => {
    await renderPage();
    expect(db.getPreferences).not.toHaveBeenCalled();
    expect(db.getLatestBodyWeight).not.toHaveBeenCalled();
  });
});

describe("Program page — loading", () => {
  it("explains instead of loading forever when the first load fails", async () => {
    db.getWorkoutOverview.mockRejectedValue(new Error("offline"));
    render(<MyProgram />);
    expect(await screen.findByText(/Couldn't load your program/)).toBeInTheDocument();
  });
});
