import { describe, it, expect } from "vitest";
import { EMPTY_DRAFT, draftFrom, validateDraft, muscleGroupLabel, equipmentLabel, type ExerciseDraft } from "@/lib/exercise-form";
import type { CatalogExercise } from "@/lib/types";

const draft = (over: Partial<ExerciseDraft> = {}): ExerciseDraft => ({ ...EMPTY_DRAFT, name: "Cable Fly", ...over });

describe("validateDraft", () => {
  it("turns a valid draft into the values to save, trimming text and storing blanks as null", () => {
    const result = validateDraft(draft({
      name: "  Cable Fly ", equipment: "cable", restMin: " 90", restMax: "120", formNote: "  ", youtubeUrl: " https://youtu.be/x ",
      weightPerSide: true,
    }));
    expect(result).toEqual({
      ok: true,
      value: {
        name: "Cable Fly", muscleGroup: "chest", equipment: "cable", restSeconds: [90, 120], warmupProtocol: "1-set",
        isBodyweight: false, weightPerSide: true, formNote: null, youtubeUrl: "https://youtu.be/x",
      },
    });
  });

  it("stores no particular equipment as null", () => {
    const result = validateDraft(draft({ equipment: "" }));
    expect(result.ok && result.value.equipment).toBeNull();
  });

  it("needs a name", () => {
    expect(validateDraft(draft({ name: "   " }))).toEqual({ ok: false, errors: { name: "Give it a name." } });
  });

  it.each(["", "abc", "1.5", "-5", "601"])("rejects %j as a rest time", (rest) => {
    const result = validateDraft(draft({ restMin: rest }));
    expect(result.ok).toBe(false);
    expect(!result.ok && result.errors.restMin).toMatch(/Whole seconds/);
  });

  it("rejects a maximum rest below the minimum", () => {
    const result = validateDraft(draft({ restMin: "120", restMax: "90" }));
    expect(!result.ok && result.errors).toEqual({ restMax: "Can't be less than the minimum." });
  });

  it("allows equal minimum and maximum rest", () => {
    expect(validateDraft(draft({ restMin: "90", restMax: "90" })).ok).toBe(true);
  });

  it.each(["javascript:alert(1)", "youtube.com/watch", "ftp://x.com/v"])("rejects %j as a video link", (url) => {
    const result = validateDraft(draft({ youtubeUrl: url }));
    expect(!result.ok && result.errors.youtubeUrl).toMatch(/https:\/\//);
  });

  it("reports every problem at once", () => {
    const result = validateDraft(draft({ name: "", restMin: "x", youtubeUrl: "nope" }));
    expect(!result.ok && Object.keys(result.errors).sort()).toEqual(["name", "restMin", "youtubeUrl"]);
  });
});

describe("draftFrom", () => {
  it("round-trips an exercise through the form unchanged", () => {
    const exercise: CatalogExercise = {
      id: "custom-1", name: "Cable Fly", muscleGroup: "chest", equipment: null, restSeconds: [60, 90], warmupProtocol: "2-set",
      isBodyweight: false, weightPerSide: true, formNote: "Squeeze", instructions: null, youtubeUrl: null, createdBy: "user-1",
    };
    const result = validateDraft(draftFrom(exercise));
    expect(result).toEqual({
      ok: true,
      value: {
        name: "Cable Fly", muscleGroup: "chest", equipment: null, restSeconds: [60, 90], warmupProtocol: "2-set",
        isBodyweight: false, weightPerSide: true, formNote: "Squeeze", youtubeUrl: null,
      },
    });
  });
});

describe("labels", () => {
  it("names muscle groups and equipment, falling back to the stored value", () => {
    expect(muscleGroupLabel("quads")).toBe("Quads");
    expect(muscleGroupLabel("neck")).toBe("neck");
    expect(equipmentLabel("dumbbell")).toBe("Dumbbell");
    expect(equipmentLabel(null)).toBeNull();
  });
});
