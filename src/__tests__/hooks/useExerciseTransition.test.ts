import { describe, it, expect, vi, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import type { Exercise } from "@/lib/types";
import { useExerciseTransition, FINISHED_NOTICE_MS } from "@/hooks/useExerciseTransition";

const exercises = ["bench", "fly", "dip"].map((id) => ({ id, name: id }) as Exercise);

function setup(done: string[] = []) {
  const isDone = (i: number) => done.includes(exercises[i]?.id);
  return renderHook(({ index }) => useExerciseTransition(index, exercises, isDone), { initialProps: { index: 0 } });
}

afterEach(() => { vi.useRealTimers(); });

describe("useExerciseTransition", () => {
  it("has no direction or notice before the first move, so loading doesn't animate", () => {
    expect(setup().result.current).toEqual({ direction: null, finished: null });
  });

  it("moves forward to a later exercise and back to an earlier one", () => {
    const { result, rerender } = setup();
    rerender({ index: 2 });
    expect(result.current.direction).toBe("forward");
    rerender({ index: 1 });
    expect(result.current.direction).toBe("back");
  });

  it("names the exercise just left when it was finished", () => {
    const { result, rerender } = setup(["bench"]);
    rerender({ index: 1 });
    expect(result.current.finished?.name).toBe("bench");
  });

  it("names nothing when the exercise left was skipped unfinished", () => {
    const { result, rerender } = setup();
    rerender({ index: 1 });
    expect(result.current.finished).toBeNull();
  });

  it("drops the notice after a few seconds, keeping the direction", () => {
    vi.useFakeTimers();
    const { result, rerender } = setup(["bench"]);
    rerender({ index: 1 });

    act(() => { vi.advanceTimersByTime(FINISHED_NOTICE_MS); });

    expect(result.current).toEqual({ direction: "forward", finished: null });
  });
});
