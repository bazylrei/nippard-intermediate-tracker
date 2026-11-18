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
  saveExerciseSwaps: vi.fn(),
  getExerciseHistory: vi.fn().mockResolvedValue([]),
  getLatestBodyWeight: vi.fn().mockResolvedValue(null),
}));
vi.mock("@/lib/db", () => db);

const boot = vi.hoisted(() => ({ bootstrapWorkout: vi.fn(), beginWorkout: vi.fn() }));
vi.mock("@/lib/workout-init", () => boot);

const rest = vi.hoisted(() => ({ isActive: false, remaining: 0, total: 0, start: vi.fn(), stop: vi.fn() }));
vi.mock("@/context/RestTimerContext", () => ({ useRestTimer: () => rest }));

/** An alternate is an exercise of its own, with the slot's sets and reps. */
const alternate = (id: string, name: string, warmupProtocol: string) => ({
  id, name, alternates: [], muscleGroup: "chest", restSeconds: [60, 90], warmupProtocol, repRange: [6, 10], earlySetRpe: [7, 8],
  lastSetTarget: "failure", earlySetCount: 1, lastSetCount: 1, formNote: "", isBodyweight: false, weightPerSide: false,
}) as unknown as Exercise;
const exercise = (id: string, name: string, warmupProtocol = "none"): Exercise => ({
  id, name, alternates: [alternate(`${id}-db`, `${name} (DB)`, warmupProtocol), alternate(`${id}-machine`, `${name} (Machine)`, warmupProtocol)],
  muscleGroup: "chest", restSeconds: [60, 90],
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

import WorkoutPage from "@/app/(workout)/workout/page";

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
  Object.assign(rest, { isActive: false, remaining: 0, total: 0 });
  query = "week=1&day=0";
  programFailed = false;
  workoutDay = { dayType: "upper-a", exercises: [exercise("bench", "Bench Press")] };
  bootWith();
  for (const fn of [db.updateSessionProgress, db.completeSession, db.logSetAndAdvance, db.deleteWorkoutSession, db.saveExerciseSwaps]) {
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

// ─── Resuming at the right place ─────────────────────────────────────────────

describe("WorkoutPage — a new workout starts only when begun", () => {
  async function renderOverview() {
    bootWith({ session: null, phase: "overview" });
    await act(async () => { render(<WorkoutPage />); });
  }

  it("opens on the overview without creating a session", async () => {
    await renderOverview();
    expect(screen.getByRole("button", { name: /Begin Workout/ })).toBeInTheDocument();
    expect(boot.beginWorkout).not.toHaveBeenCalled();
  });

  it("offers a different workout instead", async () => {
    await renderOverview();
    expect(screen.getByRole("link", { name: "Choose a different workout" })).toHaveAttribute("href", "/program");
  });

  it("creates the session on Begin and goes into the workout", async () => {
    boot.beginWorkout.mockResolvedValue(session);
    await renderOverview();
    await click(screen.getByRole("button", { name: /Begin Workout/ }));

    expect(boot.beginWorkout).toHaveBeenCalledWith(expect.objectContaining({ userId: "user-1", week: 1, dayIndex: 0, dayType: "upper-a" }));
    expect(screen.getByText("Skip exercise")).toBeInTheDocument();
  });

  it("creates one session however often Begin is tapped", async () => {
    let resolve: (s: WorkoutSession) => void = () => {};
    boot.beginWorkout.mockReturnValue(new Promise((r) => { resolve = r; }));
    await renderOverview();
    const begin = screen.getByRole("button", { name: /Begin Workout/ });
    fireEvent.click(begin);
    fireEvent.click(begin);
    await act(async () => { resolve(session); });
    expect(boot.beginWorkout).toHaveBeenCalledTimes(1);
  });

  it("stays on the overview and says so when the session can't be created", async () => {
    boot.beginWorkout.mockRejectedValue(new Error("offline"));
    await renderOverview();
    await click(screen.getByRole("button", { name: /Begin Workout/ }));

    expect(screen.getByText("Couldn't start the workout. Try again.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Begin Workout/ })).toBeEnabled();
  });
});

describe("WorkoutPage — finishing early", () => {
  beforeEach(() => {
    workoutDay = { dayType: "upper-a", exercises: [exercise("bench", "Bench Press"), exercise("fly", "Cable Fly")] };
  });

  it("can't finish before anything is logged", async () => {
    await renderPage();
    expect(screen.queryByRole("button", { name: "Finish workout" })).toBeNull();
  });

  it("finishes with only some exercises done, showing the done screen", async () => {
    bootWith({ sessionSets: [{ id: "w1", exerciseId: "bench", setIndex: 0, weight: 100, reps: 8, rpe: null }] });
    await renderPage();
    await click(screen.getByRole("button", { name: "Finish workout" }));
    expect(screen.getByText("Finish now with 1 set logged?")).toBeInTheDocument();
    await click(screen.getByRole("button", { name: "Finish" }));

    expect(await screen.findByText("Workout Complete!")).toBeInTheDocument();
    expect(db.completeSession).toHaveBeenCalledWith("sess-1");
    expect(localStorage.getItem("workout_cache_active_workout")).toBeNull();
  });

  it("stops a running rest timer once the workout is finished", async () => {
    bootWith({ sessionSets: [{ id: "w1", exerciseId: "bench", setIndex: 0, weight: 100, reps: 8, rpe: null }] });
    Object.assign(rest, { isActive: true, remaining: 40, total: 90 });
    await renderPage();
    expect(rest.stop).not.toHaveBeenCalled();

    await click(screen.getByRole("button", { name: "Finish workout" }));
    await click(screen.getByRole("button", { name: "Finish" }));

    expect(await screen.findByText("Workout Complete!")).toBeInTheDocument();
    expect(rest.stop).toHaveBeenCalled();
  });

  it("stays on the workout and says so when finishing fails", async () => {
    db.completeSession.mockRejectedValue(new Error("offline"));
    bootWith({ sessionSets: [{ id: "w1", exerciseId: "bench", setIndex: 0, weight: 100, reps: 8, rpe: null }] });
    await renderPage();
    await click(screen.getByRole("button", { name: "Finish workout" }));
    await click(screen.getByRole("button", { name: "Finish" }));

    expect(screen.queryByText("Workout Complete!")).toBeNull();
    expect(screen.getByText("Couldn't finish the workout. Try again.")).toBeInTheDocument();
  });
});

describe("WorkoutPage — skipping saves the next exercise's warm-up, not its first set", () => {
  it("saves the warm-up position (-1) so leaving and coming back resumes in the warm-up", async () => {
    workoutDay = { dayType: "upper-a", exercises: [exercise("bench", "Bench Press"), exercise("fly", "Cable Fly", "1-set")] };
    await renderPage();

    await click(screen.getByText("Skip exercise"));

    expect(db.updateSessionProgress).toHaveBeenCalledWith("sess-1", 1, -1);
    expect(activeSlide()).toHaveAccessibleName("Warm-up");
  });
});

describe("WorkoutPage — going back to an exercise from the list", () => {
  const benchSet = { id: "d1", exerciseId: "bench", setIndex: 0, weight: 100, reps: 8, rpe: null } as SetLog;

  async function pickFromList(name: string) {
    await click(screen.getByRole("button", { name: "Exercise list" }));
    await click(screen.getByRole("button", { name: new RegExp(name) }));
  }

  beforeEach(() => {
    workoutDay = { dayType: "upper-a", exercises: [exercise("bench", "Bench Press", "1-set"), exercise("fly", "Cable Fly", "1-set")] };
  });

  it("returns to a started exercise at its next set, not the warm-up already done", async () => {
    bootWith({ exerciseIndex: 1, setIndex: -1, phase: "warmup", sessionSets: [benchSet] });
    await renderPage();

    await pickFromList("Bench Press");

    expect(activeSlide()).toHaveAccessibleName("Set 2 of 2");
    expect(db.updateSessionProgress).toHaveBeenCalledWith("sess-1", 0, 1);
  });

  it("opens an exercise with nothing logged at its warm-up", async () => {
    bootWith({ sessionSets: [benchSet] });
    await renderPage();

    await pickFromList("Cable Fly");

    expect(activeSlide()).toHaveAccessibleName("Warm-up");
    expect(db.updateSessionProgress).toHaveBeenCalledWith("sess-1", 1, -1);
  });
});

describe("WorkoutPage — moving to the next exercise is visible", () => {
  const panel = (name: string) => screen.getByRole("region", { name });

  beforeEach(() => {
    workoutDay = { dayType: "upper-a", exercises: [exercise("bench", "Bench Press"), exercise("fly", "Cable Fly")] };
  });

  it("doesn't animate the first exercise on load", async () => {
    await renderPage();
    expect(panel("Bench Press").className).not.toMatch(/exercise-enter/);
  });

  it("slides the next exercise in and says the last one is done after its final set", async () => {
    const first = { id: "d1", exerciseId: "bench", setIndex: 0, weight: 100, reps: 8, rpe: null } as SetLog;
    bootWith({ setIndex: 1, sessionSets: [first] });
    await renderPage();

    await click(screen.getByRole("button", { name: /Log Set/ }));

    expect(screen.getByRole("status")).toHaveTextContent("Bench Press done · Up next");
    expect(panel("Cable Fly")).toHaveClass("exercise-enter-forward");
  });

  it("slides in without a done notice when an unfinished exercise is skipped", async () => {
    await renderPage();

    await click(screen.getByText("Skip exercise"));

    expect(panel("Cable Fly")).toHaveClass("exercise-enter-forward");
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("slides in from the other side when going back to an earlier exercise", async () => {
    bootWith({ exerciseIndex: 1 });
    await renderPage();

    await click(screen.getByRole("button", { name: "Exercise list" }));
    await click(screen.getByRole("button", { name: /Bench Press/ }));

    expect(panel("Bench Press")).toHaveClass("exercise-enter-back");
  });
});

describe("WorkoutPage — resting doesn't hide what's next", () => {
  it("puts the rest bar in the flow above the header, so the exercise list stays reachable", async () => {
    Object.assign(rest, { isActive: true, remaining: 75, total: 90 });
    workoutDay = { dayType: "upper-a", exercises: [exercise("bench", "Bench Press"), exercise("fly", "Cable Fly")] };
    await renderPage();

    const timer = screen.getByRole("timer", { name: "Rest remaining" });
    const listButton = screen.getByRole("button", { name: "Exercise list" });
    expect(timer.closest(".fixed")).toBeNull();
    expect(timer.compareDocumentPosition(listButton) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    await click(listButton);
    expect(screen.getByRole("button", { name: /Cable Fly/ })).toBeInTheDocument();
  });
});

// ─── Swapping to an alternate ────────────────────────────────────────────────

describe("WorkoutPage — swapping to an alternate exercise", () => {
  const heading = (name: string) => screen.getByRole("heading", { name });

  async function swapTo(name: RegExp | string, { makeDefault = false } = {}) {
    await click(screen.getByRole("button", { name: "Swap exercise" }));
    await click(screen.getByRole("radio", { name }));
    if (makeDefault) await click(screen.getByRole("checkbox"));
    await click(screen.getByRole("button", { name: /^Use / }));
  }

  it("swaps for this workout only: the new exercise is shown, saved on the session, and not made a default", async () => {
    await renderPage();

    await swapTo(/Bench Press \(DB\)/);

    expect(heading("Bench Press (DB)")).toBeInTheDocument();
    expect(screen.getByText("Instead of Bench Press")).toBeInTheDocument();
    expect(db.saveExerciseSwaps).toHaveBeenCalledWith("sess-1", { bench: "bench-db" });
    expect(db.upsertPreferences).not.toHaveBeenCalled();
  });

  it("logs the sets under the alternate's own id, so its history stays its own", async () => {
    await renderPage();
    await swapTo(/Bench Press \(DB\)/);

    // The alternate has no history yet, so nothing is pre-filled.
    const [weight, reps] = screen.getAllByRole("spinbutton");
    fireEvent.change(weight, { target: { value: "40" } });
    fireEvent.change(reps, { target: { value: "12" } });
    await click(screen.getByRole("button", { name: /Log Set/ }));

    expect(db.logSetAndAdvance).toHaveBeenCalledWith(expect.objectContaining({ exerciseId: "bench-db", setIndex: 0, weight: 40, reps: 12 }));
  });

  it("shows the alternate's own last time after a swap, not the main exercise's", async () => {
    const dbPrev = { ...prevSet, id: "q", exerciseId: "bench-db", weight: 40, reps: 12 };
    bootWith({ recordsByExercise: { bench: { lastSets: [prevSet] }, "bench-db": { lastSets: [dbPrev] } } });
    await renderPage();
    expect(within(activeSlide()).getByText("Last time").parentElement).toHaveTextContent("100kg × 8");

    await swapTo(/Bench Press \(DB\)/);

    expect(within(activeSlide()).getByText("Last time").parentElement).toHaveTextContent("40kg × 12");
  });

  it("saves the swap as the default for future workouts too when asked", async () => {
    await renderPage();

    await swapTo(/Bench Press \(Machine\)/, { makeDefault: true });

    expect(db.saveExerciseSwaps).toHaveBeenCalledWith("sess-1", { bench: "bench-machine" });
    expect(db.upsertPreferences).toHaveBeenCalledWith("user-1", { alternateSelections: { bench: "bench-machine" } });
  });

  it("starts on the saved default, and a swap back to the main exercise overrides it for today only", async () => {
    bootWith({ prefs: { unit: "kg", alternateSelections: { bench: "bench-db" }, exerciseNotes: {} } });
    await renderPage();
    expect(heading("Bench Press (DB)")).toBeInTheDocument();

    await swapTo("Bench Press");

    expect(heading("Bench Press")).toBeInTheDocument();
    expect(db.saveExerciseSwaps).toHaveBeenCalledWith("sess-1", { bench: "bench" });
    expect(db.upsertPreferences).not.toHaveBeenCalled(); // the saved default is untouched
  });

  it("resumes a workout on the exercise swapped in earlier", async () => {
    bootWith({ session: { ...session, exerciseSwaps: { bench: "bench-machine" } } });
    await renderPage();
    expect(heading("Bench Press (Machine)")).toBeInTheDocument();
  });

  it("stays on the original and says so when the swap can't be saved", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    db.saveExerciseSwaps.mockRejectedValue(new Error("offline"));
    await renderPage();
    await click(screen.getByRole("button", { name: "Swap exercise" }));
    await click(screen.getByRole("radio", { name: /Bench Press \(DB\)/ }));

    await click(screen.getByRole("button", { name: /^Use / }));

    expect(screen.getByRole("alert")).toHaveTextContent("Couldn't switch exercise");
    expect(heading("Bench Press")).toBeInTheDocument();
  });

  it("can't be swapped once a set has been logged for the exercise", async () => {
    await renderPage();
    expect(screen.getByRole("button", { name: "Swap exercise" })).toBeInTheDocument();

    await click(screen.getByRole("button", { name: /Log Set/ }));

    expect(screen.queryByRole("button", { name: "Swap exercise" })).toBeNull();
  });
});

// ─── Leaving the workout ─────────────────────────────────────────────────────

describe("WorkoutPage — no back button (the tab bar leaves the workout)", () => {
  it("has no go-home button in the workout header, only Discard", async () => {
    await renderPage();
    expect(screen.queryByTitle("Go home")).toBeNull();
    expect(screen.getByTitle("Discard workout")).toBeInTheDocument();
  });

  it("has no back button on the overview, only Begin Workout", async () => {
    bootWith({ phase: "overview" });
    await act(async () => { render(<WorkoutPage />); });
    expect(screen.getAllByRole("button").map((b) => b.textContent)).toEqual(["Begin Workout"]);
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

  it("shows the sets only in the carousel, with no separate row of set tiles above it", async () => {
    await renderPage();
    expect(screen.queryByText("Sets")).toBeNull(); // the old tiles row's label
    expect(screen.getAllByRole("group", { name: /^Set \d of 2$/ })).toHaveLength(2); // one slide per set

    await click(screen.getByRole("button", { name: /Log Set/ }));
    // A logged set stays reachable from its carousel card, not from a tile.
    expect(within(screen.getByRole("group", { name: "Set 1 of 2" })).getByRole("button", { name: /Edit set/ })).toBeInTheDocument();
  });

  it("keeps a logged set swipeable and editable after advancing", async () => {
    await renderPage();
    await click(screen.getByRole("button", { name: /Log Set/ }));

    const firstSet = screen.getByRole("group", { name: "Set 1 of 2" });
    expect(firstSet).toHaveTextContent("100kg × 8");
    await click(within(firstSet).getByRole("button", { name: /Edit set/ }));
    expect(screen.getByRole("heading", { name: "Set 1" })).toBeInTheDocument(); // SetEditSheet open…
    expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument(); // …straight in edit mode, no read-only step
  });

  it("edits a logged set in place: the sheet closes and the card shows the new numbers", async () => {
    db.updateSetLog.mockResolvedValue(undefined);
    await renderPage();
    await click(screen.getByRole("button", { name: /Log Set/ }));

    await click(within(screen.getByRole("group", { name: "Set 1 of 2" })).getByRole("button", { name: /Edit set/ }));
    const inputs = screen.getAllByRole("spinbutton"); // the sheet is last: [weight, reps]
    fireEvent.change(inputs[inputs.length - 2], { target: { value: "105" } });
    await click(screen.getByRole("button", { name: /Save/ }));

    expect(db.updateSetLog).toHaveBeenCalledWith(expect.any(String), 105, 8, null);
    expect(screen.queryByRole("heading", { name: "Set 1" })).toBeNull();
    expect(screen.getByRole("group", { name: "Set 1 of 2" })).toHaveTextContent("105kg × 8");
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
    expect(screen.getByText(/Couldn't load the workout/)).toBeInTheDocument();
  });

  it("explains when the program itself couldn't be loaded", async () => {
    programFailed = true;
    await act(async () => { render(<WorkoutPage />); });
    expect(screen.getByText(/Couldn't load your program/)).toBeInTheDocument();
  });
});
