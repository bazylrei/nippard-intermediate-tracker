import { describe, it, expect } from "vitest";
import { DAY_TYPE_PRESETS, dayLabel } from "@/lib/day-types";

describe("dayLabel", () => {
  it("labels the Nippard days by focus", () => {
    expect(dayLabel("upper-a")).toBe("Upper — Strength");
    expect(dayLabel("back-biceps")).toBe("Pull — Hypertrophy");
  });

  it("labels the builder's other presets (previously blank outside the builder)", () => {
    expect(dayLabel("pull")).toBe("Pull");
    expect(dayLabel("full-body")).toBe("Full Body");
  });

  it("shows a custom day type as typed", () => {
    expect(dayLabel("Arms & Abs")).toBe("Arms & Abs");
  });

  it("has no duplicate preset keys", () => {
    const keys = DAY_TYPE_PRESETS.map((p) => p.value);
    expect(new Set(keys).size).toBe(keys.length);
  });
});
