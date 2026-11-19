import { JOINTS, STANDING, type Pose } from "./rig";

/** What the figure holds. */
export type Prop =
  | { kind: "none" }
  /** A dumbbell in each hand, bar running side to side. */
  | { kind: "dumbbells" }
  /** One dumbbell held upright at the chest, centred between the hands. */
  | { kind: "goblet" };

export interface Keyframe {
  /** Position in the loop, 0 to 1. */
  at: number;
  /** Joints not listed hold the motion's `base` value. */
  pose: Partial<Pose>;
}

/** One exercise's movement: a looping set of keyframes over the skeleton. */
export interface Motion {
  /** Seconds for one full rep, including the lowering. */
  seconds: number;
  /** Loop position where the exercise is hardest, used when animation is switched off. */
  peak: number;
  prop: Prop;
  /** Keep the feet flat on the floor by moving the pelvis with the legs. */
  plantFeet: boolean;
  /** Joint angles held through the whole rep unless a keyframe overrides them. */
  base?: Partial<Pose>;
  /** In order of `at`, starting at 0 and ending at 1 (the same pose as the start). */
  keyframes: Keyframe[];
}

/** Throws on a motion that would loop with a jump or run backwards, at the point it's defined. */
export function assertValidMotion(name: string, motion: Motion): void {
  const { keyframes, seconds, peak } = motion;
  if (seconds <= 0) throw new Error(`${name}: seconds must be positive`);
  if (peak < 0 || peak > 1) throw new Error(`${name}: peak must be within 0 to 1`);
  if (keyframes.length < 2) throw new Error(`${name}: needs at least two keyframes`);
  if (keyframes[0].at !== 0 || keyframes[keyframes.length - 1].at !== 1) throw new Error(`${name}: keyframes must run from 0 to 1`);
  for (let i = 1; i < keyframes.length; i++) {
    if (keyframes[i].at <= keyframes[i - 1].at) throw new Error(`${name}: keyframes must be in increasing order`);
  }
  const first = resolve(motion, keyframes[0]);
  const last = resolve(motion, keyframes[keyframes.length - 1]);
  if (JOINTS.some((joint) => first[joint] !== last[joint])) throw new Error(`${name}: the last keyframe must match the first so the loop is seamless`);
}

const resolve = (motion: Motion, keyframe: Keyframe): Pose => ({ ...STANDING, ...motion.base, ...keyframe.pose });

/** Ease in and out, so every direction change is a gentle stop rather than a snap. */
const smooth = (t: number) => t * t * (3 - 2 * t);

/** The full pose at a point in the loop (0 to 1; anything outside wraps round). */
export function poseAt(motion: Motion, phase: number): Pose {
  const p = ((phase % 1) + 1) % 1;
  const { keyframes } = motion;
  let i = keyframes.findIndex((k, index) => index < keyframes.length - 1 && p < keyframes[index + 1].at);
  if (i === -1) i = keyframes.length - 2;
  const from = resolve(motion, keyframes[i]);
  const to = resolve(motion, keyframes[i + 1]);
  const t = smooth((p - keyframes[i].at) / (keyframes[i + 1].at - keyframes[i].at));
  const pose = { ...STANDING };
  for (const joint of JOINTS) pose[joint] = from[joint] + (to[joint] - from[joint]) * t;
  return pose;
}
