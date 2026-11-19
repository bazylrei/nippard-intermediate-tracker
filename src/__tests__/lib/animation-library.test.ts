import { describe, it, expect } from "vitest";
import { assertValidMotion, minimumJerk, poseAt, type Motion } from "@/lib/animation/motion";
import { DEMO_EXERCISES, motionFor } from "@/lib/animation/library";
import { NEUTRAL } from "@/lib/animation/body";

const curl: Motion = {
  seconds: 4, peak: 0.5, prop: { kind: "none" }, targets: ["upperArm"], base: { shoulderFlex: 5 },
  keyframes: [{ at: 0, pose: { elbowFlex: 0 } }, { at: 0.5, pose: { elbowFlex: 100 } }, { at: 1, pose: { elbowFlex: 0 } }],
};

describe("minimumJerk", () => {
  it("runs 0 to 1, symmetric, starting and stopping gently", () => {
    expect(minimumJerk(0)).toBe(0);
    expect(minimumJerk(1)).toBe(1);
    expect(minimumJerk(0.5)).toBeCloseTo(0.5);
    expect(minimumJerk(0.1)).toBeLessThan(0.02); // a straight line would be 0.1
    expect(minimumJerk(0.25) + minimumJerk(0.75)).toBeCloseTo(1);
  });
});

describe("poseAt", () => {
  it("lands exactly on keyframes, holding unlisted angles at the base", () => {
    expect(poseAt(curl, 0)).toEqual({ ...NEUTRAL, shoulderFlex: 5 });
    expect(poseAt(curl, 0.5)).toMatchObject({ elbowFlex: 100, shoulderFlex: 5 });
  });

  it("is halfway at the midpoint between keyframes and gentle near them", () => {
    expect(poseAt(curl, 0.25).elbowFlex).toBeCloseTo(50);
    expect(poseAt(curl, 0.03).elbowFlex).toBeLessThan(2);
  });

  it("wraps, so each rep flows into the next", () => {
    expect(poseAt(curl, 1)).toEqual(poseAt(curl, 0));
    expect(poseAt(curl, 2.25).elbowFlex).toBeCloseTo(poseAt(curl, 0.25).elbowFlex);
    expect(poseAt(curl, -0.75).elbowFlex).toBeCloseTo(poseAt(curl, 0.25).elbowFlex);
  });
});

describe("assertValidMotion", () => {
  it("accepts a well-formed rep", () => {
    expect(() => assertValidMotion("curl", curl)).not.toThrow();
  });

  it.each<[string, Partial<Motion>, RegExp]>([
    ["a loop that would jump", { keyframes: [{ at: 0, pose: {} }, { at: 1, pose: { elbowFlex: 90 } }] }, /seamless/],
    ["keyframes out of order", { keyframes: [{ at: 0, pose: {} }, { at: 0.7, pose: {} }, { at: 0.3, pose: {} }, { at: 1, pose: {} }] }, /increasing/],
    ["keyframes not spanning the rep", { keyframes: [{ at: 0.2, pose: {} }, { at: 1, pose: {} }] }, /0 to 1/],
    ["a single keyframe", { keyframes: [{ at: 0, pose: {} }] }, /two keyframes/],
    ["no target muscles", { targets: [] }, /target/],
    ["a zero-length rep", { seconds: 0 }, /seconds/],
    ["a peak outside the rep", { peak: -0.1 }, /peak/],
  ])("rejects %s, naming the motion", (_, change, why) => {
    expect(() => assertValidMotion("Bad Lift", { ...curl, ...change })).toThrow(/Bad Lift/);
    expect(() => assertValidMotion("Bad Lift", { ...curl, ...change })).toThrow(why);
  });
});

describe("library", () => {
  it("has the three pilot demos, all valid (checked as the module loads)", () => {
    expect(DEMO_EXERCISES).toEqual(["DB Curl", "Goblet Squat", "DB RDL"]);
    for (const name of DEMO_EXERCISES) expect(motionFor(name)).toBeDefined();
  });

  it("has nothing for other exercises, even names that are object keys", () => {
    expect(motionFor("Barbell Bench Press")).toBeUndefined();
    expect(motionFor("constructor")).toBeUndefined();
  });
});
