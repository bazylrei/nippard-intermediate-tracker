import { describe, it, expect } from "vitest";
import { assertValidMotion, poseAt, type Motion } from "@/lib/animation/motion";
import { motionFor } from "@/lib/animation/motions";
import { DIMS, STANDING, plantedPelvis } from "@/lib/animation/rig";

const curl: Motion = {
  seconds: 4, peak: 0.5, prop: { kind: "none" }, plantFeet: false,
  base: { shoulderFlex: 5 },
  keyframes: [{ at: 0, pose: { elbowFlex: 0 } }, { at: 0.5, pose: { elbowFlex: 100 } }, { at: 1, pose: { elbowFlex: 0 } }],
};

describe("poseAt", () => {
  it("is the keyframe's pose on a keyframe, with unlisted joints held at the base", () => {
    expect(poseAt(curl, 0)).toEqual({ ...STANDING, shoulderFlex: 5, elbowFlex: 0 });
    expect(poseAt(curl, 0.5)).toMatchObject({ elbowFlex: 100, shoulderFlex: 5 });
  });

  it("eases between keyframes, so halfway is halfway and the ends are gentle", () => {
    expect(poseAt(curl, 0.25).elbowFlex).toBeCloseTo(50);
    expect(poseAt(curl, 0.05).elbowFlex).toBeLessThan(10); // linear would be 20
  });

  it("wraps round, so the end of one rep is the start of the next", () => {
    expect(poseAt(curl, 1)).toEqual(poseAt(curl, 0));
    expect(poseAt(curl, 1.25).elbowFlex).toBeCloseTo(poseAt(curl, 0.25).elbowFlex);
    expect(poseAt(curl, -0.75).elbowFlex).toBeCloseTo(poseAt(curl, 0.25).elbowFlex);
  });
});

describe("assertValidMotion", () => {
  it("accepts a well-formed loop", () => {
    expect(() => assertValidMotion("curl", curl)).not.toThrow();
  });

  it.each([
    ["a loop that jumps back", { keyframes: [{ at: 0, pose: { elbowFlex: 0 } }, { at: 1, pose: { elbowFlex: 90 } }] }, /seamless/],
    ["keyframes out of order", { keyframes: [{ at: 0, pose: {} }, { at: 0.6, pose: {} }, { at: 0.4, pose: {} }, { at: 1, pose: {} }] }, /increasing/],
    ["keyframes that don't span the loop", { keyframes: [{ at: 0.1, pose: {} }, { at: 1, pose: {} }] }, /0 to 1/],
    ["a single keyframe", { keyframes: [{ at: 0, pose: {} }] }, /two keyframes/],
    ["a zero length rep", { seconds: 0 }, /seconds/],
    ["a peak outside the loop", { peak: 1.5 }, /peak/],
  ] as [string, Partial<Motion>, RegExp][])("rejects %s", (_, change, message) => {
    expect(() => assertValidMotion("bad", { ...curl, ...change })).toThrow(message);
  });
});

describe("motionFor", () => {
  it("has the pilot exercises, each a valid seamless loop (checked when the module loads)", () => {
    for (const name of ["DB Curl", "Goblet Squat", "DB RDL"]) expect(motionFor(name)).toBeDefined();
  });

  it("has nothing for an exercise without one, including names that only look like object keys", () => {
    expect(motionFor("Bench Press")).toBeUndefined();
    expect(motionFor("toString")).toBeUndefined();
  });
});

describe("plantedPelvis", () => {
  const standingHeight = DIMS.footHeight + DIMS.thigh + DIMS.shin;

  it("stands at full leg length straight over the feet", () => {
    const { y, z } = plantedPelvis({ hipFlex: 0, kneeFlex: 0 });
    expect(y).toBeCloseTo(standingHeight);
    expect(z).toBeCloseTo(0);
  });

  it("drops and sits back as the hips and knees fold", () => {
    const { y, z } = plantedPelvis({ hipFlex: 105, kneeFlex: 118 });
    expect(y).toBeLessThan(standingHeight - 0.4);
    expect(z).toBeLessThan(-0.2);
  });
});
