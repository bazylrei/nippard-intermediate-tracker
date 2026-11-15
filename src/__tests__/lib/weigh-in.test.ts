import { describe, it, expect, beforeEach } from "vitest";
import type { BodyWeightLog } from "@/lib/types";
import { isWeighInDue, skipWeighInThisWeek } from "@/lib/weigh-in";

const logged = (loggedOn: string): BodyWeightLog => ({ loggedOn, weightKg: 80, source: "manual" });
const wednesday = new Date(2026, 10, 18, 9); // weeks starting Monday: this week began 2026-11-16

beforeEach(() => localStorage.clear());

describe("isWeighInDue", () => {
  it("is due before the first weigh-in ever", () => {
    expect(isWeighInDue(null, wednesday, 1)).toBe(true);
  });

  it("is due when the last weigh-in was before this week started", () => {
    expect(isWeighInDue(logged("2026-11-15"), wednesday, 1)).toBe(true);
  });

  it("isn't due once you've weighed in this week, including on its first day", () => {
    expect(isWeighInDue(logged("2026-11-16"), wednesday, 1)).toBe(false);
    expect(isWeighInDue(logged("2026-11-18"), wednesday, 1)).toBe(false);
  });

  it("follows the chosen first day of the week", () => {
    // Sunday-start week began 2026-11-15, so a Sunday weigh-in counts.
    expect(isWeighInDue(logged("2026-11-15"), wednesday, 0)).toBe(false);
  });

  it("stays hidden for the rest of a skipped week, then comes back next week", () => {
    skipWeighInThisWeek(wednesday, 1);
    expect(isWeighInDue(null, wednesday, 1)).toBe(false);
    expect(isWeighInDue(null, new Date(2026, 10, 22), 1)).toBe(false); // Sunday, same week
    expect(isWeighInDue(null, new Date(2026, 10, 23), 1)).toBe(true); // next Monday
  });
});
