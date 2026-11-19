import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@/test-utils/render";
import type { BuilderExercise, BuilderProgram } from "@/lib/types";

const router = vi.hoisted(() => ({ replace: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));
vi.mock("@/lib/auth", () => ({ onAuthUserChange: () => () => {}, getSignedInUser: vi.fn().mockResolvedValue({ id: "user-1" }) }));

const db = vi.hoisted(() => ({
  toggleProgramPublic: vi.fn(), getBuilderProgram: vi.fn(), getAllExercises: vi.fn(),
  addProgramDay: vi.fn(), updateProgramDayExercise: vi.fn(), updateProgram: vi.fn(), addProgramWeek: vi.fn(),
  addExerciseToDay: vi.fn(), duplicateProgramWeek: vi.fn(), deleteProgramDayExercise: vi.fn(),
  deleteProgramDay: vi.fn(), deleteProgramWeek: vi.fn(),
}));
vi.mock("@/lib/db", () => db);

import { useProgramEditor } from "@/hooks/useProgramEditor";

const exercise = (pdeId: string, name = "Bench"): BuilderExercise => ({
  pdeId, exerciseId: "bench", name, position: 0, repRangeMin: 8, repRangeMax: 12, earlySetCount: 3, lastSetCount: 1,
  earlySetRpeMin: 7, earlySetRpeMax: 8, lastSetRpeMin: null, lastSetRpeMax: null, lastSetTarget: "failure", warmupProtocol: "none",
});
const day = (pdId: string, week: number, dayIndex: number, exercises: BuilderExercise[] = []) =>
  ({ pdId, week, dayIndex, dayType: "push", exercises });
const base = (): BuilderProgram => ({
  id: "prog-1", name: "Plan", description: null, category: null, isPublic: false, createdBy: "user-1", totalWeeks: 2, userCount: 1,
  days: [day("d1", 1, 0, [exercise("e1")]), day("d2", 2, 0)],
});

async function loaded(program: BuilderProgram | null = base()) {
  db.getBuilderProgram.mockResolvedValue(program);
  const hook = renderHook(() => useProgramEditor("prog-1"));
  await waitFor(() => expect(hook.result.current.status).not.toBe("loading"));
  return hook;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
  db.getAllExercises.mockResolvedValue([{ id: "squat", name: "Squat", muscleGroup: "quads", warmupProtocol: "heavy" }]);
  for (const fn of ["toggleProgramPublic", "updateProgramDayExercise", "updateProgram", "addProgramWeek", "deleteProgramDayExercise", "deleteProgramDay", "deleteProgramWeek"] as const) {
    db[fn].mockResolvedValue(undefined);
  }
});

describe("loading", () => {
  it("is ready with the program and the exercise catalogue, and lets its creator edit", async () => {
    const { result } = await loaded();
    expect(result.current.status).toBe("ready");
    expect(result.current.canEdit).toBe(true);
    expect(result.current.allExercises).toHaveLength(1);
  });

  it("says when the program doesn't exist, or can't be loaded", async () => {
    expect((await loaded(null)).result.current.status).toBe("not-found");
    db.getBuilderProgram.mockRejectedValue(new Error("offline"));
    const { result } = renderHook(() => useProgramEditor("prog-1"));
    await waitFor(() => expect(result.current.status).toBe("failed"));
  });

  it("doesn't let anyone but the creator edit", async () => {
    const { result } = await loaded({ ...base(), createdBy: "someone-else" });
    expect(result.current.canEdit).toBe(false);
  });
});

