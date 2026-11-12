import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import type { SetLog, WorkoutSession } from "@/lib/types";

const router = vi.hoisted(() => ({ replace: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));
vi.mock("@/lib/auth", () => ({ getSignedInUser: vi.fn().mockResolvedValue({ id: "user-1" }) }));
vi.mock("@/context/ProgramContext", () => ({ useProgramContext: () => ({ program: [] }) }));

const db = vi.hoisted(() => ({
  getWorkoutDetail: vi.fn(),
  getAllExercises: vi.fn(),
  getPreferences: vi.fn(),
  updateSetLog: vi.fn(),
  deleteSetLog: vi.fn(),
  deleteExerciseSetsFromSession: vi.fn(),
  updateExerciseIdForSets: vi.fn(),
  addSetsToSession: vi.fn(),
  deleteWorkoutSession: vi.fn(),
}));
vi.mock("@/lib/db", () => db);

import { cacheSet } from "@/lib/cache";
import WorkoutDetail from "@/components/workout-detail/WorkoutDetail";
import { parseNewSets } from "@/components/workout-detail/AddExerciseForm";

const session = {
  id: "sess-1", week: 3, dayType: "push", completedAt: "2026-11-10T18:00:00Z",
} as WorkoutSession;
const set = (id: string, exerciseId: string, setIndex: number, weight = 100) =>
  ({ id, exerciseId, setIndex, weight, reps: 8, rpe: null }) as SetLog;

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  db.getAllExercises.mockResolvedValue([
    { id: "bench", name: "Bench Press", muscleGroup: "chest", warmupProtocol: "none" },
    { id: "dips", name: "Dips", muscleGroup: "chest", warmupProtocol: "none" },
  ]);
  db.getWorkoutDetail.mockResolvedValue({
    session,
    sets: [set("w", "bench", -1, 40), set("a", "bench", 0), set("b", "bench", 1, 105)],
  });
  db.getPreferences.mockResolvedValue({ unit: "kg", alternateSelections: {}, exerciseNotes: {} });
  db.updateSetLog.mockResolvedValue(undefined);
  db.updateExerciseIdForSets.mockResolvedValue(undefined);
  db.deleteWorkoutSession.mockResolvedValue(undefined);
});

async function renderDetail(onExit = vi.fn()) {
  render(<WorkoutDetail sessionId="sess-1" onExit={onExit} />);
  await screen.findByText("Push — Hypertrophy");
  await screen.findByText("Bench Press");
  return onExit;
}

describe("WorkoutDetail — viewing", () => {
  it("shows the workout summary and working sets only (no warm-ups)", async () => {
    await renderDetail();
    expect(screen.getByText(/Week 3/)).toBeInTheDocument();
    expect(screen.getByText("1 exercises · 2 sets")).toBeInTheDocument();
    expect(screen.getByText("100kg × 8 reps")).toBeInTheDocument();
    expect(screen.getByText("105kg × 8 reps")).toBeInTheDocument();
    expect(screen.queryByText("40kg × 8 reps")).toBeNull();
  });

  it("is read-only until Edit is pressed", async () => {
    await renderDetail();
    expect(screen.queryByLabelText("Edit set 1")).toBeNull();
    expect(screen.queryByText("Delete workout")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /Edit/ }));
    expect(screen.getByLabelText("Edit set 1")).toBeInTheDocument();
    expect(screen.getByText("Delete workout")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Done/ }));
    expect(screen.queryByLabelText("Edit set 1")).toBeNull();
  });

  it("explains when the workout can't be found", async () => {
    db.getWorkoutDetail.mockResolvedValue(null);
    render(<WorkoutDetail sessionId="nope" onExit={vi.fn()} />);
    expect(await screen.findByText(/doesn't exist/)).toBeInTheDocument();
  });

  it("Back exits the page", async () => {
    const onExit = await renderDetail();
    fireEvent.click(screen.getByLabelText("Back"));
    expect(onExit).toHaveBeenCalled();
  });
});

