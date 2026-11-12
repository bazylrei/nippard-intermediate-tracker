import { describe, it, expect } from "vitest";
import { estimateOneRm, getSessionNumber, getTotalSessions } from "@/lib/program-data";

describe("estimateOneRm", () => {
  it("returns weight unchanged when reps is 0", () => {
    expect(estimateOneRm(100, 0)).toBe(100);
  });

  it("calculates correctly for 100kg at 10 reps", () => {
    // Math.round(100 * (1 + 10/30)) = Math.round(100 * 1.333...) = Math.round(133.33...) = 133
    expect(estimateOneRm(100, 10)).toBe(133);
  });

  it("calculates correctly for 80kg at 15 reps", () => {
    // Math.round(80 * (1 + 15/30)) = Math.round(80 * 1.5) = 120
    expect(estimateOneRm(80, 15)).toBe(120);
  });

  it("calculates correctly for 60kg at 5 reps", () => {
    // Math.round(60 * (1 + 5/30)) = Math.round(60 * 1.1666...) = Math.round(70.0) = 70
    expect(estimateOneRm(60, 5)).toBe(70);
  });

  it("handles single rep (1RM itself)", () => {
    // Math.round(100 * (1 + 1/30)) = Math.round(103.33) = 103
    expect(estimateOneRm(100, 1)).toBe(103);
  });
});

describe("getSessionNumber", () => {
  it("returns 1 for week 1, day 0", () => {
    expect(getSessionNumber(1, 0)).toBe(1);
  });

  it("returns 5 for week 1, day 4", () => {
    expect(getSessionNumber(1, 4)).toBe(5);
  });

  it("returns 6 for week 2, day 0", () => {
    expect(getSessionNumber(2, 0)).toBe(6);
  });

  it("returns 60 for week 12, day 4 (last session)", () => {
    expect(getSessionNumber(12, 4)).toBe(60);
  });

  it("returns 11 for week 2, day 4", () => {
    expect(getSessionNumber(2, 4)).toBe(10);
  });
});

describe("getTotalSessions", () => {
  it("returns 60", () => {
    expect(getTotalSessions()).toBe(60);
  });
});

describe("invariant: last session matches total sessions", () => {
  it("getSessionNumber(12, 4) equals getTotalSessions()", () => {
    expect(getSessionNumber(12, 4)).toBe(getTotalSessions());
  });
});
