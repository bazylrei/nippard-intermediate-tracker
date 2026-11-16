import { describe, it, expect } from "vitest";
import type { Exercise } from "@/lib/types";
import { chooseExercise, exerciseOptions, mergeChoices, parseExerciseChoices } from "@/lib/alternates";

const alt = (id: string, name: string) => ({ id, name, alternates: [] }) as unknown as Exercise;
const bench = { id: "bench", name: "Bench Press", alternates: [alt("db-bench", "DB Bench"), alt("machine", "Machine Press")] } as unknown as Exercise;

describe("parseExerciseChoices", () => {
  it("keeps entries that map an exercise to another exercise", () => {
    expect(parseExerciseChoices({ bench: "db-bench", row: "cable-row" })).toEqual({ bench: "db-bench", row: "cable-row" });
  });

  it("ignores the old position / boolean format and other junk, rather than guessing at it", () => {
    expect(parseExerciseChoices({ bench: 2, row: 0, curl: true, press: false, fly: null, dip: "", ok: "ok-id" })).toEqual({ ok: "ok-id" });
  });

  it("returns nothing for data that isn't a map", () => {
    for (const raw of [null, undefined, "bench", 3, ["bench"]]) expect(parseExerciseChoices(raw)).toEqual({});
  });
});

describe("mergeChoices", () => {
  it("lets this workout's swaps win over the saved defaults, without changing either", () => {
    const defaults = { bench: "db-bench", row: "cable-row" };
    const todays = { bench: "bench" };
    expect(mergeChoices(defaults, todays)).toEqual({ bench: "bench", row: "cable-row" });
    expect(defaults).toEqual({ bench: "db-bench", row: "cable-row" });
    expect(todays).toEqual({ bench: "bench" });
  });
});

describe("exerciseOptions", () => {
  it("lists the slot's own exercise first, then its alternates", () => {
    expect(exerciseOptions(bench).map((e) => e.id)).toEqual(["bench", "db-bench", "machine"]);
  });

  it("is just the exercise when it has no alternates", () => {
    expect(exerciseOptions(alt("curl", "Curl")).map((e) => e.id)).toEqual(["curl"]);
  });
});

describe("chooseExercise", () => {
  it("is the slot's own exercise when nothing is chosen", () => {
    expect(chooseExercise(bench, {})).toBe(bench);
  });

  it("is the chosen alternate, as its own exercise", () => {
    expect(chooseExercise(bench, { bench: "machine" }).id).toBe("machine");
  });

  it("is the slot's own exercise when its own id is chosen (overriding a saved default for today)", () => {
    expect(chooseExercise(bench, { bench: "bench" })).toBe(bench);
  });

  it("ignores a choice this slot doesn't offer", () => {
    expect(chooseExercise(bench, { bench: "some-other-exercise" })).toBe(bench);
  });

  it("ignores choices made for other exercises", () => {
    expect(chooseExercise(bench, { row: "cable-row" })).toBe(bench);
  });
});