describe("WorkoutDetail — editing", () => {
  it("edits a set and keeps its RPE", async () => {
    db.getWorkoutDetail.mockResolvedValue({ session, sets: [{ ...set("a", "bench", 0), rpe: 9 }] });
    await renderDetail();
    fireEvent.click(screen.getByRole("button", { name: /Edit/ }));
    fireEvent.click(screen.getByLabelText("Edit set 1"));
    fireEvent.change(screen.getByLabelText("Weight (kg)"), { target: { value: "102.5" } });
    fireEvent.change(screen.getByLabelText("Reps"), { target: { value: "7" } });
    fireEvent.click(screen.getByLabelText("Save set"));
    expect(await screen.findByText("102.5kg × 7 reps")).toBeInTheDocument();
    expect(db.updateSetLog).toHaveBeenCalledWith("a", 102.5, 7, 9);
  });

  it("shows an alert and keeps the editor open when a save fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    db.updateSetLog.mockRejectedValue(new Error("offline"));
    await renderDetail();
    fireEvent.click(screen.getByRole("button", { name: /Edit/ }));
    fireEvent.click(screen.getByLabelText("Edit set 1"));
    fireEvent.click(screen.getByLabelText("Save set"));
    expect(await screen.findByRole("alert")).toHaveTextContent("Couldn't save that set");
    expect(screen.getByLabelText("Weight (kg)")).toBeInTheDocument();
  });

  it("swaps an exercise via the picker", async () => {
    await renderDetail();
    fireEvent.click(screen.getByRole("button", { name: /Edit/ }));
    fireEvent.click(screen.getByLabelText("Change Bench Press"));
    fireEvent.click(screen.getByRole("button", { name: "Dips" }));
    await waitFor(() => expect(db.updateExerciseIdForSets).toHaveBeenCalledWith("sess-1", "bench", "dips"));
    expect(await screen.findByRole("region", { name: "Dips" })).toBeInTheDocument();
  });

  it("deletes the workout after confirmation, then exits", async () => {
    const onExit = await renderDetail();
    fireEvent.click(screen.getByRole("button", { name: /Edit/ }));
    fireEvent.click(screen.getByText("Delete workout"));
    const confirm = screen.getByText(/Delete this workout/).parentElement!;
    fireEvent.click(within(confirm).getByRole("button", { name: "Delete" }));
    await waitFor(() => expect(onExit).toHaveBeenCalled());
    expect(db.deleteWorkoutSession).toHaveBeenCalledWith("sess-1");
  });

  it("does not exit when deleting fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    db.deleteWorkoutSession.mockRejectedValue(new Error("offline"));
    const onExit = await renderDetail();
    fireEvent.click(screen.getByRole("button", { name: /Edit/ }));
    fireEvent.click(screen.getByText("Delete workout"));
    const confirm = screen.getByText(/Delete this workout/).parentElement!;
    fireEvent.click(within(confirm).getByRole("button", { name: "Delete" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Couldn't delete the workout");
    expect(onExit).not.toHaveBeenCalled();
  });
});

describe("WorkoutDetail — lbs users", () => {
  beforeEach(() => {
    db.getPreferences.mockResolvedValue({ unit: "lbs", alternateSelections: {}, exerciseNotes: {} });
  });

  it("shows weights in lbs once the preference loads", async () => {
    await renderDetail();
    expect(await screen.findByText("220.5lbs × 8 reps")).toBeInTheDocument(); // 100kg
  });

  it("uses the cached unit straight away", async () => {
    cacheSet("prefs", { unit: "lbs", alternateSelections: {}, exerciseNotes: {} });
    db.getPreferences.mockReturnValue(new Promise(() => {})); // never resolves
    await renderDetail();
    expect(screen.getByText("220.5lbs × 8 reps")).toBeInTheDocument();
  });

  it("edits in lbs and stores kg", async () => {
    await renderDetail();
    await screen.findByText("220.5lbs × 8 reps");
    fireEvent.click(screen.getByRole("button", { name: /Edit/ }));
    fireEvent.click(screen.getByLabelText("Edit set 1"));
    const input = screen.getByLabelText("Weight (lbs)");
    expect(input).toHaveValue(220.5);
    fireEvent.change(input, { target: { value: "225" } });
    fireEvent.click(screen.getByLabelText("Save set"));
    await waitFor(() => expect(db.updateSetLog).toHaveBeenCalled());
    const [, kg] = db.updateSetLog.mock.calls[0];
    expect(kg).toBeCloseTo(225 / 2.20462, 6);
  });
});

describe("parseNewSets", () => {
  it("keeps only rows with a positive weight and reps", () => {
    expect(parseNewSets([
      { weight: "20", reps: "10" },
      { weight: "", reps: "10" },
      { weight: "0", reps: "5" },
      { weight: "15.5", reps: "abc" },
    ], "kg")).toEqual([{ weight: 20, reps: 10 }]);
  });

  it("converts lbs to kg", () => {
    const [row] = parseNewSets([{ weight: "45", reps: "10" }], "lbs");
    expect(row.weight).toBeCloseTo(45 / 2.20462, 6);
  });
});
