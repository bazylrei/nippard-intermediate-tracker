import { assertValidMotion, type Motion } from "./motion";

/*
 * The motions, written as anatomy rather than as animation: a curl is the elbow folding,
 * a hinge is the trunk tipping with the hips moving back. Tempo follows the usual cue of a
 * controlled lift, a brief squeeze and a slower lowering.
 */

const dumbbellCurl: Motion = {
  seconds: 4,
  peak: 0.35,
  prop: { kind: "dumbbells" },
  targets: ["upperArm"],
  keyframes: [
    { at: 0, pose: { elbowFlex: 10 } },
    // Lift in about a second; the elbow drifts slightly forward at the top.
    { at: 0.28, pose: { elbowFlex: 145, shoulderFlex: 8 } },
    { at: 0.4, pose: { elbowFlex: 145, shoulderFlex: 8 } },
    // Lower over about two seconds, then a beat at the bottom.
    { at: 0.92, pose: { elbowFlex: 10 } },
    { at: 1, pose: { elbowFlex: 10 } },
  ],
};

const gobletSquat: Motion = {
  seconds: 4.5,
  peak: 0.5,
  prop: { kind: "goblet" },
  targets: ["thigh", "pelvis"],
  // Hands at the chest holding the dumbbell's ends the whole way.
  base: { shoulderFlex: 5, elbowFlex: 125 },
  keyframes: [
    { at: 0, pose: {} },
    // Sit down and back, chest up, eyes kept level.
    { at: 0.45, pose: { hipFlex: 108, kneeFlex: 120, spineFlex: 20, chestFlex: 5, neckFlex: -22 } },
    { at: 0.56, pose: { hipFlex: 108, kneeFlex: 120, spineFlex: 20, chestFlex: 5, neckFlex: -22 } },
    { at: 1, pose: {} },
  ],
};

const dumbbellRdl: Motion = {
  seconds: 5,
  peak: 0.5,
  prop: { kind: "dumbbells" },
  targets: ["thigh", "pelvis"],
  // Soft knees, shins vertical (equal hip and knee angles keep them so).
  base: { hipFlex: 12, kneeFlex: 12 },
  keyframes: [
    { at: 0, pose: {} },
    // Hips back, trunk tipping with a neutral spine; the arms stay hanging straight down,
    // so relative to the chest they rise by exactly the trunk's lean.
    { at: 0.48, pose: { hipFlex: 24, kneeFlex: 24, spineFlex: 68, chestFlex: 4, neckFlex: -12, shoulderFlex: 72 } },
    { at: 0.58, pose: { hipFlex: 24, kneeFlex: 24, spineFlex: 68, chestFlex: 4, neckFlex: -12, shoulderFlex: 72 } },
    { at: 1, pose: {} },
  ],
};

/** Built-in exercises with a demo, by exercise name. */
const LIBRARY: Record<string, Motion> = {
  "DB Curl": dumbbellCurl,
  "Goblet Squat": gobletSquat,
  "DB RDL": dumbbellRdl,
};

for (const [name, motion] of Object.entries(LIBRARY)) assertValidMotion(name, motion);

export const DEMO_EXERCISES = Object.keys(LIBRARY);

/** The demo motion for a built-in exercise, if one exists. */
export function motionFor(exerciseName: string): Motion | undefined {
  return Object.hasOwn(LIBRARY, exerciseName) ? LIBRARY[exerciseName] : undefined;
}
