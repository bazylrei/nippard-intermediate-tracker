import { describe, it, expect } from "vitest";
import type { SetLog } from "@/lib/types";
import { overloadTip } from "@/lib/progression";

const last = (weight: number, reps: number) => ({ weight, reps }) as SetLog;

describe("overloadTip", () => {
  it("suggests 2.5kg more once last time reached the top of the rep range", () => {
    expect(overloadTip(last(80, 10), [6, 10], "kg")).toEqual({ reps: 10, suggestedWeight: 82.5 });
  });

  it("also fires when last time went past the top of the range", () => {
    expect(overloadTip(last(80, 12), [6, 10], "kg")).toEqual({ reps: 12, suggestedWeight: 82.5 });
  });

  it("stays quiet while there's still room to add reps", () => {
    expect(overloadTip(last(80, 9), [6, 10], "kg")).toBeNull();
  });

  it("stays quiet without a last time", () => {
    expect(overloadTip(undefined, [6, 10], "kg")).toBeNull();
  });

  it("steps up 5lbs from the displayed lbs weight", () => {
    // 80kg shows as 176.25lbs (rounded to 0.25)
    expect(overloadTip(last(80, 10), [6, 10], "lbs")).toEqual({ reps: 10, suggestedWeight: 181.25 });
  });

  it("stays quiet when a later set last time was already heavier than the suggestion", () => {
    // Set 1 topped out at 80kg, but set 2 was done at 85kg: 82.5kg would be a step down.
    const session = [last(80, 10), last(85, 8)];
    expect(overloadTip(session[0], [6, 10], "kg", session)).toBeNull();
  });

  it("still fires for the heaviest set of last time", () => {
    const session = [last(80, 10), last(85, 10)];
    expect(overloadTip(session[1], [6, 10], "kg", session)).toEqual({ reps: 10, suggestedWeight: 87.5 });
  });
});
