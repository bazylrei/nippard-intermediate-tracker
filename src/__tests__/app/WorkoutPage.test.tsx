import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import type { Exercise, SetLog, WorkoutSession } from "@/lib/types";

// ─── Mocks ───────────────────────────────────────────────────────────────────

const router = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => router,
  useSearchParams: () => new URLSearchParams("week=1&day=0"),
}));

const db = vi.hoisted(() => ({
  updateSessionProgress: vi.fn(),
  completeSession: vi.fn(),
  logSetAndAdvance: vi.fn(),
  deleteWorkoutSession: vi.fn(),
  updateSetLog: vi.fn(),
  saveExerciseNote: vi.fn(),
  upsertPreferences: vi.fn(),
  getExerciseHistory: vi.fn().mockResolvedValue([]),
}));
vi.mock("@/lib/db", () => db);

const boot = vi.hoisted(() => ({ bootstrapWorkout: vi.fn() }));
vi.mock("@/lib/workout-init", () => boot);

vi.mock("@/context/RestTimerContext", () => ({ useRestTimer: () => ({ start: vi.fn() }) }));

const exercise = (id: string, name: string): Exercise => ({
  id, name, alternates: ["", ""], muscleGroup: "chest", restSeconds: [60, 90],
  warmupProtocol: "none", repRange: [6, 10], earlySetRpe: [7, 8], lastSetTarget: "failure",
  earlySetCount: 1, lastSetCount: 1, formNote: "", isBodyweight: false, weightPerSide: false,
}) as Exercise;

let workoutDay = { dayType: "upper-a", exercises: [exercise("bench", "Bench Press")] };
// Stable reference: the page memoises on getWorkoutDay.
const getWorkoutDay = () => workoutDay;
vi.mock("@/context/ProgramContext", () => ({
  useProgramContext: () => ({ getWorkoutDay, warmupSteps: {}, programId: null, ready: true, failureTechniques: {} }),
}));

import WorkoutPage from "@/app/workout/page";

const session: WorkoutSession = {
  id: "sess-1", userId: "user-1", programId: null, week: 1, dayIndex: 0, dayType: "upper-a",
  startedAt: "", completedAt: null, currentExerciseIndex: 0, currentSetIndex: 0,
};
const prevSet = { id: "p", exerciseId: "bench", setIndex: 0, weight: 100, reps: 8, rpe: null } as SetLog;

function bootWith(overrides: Record<string, unknown> = {}) {
  boot.bootstrapWorkout.mockResolvedValue({
    userId: "user-1",
    prefs: { unit: "kg", alternateSelections: {}, exerciseNotes: {} },
    session, sessionSets: [], prevSetsByExercise: { bench: [prevSet] },
    exerciseIndex: 0, setIndex: 0, phase: "sets",
    ...overrides,
  });
}

/** Click and let the async save (and any rollback) settle inside act(). */
async function click(element: HTMLElement) {
  await act(async () => { fireEvent.click(element); });
}

/** Render and let the page's async bootstrap settle inside act(), so nothing waits on findBy timeouts. */
async function renderPage() {
  await act(async () => { render(<WorkoutPage />); });
  expect(screen.getByText("Skip exercise")).toBeInTheDocument();
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  workoutDay = { dayType: "upper-a", exercises: [exercise("bench", "Bench Press")] };
  bootWith();
  for (const fn of [db.updateSessionProgress, db.completeSession, db.logSetAndAdvance, db.deleteWorkoutSession]) {
    fn.mockResolvedValue(undefined);
  }
});

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("WorkoutPage save failures are visible, never silent", () => {
  it("rolls back a logged set and shows an error when saving it fails", async () => {
    db.logSetAndAdvance.mockRejectedValue(new Error("offline"));
    await renderPage();

    await click(screen.getByRole("button", { name: /Log Set/ }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Couldn't save that set");
    expect(screen.getByText("Set 1")).toBeInTheDocument(); // back on the set that failed
  });

  it("advances immediately when a set saves, persisting the next position in the same call", async () => {
    await renderPage();
    await click(screen.getByRole("button", { name: /Log Set/ }));

    expect(await screen.findByText("Set 2")).toBeInTheDocument();
    expect(db.logSetAndAdvance).toHaveBeenCalledWith(expect.objectContaining({
      sessionId: "sess-1", exerciseId: "bench", setIndex: 0, nextExerciseIndex: 0, nextSetIndex: 1, completeSession: false,
    }));
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("stays on the workout when finishing via Skip fails", async () => {
    db.completeSession.mockRejectedValue(new Error("offline"));
    await renderPage();

    await click(screen.getByText("Skip exercise"));

    expect(await screen.findByRole("alert")).toHaveTextContent("Couldn't finish the workout");
    expect(screen.queryByText("Workout Complete!")).toBeNull();
  });

  it("finishes and clears the active-workout banner when Skip completes the last exercise", async () => {
    await renderPage();
    await click(screen.getByText("Skip exercise"));

    expect(await screen.findByText("Workout Complete!")).toBeInTheDocument();
    expect(db.completeSession).toHaveBeenCalledWith("sess-1");
    expect(localStorage.getItem("workout_cache_active_workout")).toBeNull();
  });

  it("does not leave the page when discarding fails", async () => {
    db.deleteWorkoutSession.mockRejectedValue(new Error("offline"));
    await renderPage();

    await click(screen.getByTitle("Discard workout"));
    await click(screen.getByRole("button", { name: "Discard" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Couldn't discard the workout");
    expect(router.push).not.toHaveBeenCalled();
  });

  it("moves to the next exercise even if saving the position fails, and says so", async () => {
    workoutDay = { dayType: "upper-a", exercises: [exercise("bench", "Bench Press"), exercise("fly", "Cable Fly")] };
    db.updateSessionProgress.mockRejectedValue(new Error("offline"));
    await renderPage();

    await click(screen.getByText("Skip exercise"));

    await waitFor(() => expect(screen.getAllByText("Cable Fly").length).toBeGreaterThan(0));
    expect(await screen.findByRole("alert")).toHaveTextContent("Couldn't save your place");
  });
});