describe("weeks", () => {
  it("adds a week and returns its number", async () => {
    const { result } = await loaded();
    let week: number | null = null;
    await act(async () => { week = await result.current.actions.addWeek(); });
    expect(week).toBe(3);
    expect(db.addProgramWeek).toHaveBeenCalledWith("prog-1", 3);
    expect(result.current.program?.totalWeeks).toBe(3);
  });

  it("copies a week to a new last week and ignores a second copy while one is running", async () => {
    let finish!: (days: BuilderProgram["days"]) => void;
    db.duplicateProgramWeek.mockReturnValue(new Promise((resolve) => { finish = resolve; }));
    const { result } = await loaded();
    let first!: Promise<number | null>;
    act(() => { first = result.current.actions.duplicateWeek(1); });
    expect(result.current.duplicatingWeek).toBe(1);
    await act(async () => { expect(await result.current.actions.duplicateWeek(2)).toBeNull(); });
    expect(db.duplicateProgramWeek).toHaveBeenCalledTimes(1);

    await act(async () => { finish([day("d3", 3, 0)]); await first; });
    expect(db.duplicateProgramWeek).toHaveBeenCalledWith("prog-1", 1, 3, 3);
    expect(result.current.program).toMatchObject({ totalWeeks: 3 });
    expect(result.current.program?.days).toHaveLength(3);
    expect(result.current.duplicatingWeek).toBeNull();
  });

  it("deleting the last week shrinks the program; a middle one doesn't", async () => {
    const { result } = await loaded();
    await act(async () => { await result.current.actions.deleteWeek(1); });
    expect(result.current.program?.totalWeeks).toBe(2);
    await act(async () => { await result.current.actions.deleteWeek(2); });
    expect(result.current.program).toMatchObject({ totalWeeks: 1, days: [] });
  });

  it("marks what is being deleted while it is, and clears it after a failure too", async () => {
    let fail!: (e: Error) => void;
    db.deleteProgramWeek.mockReturnValue(new Promise((_, reject) => { fail = reject; }));
    const { result } = await loaded();
    let deleting!: Promise<boolean>;
    act(() => { deleting = result.current.actions.deleteWeek(2); });
    expect(result.current.deletingKey).toBe("week:2");
    await act(async () => { fail(new Error("offline")); expect(await deleting).toBe(false); });
    expect(result.current.deletingKey).toBeNull();
    expect(result.current.program?.days).toHaveLength(2); // untouched
    expect(result.current.saveError.message).toMatch(/Couldn't delete the week/);
  });
});

describe("exercises", () => {
  it("shows a newly chosen exercise's name after saving it", async () => {
    const { result } = await loaded();
    await act(async () => { expect(await result.current.actions.saveExercise("e1", { exerciseId: "squat", repRangeMin: 5 })).toBe(true); });
    expect(db.updateProgramDayExercise).toHaveBeenCalledWith("e1", expect.objectContaining({ exerciseId: "squat", repRangeMin: 5 }));
    expect(result.current.program?.days[0].exercises[0]).toMatchObject({ name: "Squat", exerciseId: "squat", repRangeMin: 5 });
  });

  it("leaves the exercise as it was when saving it fails", async () => {
    db.updateProgramDayExercise.mockRejectedValue(new Error("offline"));
    const { result } = await loaded();
    await act(async () => { expect(await result.current.actions.saveExercise("e1", { repRangeMin: 5 })).toBe(false); });
    expect(result.current.program?.days[0].exercises[0].repRangeMin).toBe(8);
  });

  it("appends an exercise at the end of the day and returns it", async () => {
    db.addExerciseToDay.mockResolvedValue(exercise("e2", "Squat"));
    const { result } = await loaded();
    let created: BuilderExercise | null = null;
    await act(async () => { created = await result.current.actions.addExercise("d1", "squat"); });
    expect(db.addExerciseToDay).toHaveBeenCalledWith("d1", "squat", "Squat", "heavy", 1);
    expect(created).toMatchObject({ pdeId: "e2" });
    expect(result.current.program?.days[0].exercises.map((e) => e.pdeId)).toEqual(["e1", "e2"]);
  });

  it("adds nothing for a day or exercise that isn't there", async () => {
    const { result } = await loaded();
    await act(async () => { expect(await result.current.actions.addExercise("nope", "squat")).toBeNull(); });
    await act(async () => { expect(await result.current.actions.addExercise("d1", "nope")).toBeNull(); });
    expect(db.addExerciseToDay).not.toHaveBeenCalled();
  });

  it("removes a deleted exercise from its day", async () => {
    const { result } = await loaded();
    await act(async () => { await result.current.actions.deleteExercise("e1"); });
    expect(result.current.program?.days[0].exercises).toEqual([]);
  });
});

describe("program details", () => {
  it("saves the details and shows them", async () => {
    const { result } = await loaded();
    await act(async () => { expect(await result.current.actions.updateDetails({ name: "Renamed" })).toBe(true); });
    expect(db.updateProgram).toHaveBeenCalledWith("prog-1", { name: "Renamed" });
    expect(result.current.program?.name).toBe("Renamed");
  });

  it("keeps the old details when saving fails", async () => {
    db.updateProgram.mockRejectedValue(new Error("offline"));
    const { result } = await loaded();
    await act(async () => { expect(await result.current.actions.updateDetails({ name: "Renamed" })).toBe(false); });
    expect(result.current.program?.name).toBe("Plan");
  });
});
