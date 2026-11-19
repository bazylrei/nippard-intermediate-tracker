import { assertValidMotion, type Motion } from "./motion";

/**
 * Hand-authored motions. Shared patterns will grow into templates here (a curl is a curl
 * whether it is a dumbbell, bar or cable); for now each pilot exercise is spelled out.
 */

const dumbbellCurl: Motion = {
  seconds: 4,
  peak: 0.4,
  prop: { kind: "dumbbells" },
  plantFeet: true,
  keyframes: [
    { at: 0, pose: { elbowFlex: 8 } },
    { at: 0.35, pose: { elbowFlex: 140 } },
    { at: 0.45, pose: { elbowFlex: 140 } },
    { at: 1, pose: { elbowFlex: 8 } },
  ],
};

const gobletSquat: Motion = {
  seconds: 4.5,
  peak: 0.52,
  prop: { kind: "goblet" },
  plantFeet: true,
  // The dumbbell stays tucked at the chest the whole way.
  base: { shoulderFlex: 28, elbowFlex: 125 },
  keyframes: [
    { at: 0, pose: {} },
    { at: 0.46, pose: { hipFlex: 105, kneeFlex: 118, spineFlex: 28 } },
    { at: 0.58, pose: { hipFlex: 105, kneeFlex: 118, spineFlex: 28 } },
    { at: 1, pose: {} },
  ],
};

const dumbbellRdl: Motion = {
  seconds: 5,
  peak: 0.5,
  prop: { kind: "dumbbells" },
  plantFeet: true,
  // Soft knees throughout; the arms hang straight down, so they swing forward relative to the torso as it tips.
  base: { hipFlex: 16, kneeFlex: 16 },
  keyframes: [
    { at: 0, pose: {} },
    { at: 0.5, pose: { spineFlex: 72, shoulderFlex: 72 } },
    { at: 0.6, pose: { spineFlex: 72, shoulderFlex: 72 } },
    { at: 1, pose: {} },
  ],
};

/** Built-in exercises that have an animation, by name. */
const MOTIONS: Record<string, Motion> = {
  "DB Curl": dumbbellCurl,
  "Goblet Squat": gobletSquat,
  "DB RDL": dumbbellRdl,
};

for (const [name, motion] of Object.entries(MOTIONS)) assertValidMotion(name, motion);

/** The animation for an exercise, if one has been made. */
export function motionFor(exerciseName: string): Motion | undefined {
  return Object.hasOwn(MOTIONS, exerciseName) ? MOTIONS[exerciseName] : undefined;
}
