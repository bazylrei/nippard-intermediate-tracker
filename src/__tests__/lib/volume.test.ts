import { describe, it, expect } from "vitest";
import type { BodyWeightLog } from "@/lib/types";
import { bodyWeightOn, setLoadKg, weeklyVolume, type VolumeSet, type WeeklyVolume } from "@/lib/volume";

const plain = { weightPerSide: false, isBodyweight: false };
const perSide = { weightPerSide: true, isBodyweight: false };
const bodyweight = { weightPerSide: false, isBodyweight: true };
const log = (loggedOn: string, weightKg: number): BodyWeightLog => ({ loggedOn, weightKg, source: "manual" });

describe("setLoadKg", () => {
  it("is the logged weight for a plain exercise", () => {
    expect(setLoadKg(100, plain, 80)).toBe(100);
  });

  it("doubles a per-side (dumbbell) weight", () => {
    expect(setLoadKg(32.5, perSide, null)).toBe(65);
  });

  it("adds body weight to a bodyweight exercise's added weight", () => {
    expect(setLoadKg(10, bodyweight, 80)).toBe(90);
    expect(setLoadKg(0, bodyweight, 80)).toBe(80);
  });

  it("counts only the added weight when body weight is unknown", () => {
    expect(setLoadKg(10, bodyweight, null)).toBe(10);
  });
});

describe("bodyWeightOn", () => {
  const logs = [log("2026-10-01", 82), log("2026-10-15", 80), log("2026-11-01", 79)];

  it("uses the latest weigh-in on or before the date", () => {
    expect(bodyWeightOn(logs, "2026-10-20")).toBe(80);
    expect(bodyWeightOn(logs, "2026-11-01")).toBe(79); // same day counts
  });

  it("uses the first weigh-in for dates before any (the closest known)", () => {
    expect(bodyWeightOn(logs, "2026-09-01")).toBe(82);
  });

  it("is null with no weigh-ins", () => {
    expect(bodyWeightOn([], "2026-10-20")).toBeNull();
  });
});

describe("weeklyVolume", () => {
  const set = (exerciseId: string, weightKg: number, reps: number, week: number, loggedAt = "2026-10-20T10:00:00Z"): VolumeSet =>
    ({ exerciseId, weightKg, reps, week, loggedAt });
  const exercises = {
    bench: { ...plain, muscleGroup: "chest" },
    "db-row": { ...perSide, muscleGroup: "back" },
    "pull-up": { ...bodyweight, muscleGroup: "back" },
    curl: { ...plain, muscleGroup: "biceps" },
    pushdown: { ...plain, muscleGroup: "triceps" },
    squat: { ...plain, muscleGroup: "quads" },
  };
  /** Just each week's total. */
  const totals = (result: WeeklyVolume) => result.weeks.map(({ week, volume }) => ({ week, volume }));

  it("applies each set's load and groups by program week", () => {
    const result = weeklyVolume(
      [set("bench", 100, 5, 1), set("db-row", 30, 10, 1), set("pull-up", 0, 10, 2)],
      exercises,
      [log("2026-10-01", 80)],
    );
    expect(totals(result)).toEqual([{ week: 1, volume: 1100 }, { week: 2, volume: 800 }]);
    expect(result.missingBodyWeight).toBe(false);
  });

  it("splits each week by body region, folding muscle groups into their region", () => {
    const result = weeklyVolume(
      [set("bench", 100, 5, 1), set("db-row", 30, 10, 1), set("curl", 20, 10, 1), set("pushdown", 25, 10, 1), set("squat", 120, 5, 1)],
      exercises,
      [],
    );
    expect(result.weeks[0]).toEqual({
      week: 1,
      volume: 2150,
      byRegion: { chest: 500, back: 600, shoulders: 0, arms: 450, legs: 600, core: 0, other: 0 },
    });
  });

  it("uses the body weight of the day each set was done", () => {
    const logs = [log("2026-10-01", 80), log("2026-11-01", 85)];
    const result = weeklyVolume(
      [set("pull-up", 0, 10, 1, "2026-10-20T10:00:00Z"), set("pull-up", 0, 10, 5, "2026-11-10T10:00:00Z")],
      exercises,
      logs,
    );
    expect(totals(result)).toEqual([{ week: 1, volume: 800 }, { week: 5, volume: 850 }]);
  });

  it("flags bodyweight sets counted without a body weight", () => {
    const result = weeklyVolume([set("pull-up", 5, 10, 1)], exercises, []);
    expect(totals(result)).toEqual([{ week: 1, volume: 50 }]);
    expect(result.missingBodyWeight).toBe(true);
    expect(weeklyVolume([set("bench", 100, 5, 1)], exercises, []).missingBodyWeight).toBe(false);
  });

  it("treats an exercise missing from the catalogue as plain, under Other", () => {
    const [week] = weeklyVolume([set("retired", 20, 10, 1)], exercises, []).weeks;
    expect(week.volume).toBe(200);
    expect(week.byRegion.other).toBe(200);
  });
});
