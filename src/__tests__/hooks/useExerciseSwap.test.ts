import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useState } from "react";
import type { Exercise, WorkoutSession } from "@/lib/types";

const db = vi.hoisted(() => ({ saveExerciseSwaps: vi.fn() }));
vi.mock("@/lib/db", () => db);

import { useExerciseSwap } from "@/hooks/useExerciseSwap";

const alt = (id: string, name: string) => ({ id, name, alternates: [] }) as unknown as Exercise;
const bench = { id: "bench", name: "Bench Press", alternates: [alt("db-bench", "DB Bench"), alt("machine", "Machine Press")] } as unknown as Exercise;
const session = (exerciseSwaps: Record<string, string> = {}) => ({ id: "sess-1", exerciseSwaps }) as WorkoutSession;

/** The hook needs the session held in state by its caller, like the workout page does. */
function setup({ swaps = {}, defaults = {} as Record<string, string>, setDefault = vi.fn().mockResolvedValue(undefined) } = {}) {
  const hook = renderHook(() => {
    const [current, setCurrent] = useState<WorkoutSession | null>(session(swaps));
    return { current, ...useExerciseSwap({ session: current, setSession: setCurrent, defaults, setDefaultAlternate: setDefault }) };
  });
  return { ...hook, setDefault };
}

type Harness = ReturnType<typeof setup>["result"];

/** Opens the swap for Bench Press and picks `chosenId` in the sheet, as the workout page does. */
async function choose(result: Harness, chosenId: string, makeDefault: boolean) {
  act(() => result.current.openSwap(bench));
  await act(() => result.current.swapSheet!.onChoose(chosenId, makeDefault));
}

beforeEach(() => {
  vi.clearAllMocks();
  db.saveExerciseSwaps.mockResolvedValue(undefined);
});

describe("useExerciseSwap — which exercise to do", () => {
  it("uses the saved defaults", () => {
    const { result } = setup({ defaults: { bench: "db-bench" } });
    expect(result.current.choices).toEqual({ bench: "db-bench" });
  });

  it("lets this workout's swap win over a default", () => {
    const { result } = setup({ defaults: { bench: "db-bench" }, swaps: { bench: "machine" } });
    expect(result.current.choices).toEqual({ bench: "machine" });
  });
});

describe("useExerciseSwap — choosing", () => {
  it("swaps for this workout only: saves it on the session, not as a default", async () => {
    const { result, setDefault } = setup();

    await choose(result, "db-bench", false);

    expect(db.saveExerciseSwaps).toHaveBeenCalledWith("sess-1", { bench: "db-bench" });
    expect(result.current.current?.exerciseSwaps).toEqual({ bench: "db-bench" });
    expect(result.current.choices).toEqual({ bench: "db-bench" });
    expect(setDefault).not.toHaveBeenCalled();
  });

  it("keeps the workout's other swaps when one more is made", async () => {
    const { result } = setup({ swaps: { row: "cable-row" } });
    await choose(result, "db-bench", false);
    expect(db.saveExerciseSwaps).toHaveBeenCalledWith("sess-1", { row: "cable-row", bench: "db-bench" });
  });

  it("also saves it as the default when asked", async () => {
    const { result, setDefault } = setup();
    await choose(result, "db-bench", true);
    expect(setDefault).toHaveBeenCalledExactlyOnceWith("bench", "db-bench");
  });

  it("reverts and rejects when the swap can't be saved, without touching the default", async () => {
    db.saveExerciseSwaps.mockRejectedValue(new Error("offline"));
    const { result, setDefault } = setup();

    act(() => result.current.openSwap(bench));
    await act(async () => {
      await expect(result.current.swapSheet!.onChoose("db-bench", true)).rejects.toThrow("offline");
    });

    expect(result.current.current?.exerciseSwaps).toEqual({});
    expect(setDefault).not.toHaveBeenCalled();
  });

  it("keeps today's saved swap when only the default couldn't be saved, so a retry can finish the job", async () => {
    const { result } = setup({ setDefault: vi.fn().mockRejectedValue(new Error("offline")) });

    act(() => result.current.openSwap(bench));
    await act(async () => {
      await expect(result.current.swapSheet!.onChoose("db-bench", true)).rejects.toThrow("offline");
    });

    expect(result.current.current?.exerciseSwaps).toEqual({ bench: "db-bench" });
  });
});

describe("useExerciseSwap — the swap sheet", () => {
  it("is closed until a slot's swap is opened, then describes that slot", () => {
    const { result } = setup({ defaults: { bench: "machine" }, swaps: { bench: "db-bench" } });
    expect(result.current.swapSheet).toBeNull();

    act(() => result.current.openSwap(bench));

    expect(result.current.swapSheet).toMatchObject({ currentId: "db-bench", defaultId: "machine" });
    expect(result.current.swapSheet?.options.map((o) => o.id)).toEqual(["bench", "db-bench", "machine"]);
  });

  it("offers the slot's own exercise as current and default when nothing is chosen", () => {
    const { result } = setup();
    act(() => result.current.openSwap(bench));
    expect(result.current.swapSheet).toMatchObject({ currentId: "bench", defaultId: "bench" });
  });

  it("chooses for the slot it was opened for, and closes", async () => {
    const { result } = setup();
    act(() => result.current.openSwap(bench));

    await act(() => result.current.swapSheet!.onChoose("machine", false));
    expect(db.saveExerciseSwaps).toHaveBeenCalledWith("sess-1", { bench: "machine" });

    act(() => result.current.swapSheet!.onClose());
    expect(result.current.swapSheet).toBeNull();
  });
});
