import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import type { WeekSchedule } from "@/lib/types";

const db = vi.hoisted(() => ({ getAllExercises: vi.fn() }));
vi.mock("@/lib/db", () => db);

const program = [{ week: 1, days: [{ dayType: "push", exercises: [{ id: "bench", name: "Bench (program)" }] }] }] as unknown as WeekSchedule[];
vi.mock("@/context/ProgramContext", () => ({ useProgramContext: () => ({ program }) }));

import { useExerciseCatalog } from "@/hooks/useExerciseCatalog";

beforeEach(() => {
  vi.clearAllMocks();
  db.getAllExercises.mockResolvedValue([
    { id: "bench", name: "Bench (db)", muscleGroup: "chest", warmupProtocol: "none" },
    { id: "curl", name: "Curl", muscleGroup: "biceps", warmupProtocol: "none" },
  ]);
});

describe("useExerciseCatalog", () => {
  it("merges DB and program names, program winning, sorted by name", async () => {
    const { result } = renderHook(() => useExerciseCatalog());
    await waitFor(() => expect(result.current.options).toHaveLength(2));
    expect(result.current.nameOf("bench")).toBe("Bench (program)");
    expect(result.current.options.map((o) => o.name)).toEqual(["Bench (program)", "Curl"]);
  });

  it("falls back to the id for an unknown exercise, and to program names if the DB call fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    db.getAllExercises.mockRejectedValue(new Error("offline"));
    const { result } = renderHook(() => useExerciseCatalog());
    await waitFor(() => expect(console.error).toHaveBeenCalled());
    expect(result.current.nameOf("bench")).toBe("Bench (program)");
    expect(result.current.nameOf("mystery")).toBe("mystery");
  });
});
