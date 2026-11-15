import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, act, within } from "@testing-library/react";
import type { Exercise, SetLog, WorkoutSession } from "@/lib/types";

// ─── Mocks ───────────────────────────────────────────────────────────────────

const router = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn() }));
let query = "week=1&day=0";
vi.mock("next/navigation", () => ({
  useRouter: () => router,
  useSearchParams: () => new URLSearchParams(query),
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

const exercise = (id: string, name: string, warmupProtocol = "none"): Exercise => ({
  id, name, alternates: ["", ""], muscleGroup: "chest", restSeconds: [60, 90],
  warmupProtocol, repRange: [6, 10], earlySetRpe: [7, 8], lastSetTarget: "failure",
  earlySetCount: 1, lastSetCount: 1, formNote: "", isBodyweight: false, weightPerSide: false,
}) as Exercise;

let workoutDay: { dayType: string; exercises: Exercise[] } | null = { dayType: "upper-a", exercises: [exercise("bench", "Bench Press")] };
let programFailed = false;
const WARMUP_STEPS = vi.hoisted(() => ({ none: [], "1-set": ["~60% × 6–10 reps"] }));
// Stable reference: the page memoises on getWorkoutDay.
const getWorkoutDay = () => workoutDay;
vi.mock("@/context/ProgramContext", () => ({
  useProgramContext: () => ({ getWorkoutDay, warmupSteps: WARMUP_STEPS, programId: null, ready: true, failed: programFailed, failureTechniques: {} }),
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
    session, sessionSets: [], recordsByExercise: { bench: { lastSets: [prevSet] } },
    exerciseIndex: 0, setIndex: 0, phase: "sets",
    ...overrides,
  });
}

/** Click and let the async save (and any rollback) settle inside act(). */
async function click(element: HTMLElement) {
  await act(async () => { fireEvent.click(element); });
}

/** The set-carousel slide for the set being logged now. */
function activeSlide() {
  return screen.getByRole("group", { current: true });
}

/** Render and let the page's async bootstrap settle inside act(), so nothing waits on findBy timeouts. */
async function renderPage() {
  await act(async () => { render(<WorkoutPage />); });
  expect(screen.getByText("Skip exercise")).toBeInTheDocument();
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  query = "week=1&day=0";
  programFailed = false;
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
    expect(activeSlide()).toHaveAccessibleName("Set 1 of 2"); // back on the set that failed
    expect(screen.queryByText("Logged")).toBeNull();
  });

  it("advances immediately when a set saves, persisting the next position in the same call", async () => {
    await renderPage();
    await click(screen.getByRole("button", { name: /Log Set/ }));

    expect(activeSlide()).toHaveAccessibleName("Set 2 of 2");
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

// ─── Workout timer ───────────────────────────────────────────────────────────

describe("WorkoutPage — workout timer", () => {
  it("shows how long the session has been going in the header", async () => {
    const now = vi.spyOn(Date, "now").mockReturnValue(new Date("2026-11-15T10:12:30Z").getTime());
    bootWith({ session: { ...session, startedAt: "2026-11-15T10:00:00Z" } });
    await renderPage();
    expect(screen.getByRole("timer", { name: "Workout duration" })).toHaveTextContent("12:30");
    now.mockRestore();
  });
});

// ─── Last time vs best ───────────────────────────────────────────────────────

describe("WorkoutPage — last time and best", () => {
  it("shows the all-time best beside last time when it's heavier", async () => {
    const best = { ...prevSet, id: "b", weight: 110, reps: 6 };
    bootWith({ recordsByExercise: { bench: { lastSets: [prevSet], bestSet: best } } });
    await renderPage();

    expect(within(activeSlide()).getByText("Last time").parentElement).toHaveTextContent("100kg × 8");
    expect(within(activeSlide()).getByText("Best").parentElement).toHaveTextContent("110kg × 6");
  });

  it("shows only last time when that was the best", async () => {
    bootWith({ recordsByExercise: { bench: { lastSets: [prevSet], bestSet: prevSet } } });
    await renderPage();

    expect(within(activeSlide()).getByText("Last time")).toBeInTheDocument();
    expect(within(activeSlide()).queryByText("Best")).toBeNull();
  });
});

// ─── Set carousel ────────────────────────────────────────────────────────────

describe("WorkoutPage — set carousel", () => {
  it("shows the logger on the current set and previews the rest", async () => {
    await renderPage();
    expect(activeSlide()).toHaveAccessibleName("Set 1 of 2");
    expect(within(activeSlide()).getByRole("button", { name: /Log Set/ })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Set 2 of 2" })).toHaveTextContent("6–10 reps");
  });

  it("keeps a logged set swipeable and editable after advancing", async () => {
    await renderPage();
    await click(screen.getByRole("button", { name: /Log Set/ }));

    const firstSet = screen.getByRole("group", { name: "Set 1 of 2" });
    expect(firstSet).toHaveTextContent("100kg × 8");
    await click(within(firstSet).getByRole("button", { name: /View set/ }));
    expect(screen.getByRole("heading", { name: "Set 1" })).toBeInTheDocument(); // SetDetailSheet open
  });

  it("logs the first working set (not a warm-up index) for an exercise with no warm-up", async () => {
    bootWith({ phase: "warmup", setIndex: -1 });
    await renderPage();
    expect(activeSlide()).toHaveAccessibleName("Set 1 of 2");

    await click(screen.getByRole("button", { name: /Log Set/ }));

    expect(db.logSetAndAdvance).toHaveBeenCalledWith(expect.objectContaining({ setIndex: 0, nextSetIndex: 1 }));
    expect(activeSlide()).toHaveAccessibleName("Set 2 of 2");
  });

  it("resumes a partly done exercise at its first unlogged set", async () => {
    const done = { id: "d1", exerciseId: "bench", setIndex: 0, weight: 100, reps: 8, rpe: null } as SetLog;
    bootWith({ phase: "warmup", setIndex: -1, sessionSets: [done] });
    await renderPage();
    expect(activeSlide()).toHaveAccessibleName("Set 2 of 2");

    await click(within(activeSlide()).getByRole("button", { name: /Log Set/ }));

    expect(db.logSetAndAdvance).toHaveBeenCalledWith(expect.objectContaining({ setIndex: 1, completeSession: true }));
  });
});

describe("WorkoutPage — warm-up slide", () => {
  beforeEach(() => {
    workoutDay = { dayType: "upper-a", exercises: [exercise("bench", "Bench Press", "1-set")] };
  });

  it("starts on the warm-up, with the working sets as previews only", async () => {
    bootWith({ phase: "warmup", setIndex: -1 });
    await renderPage();

    expect(activeSlide()).toHaveAccessibleName("Warm-up");
    expect(within(activeSlide()).getByText("~60% × 6–10 reps")).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Set 1 of 2" })).toHaveTextContent("6–10 reps");
    expect(screen.queryByRole("button", { name: /Log Set/ })).toBeNull();
  });

  it("slides to the first working set once the warm-up is done, keeping a recap", async () => {
    bootWith({ phase: "warmup", setIndex: -1 });
    await renderPage();

    await click(screen.getByText("~60% × 6–10 reps"));
    await click(screen.getByRole("button", { name: /Start Working Sets/ }));

    expect(activeSlide()).toHaveAccessibleName("Set 1 of 2");
    expect(within(activeSlide()).getByRole("button", { name: /Log Set/ })).toBeInTheDocument();
    const warmup = screen.getByRole("group", { name: "Warm-up" });
    expect(warmup).toHaveTextContent("Done");
    expect(within(warmup).queryByRole("button")).toBeNull();
    expect(db.updateSessionProgress).toHaveBeenCalledWith("sess-1", 0, 0);
  });

  it("shows the warm-up recap when resuming mid-exercise", async () => {
    await renderPage(); // boots into the sets phase at set 1
    expect(activeSlide()).toHaveAccessibleName("Set 1 of 2");
    expect(screen.getByRole("group", { name: "Warm-up" })).toHaveTextContent("Done");
  });
});

// ─── Starting a workout safely ───────────────────────────────────────────────

describe("WorkoutPage — invalid or failed starts", () => {
  it("does not create a session for a day the program doesn't have", async () => {
    workoutDay = null;
    await act(async () => { render(<WorkoutPage />); });
    expect(screen.getByText("Invalid workout.")).toBeInTheDocument();
    expect(boot.bootstrapWorkout).not.toHaveBeenCalled();
  });

  it("treats a malformed URL as invalid instead of guessing week 1 / day 0", async () => {
    query = "week=abc&day=0";
    await act(async () => { render(<WorkoutPage />); });
    expect(screen.getByText("Invalid workout.")).toBeInTheDocument();
    expect(boot.bootstrapWorkout).not.toHaveBeenCalled();
  });

  it("shows an error instead of loading forever when start-up fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    boot.bootstrapWorkout.mockRejectedValue(new Error("offline"));
    await act(async () => { render(<WorkoutPage />); });
    expect(screen.getByText(/Couldn't start the workout/)).toBeInTheDocument();
  });

  it("explains when the program itself couldn't be loaded", async () => {
    programFailed = true;
    await act(async () => { render(<WorkoutPage />); });
    expect(screen.getByText(/Couldn't load your program/)).toBeInTheDocument();
  });
});
