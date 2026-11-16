import { describe, it, expect } from "vitest";
import type { BodyWeightLog } from "@/lib/types";
import { bodyWeightOn, setLoadKg, weeklyVolume, sessionVolumes, volumeChangePercent, type VolumeSet, type SessionSet } from "@/lib/volume";

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
  const flags = { bench: plain, "db-row": perSide, "pull-up": bodyweight };

  it("applies each set's load and groups by program week", () => {
    const result = weeklyVolume(
      [set("bench", 100, 5, 1), set("db-row", 30, 10, 1), set("pull-up", 0, 10, 2)],
      flags,
      [log("2026-10-01", 80)],
    );
    expect(result).toEqual({ weeks: [{ week: 1, volume: 1100 }, { week: 2, volume: 800 }], missingBodyWeight: false });
  });

  it("uses the body weight of the day each set was done", () => {
    const logs = [log("2026-10-01", 80), log("2026-11-01", 85)];
    const result = weeklyVolume(
      [set("pull-up", 0, 10, 1, "2026-10-20T10:00:00Z"), set("pull-up", 0, 10, 5, "2026-11-10T10:00:00Z")],
      flags,
      logs,
    );
    expect(result.weeks).toEqual([{ week: 1, volume: 800 }, { week: 5, volume: 850 }]);
  });

  it("flags bodyweight sets counted without a body weight", () => {
    expect(weeklyVolume([set("pull-up", 5, 10, 1)], flags, [])).toEqual({ weeks: [{ week: 1, volume: 50 }], missingBodyWeight: true });
    expect(weeklyVolume([set("bench", 100, 5, 1)], flags, []).missingBodyWeight).toBe(false);
  });

  it("treats an exercise missing from the catalogue as plain", () => {
    expect(weeklyVolume([set("retired", 20, 10, 1)], flags, []).weeks).toEqual([{ week: 1, volume: 200 }]);
  });
});

describe("sessionVolumes", () => {
  const set = (sessionId: string, exerciseId: string, weightKg: number, reps: number, loggedAt: string): SessionSet =>
    ({ sessionId, exerciseId, weightKg, reps, loggedAt });
  const flags = { bench: plain, row: perSide, "pull-up": bodyweight };

  it("sums each exercise's sets per session, oldest session first", () => {
    const sets = [
      set("s2", "bench", 100, 5, "2026-11-12T10:05:00Z"),
      set("s1", "bench", 90, 5, "2026-11-05T10:00:00Z"),
      set("s2", "bench", 100, 5, "2026-11-12T10:00:00Z"),
      set("s1", "row", 20, 10, "2026-11-05T10:30:00Z"),
    ];
    expect(sessionVolumes(sets, flags, [])).toEqual({
      bench: [{ date: "2026-11-05", volume: 450 }, { date: "2026-11-12", volume: 1000 }],
      row: [{ date: "2026-11-05", volume: 400 }], // per side: 2 × 20 × 10
    });
  });

  it("adds the body weight known at each set to bodyweight exercises", () => {
    const sets = [set("s1", "pull-up", 0, 10, "2026-10-20T10:00:00Z"), set("s2", "pull-up", 0, 10, "2026-11-12T10:00:00Z")];
    const logs = [log("2026-10-01", 82), log("2026-11-01", 79)];
    expect(sessionVolumes(sets, flags, logs)["pull-up"].map((p) => p.volume)).toEqual([820, 790]);
  });

  it("counts a bodyweight set by its added weight alone when no weigh-in exists", () => {
    expect(sessionVolumes([set("s1", "pull-up", 10, 8, "2026-11-12T10:00:00Z")], flags, [])["pull-up"][0].volume).toBe(80);
  });

  it("treats an exercise with unknown flags as plain", () => {
    expect(sessionVolumes([set("s1", "mystery", 50, 4, "2026-11-12T10:00:00Z")], {}, []).mystery[0].volume).toBe(200);
  });

  it("is empty with no sets", () => {
    expect(sessionVolumes([], flags, [])).toEqual({});
  });
});

describe("volumeChangePercent", () => {
  const series = (...volumes: number[]) => volumes.map((volume, i) => ({ date: `2026-11-0${i + 1}`, volume }));

  it("compares the latest session with the one before, rounded", () => {
    expect(volumeChangePercent(series(900, 1000, 1080))).toBe(8);
    expect(volumeChangePercent(series(1000, 750))).toBe(-25);
    expect(volumeChangePercent(series(1000, 1000))).toBe(0);
  });

  it("is null without a previous session, or when the previous volume was zero", () => {
    expect(volumeChangePercent([])).toBeNull();
    expect(volumeChangePercent(series(1000))).toBeNull();
    expect(volumeChangePercent(series(0, 500))).toBeNull();
  });
});
