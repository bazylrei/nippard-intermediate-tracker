import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

const router = vi.hoisted(() => ({ replace: vi.fn(), push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router, useSearchParams: () => new URLSearchParams() }));
vi.mock("@/lib/auth", () => ({ getSignedInUser: vi.fn().mockResolvedValue({ id: "user-1" }) }));

const db = vi.hoisted(() => ({
  getLoggedExerciseIds: vi.fn(), getWeeklyVolume: vi.fn(), getExerciseHistory: vi.fn(), logBodyWeight: vi.fn(),
}));
vi.mock("@/lib/db", () => db);
vi.mock("@/hooks/useExerciseCatalog", () => ({ useExerciseCatalog: () => ({ options: [{ id: "bench", name: "Bench Press" }] }) }));
vi.mock("@/hooks/useWeightUnit", () => ({ useWeightUnit: () => "kg" }));
const startNextWorkout = vi.hoisted(() => vi.fn());
vi.mock("@/hooks/useStartNextWorkout", () => ({ useStartNextWorkout: () => startNextWorkout }));
const followed = vi.hoisted(() => ({ programId: "p1" as string | null, ready: true }));
vi.mock("@/context/ProgramContext", () => ({ useProgramContext: () => followed }));

import ProgressPage from "@/app/(main)/progress/page";

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("ResizeObserver", class { observe() {} disconnect() {} });
  followed.programId = "p1";
  followed.ready = true;
  db.getLoggedExerciseIds.mockResolvedValue([]);
  db.getWeeklyVolume.mockResolvedValue({ weeks: [], missingBodyWeight: false });
  db.getExerciseHistory.mockResolvedValue([]);
});

describe("Progress — before anything is logged", () => {
  it("says what will show here instead of empty tabs", async () => {
    render(<ProgressPage />);
    expect(await screen.findByRole("heading", { name: "Your progress shows up here" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Volume" })).toBeNull();
  });

  it("following a program, starts its next workout, or offers another program", async () => {
    render(<ProgressPage />);
    fireEvent.click(await screen.findByRole("button", { name: /Start a workout/ }));
    expect(startNextWorkout).toHaveBeenCalled();
    expect(screen.getByRole("link", { name: "Choose a different program" })).toHaveAttribute("href", "/programs");
  });

  it("following none, offers to browse programs or create one", async () => {
    followed.programId = null;
    render(<ProgressPage />);
    expect(await screen.findByRole("link", { name: /Browse programs/ })).toHaveAttribute("href", "/programs");
    expect(screen.getByRole("link", { name: /Create your own/ })).toHaveAttribute("href", "/programs?new=1");
    expect(screen.queryByRole("button", { name: /Start a workout/ })).toBeNull();
  });

  it("doesn't ask to choose a program while the followed one is still loading", async () => {
    followed.programId = null;
    followed.ready = false;
    render(<ProgressPage />);
    expect(await screen.findByRole("button", { name: /Start a workout/ })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Browse programs/ })).toBeNull();
  });
});

describe("Progress — once something is logged", () => {
  it("shows the tabs and charts, not the empty state", async () => {
    db.getLoggedExerciseIds.mockResolvedValue(["bench"]);
    render(<ProgressPage />);
    expect(await screen.findByRole("combobox", { name: "Exercise" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Your progress shows up here" })).toBeNull();
    expect(screen.getByRole("button", { name: "Volume" })).toBeInTheDocument();
  });
});
