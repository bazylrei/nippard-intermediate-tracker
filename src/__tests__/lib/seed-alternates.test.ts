import { describe, it, expect } from "vitest";
import { planAlternates, type ExerciseSeedRow } from "../../../scripts/alternate-exercises";
import { PROGRAM } from "../../../scripts/program-data-static";

const main = (id: string, name: string): ExerciseSeedRow =>
  ({ id, name, muscle_group: "chest", rest_min: 90, rest_max: 120, warmup_protocol: "3-set", form_note: null });
const slot = (alternates: [string, string], over = {}) =>
  ({ muscleGroup: "chest", restSeconds: [90, 120] as [number, number], warmupProtocol: "3-set", alternates, ...over });
const program = (...slots: ReturnType<typeof slot>[]) => [{ days: [{ exercises: slots }] }];

describe("planAlternates", () => {
  it("creates an exercise for an alternate that isn't one yet, inheriting from the slot that lists it", () => {
    const { rows } = planAlternates(
      program(slot(["DB Bench Press", "Machine Press"], { muscleGroup: "chest", restSeconds: [120, 180], warmupProtocol: "2-set" })),
      [main("bench", "Barbell Bench Press")],
    );
    expect(rows[0]).toEqual({
      id: "alt-db-bench-press", name: "DB Bench Press", muscle_group: "chest", rest_min: 120, rest_max: 180,
      warmup_protocol: "2-set", form_note: null,
    });
    expect(rows.map((r) => r.id)).toEqual(["alt-db-bench-press", "alt-machine-press"]);
  });

  it("points an alternate that names a program exercise at that exercise, case-insensitively, creating nothing", () => {
    const { alternateId, rows } = planAlternates(program(slot(["pec deck", "Cable Fly"])), [main("pec-deck", "Pec Deck"), main("fly", "Cable Fly")]);
    expect(alternateId("pec deck")).toBe("pec-deck");
    expect(alternateId("Cable Fly")).toBe("fly");
    expect(rows).toEqual([]);
  });

  it("creates a shared alternate once, from the first slot that lists it", () => {
    const { rows } = planAlternates(
      program(slot(["Goblet Squat", "Leg Press"], { restSeconds: [60, 90] }), slot(["Goblet Squat", "Hack Squat"], { restSeconds: [180, 240] })),
      [],
    );
    expect(rows.filter((r) => r.name === "Goblet Squat")).toHaveLength(1);
    expect(rows.find((r) => r.name === "Goblet Squat")).toMatchObject({ rest_min: 60, rest_max: 90 });
  });

  it("builds ids from names the way migration 009 does", () => {
    const { alternateId } = planAlternates(program(slot(["45° Incline Machine Press", "Overhead Cable Triceps Extension (Rope)"])), []);
    expect(alternateId("45° Incline Machine Press")).toBe("alt-45-incline-machine-press");
    expect(alternateId("Overhead Cable Triceps Extension (Rope)")).toBe("alt-overhead-cable-triceps-extension-rope");
  });

  it("ignores an empty alternate", () => {
    expect(planAlternates(program(slot(["", "Machine Press"])), []).rows.map((r) => r.name)).toEqual(["Machine Press"]);
  });

  it("covers the real program: every alternate resolves to an exercise, and none is its own exercise", () => {
    const seen = new Set<string>();
    const mains: ExerciseSeedRow[] = [];
    for (const week of PROGRAM) for (const day of week.days) for (const ex of day.exercises) {
      if (seen.has(ex.id)) continue;
      seen.add(ex.id);
      mains.push({ id: ex.id, name: ex.name, muscle_group: ex.muscleGroup, rest_min: ex.restSeconds[0], rest_max: ex.restSeconds[1], warmup_protocol: ex.warmupProtocol, form_note: null });
    }
    const { alternateId, rows } = planAlternates(PROGRAM, mains);
    const ids = new Set([...mains, ...rows].map((r) => r.id));
    for (const week of PROGRAM) for (const day of week.days) for (const ex of day.exercises) {
      const [alt1, alt2] = ex.alternates.map(alternateId);
      expect(ids.has(alt1) && ids.has(alt2)).toBe(true);
      expect(alt1).not.toBe(ex.id);
      expect(alt2).not.toBe(ex.id);
      expect(alt1).not.toBe(alt2);
    }
  });
});
