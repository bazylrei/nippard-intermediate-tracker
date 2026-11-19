import { NEUTRAL, POSE_KEYS, type Pose, type Segment } from "./body";

/** What the figure holds. */
export type Prop =
  | { kind: "none" }
  /** A dumbbell in each hand. */
  | { kind: "dumbbells" }
  /** One dumbbell held level at the chest by both ends (goblet hold). */
  | { kind: "goblet" };

export interface Keyframe {
  /** Position in the rep, 0 to 1. */
  at: number;
  /** Angles not listed hold the motion's `base`. */
  pose: Partial<Pose>;
}

/** One exercise's movement: a rep as a seamless loop of keyframes. */
export interface Motion {
  /** Seconds per rep, lifting and lowering. */
  seconds: number;
  /** Position in the rep shown as a still (the hardest point), e.g. when motion is reduced. */
  peak: number;
  prop: Prop;
  /** The muscles doing the work, highlighted on the figure. */
  targets: Segment[];
  /** Angles held through the whole rep unless a keyframe says otherwise. */
  base?: Partial<Pose>;
  /** Ordered by `at`, from 0 to 1; the last pose equals the first. */
  keyframes: Keyframe[];
}

const full = (motion: Motion, keyframe: Keyframe): Pose => ({ ...NEUTRAL, ...motion.base, ...keyframe.pose });

/** Throws on a motion that would jump, run backwards or highlight nothing, where it is defined. */
export function assertValidMotion(name: string, motion: Motion): void {
  const fail = (why: string) => { throw new Error(`Motion "${name}": ${why}`); };
  const { keyframes, seconds, peak, targets } = motion;
  if (!(seconds > 0)) fail("seconds must be positive");
  if (!(peak >= 0 && peak <= 1)) fail("peak must be between 0 and 1");
  if (targets.length === 0) fail("needs at least one target muscle");
  if (keyframes.length < 2) fail("needs at least two keyframes");
  if (keyframes[0].at !== 0 || keyframes.at(-1)!.at !== 1) fail("keyframes must run from 0 to 1");
  if (keyframes.some((k, i) => i > 0 && k.at <= keyframes[i - 1].at)) fail("keyframes must be in increasing order");
  const first = full(motion, keyframes[0]);
  const last = full(motion, keyframes.at(-1)!);
  if (POSE_KEYS.some((key) => first[key] !== last[key])) fail("the last keyframe must equal the first, so the loop is seamless");
}

/**
 * Minimum-jerk timing: the speed profile people naturally use moving a limb from one
 * position to another (Flash & Hogan, 1985). Starts and stops gently, fastest mid-way.
 */
export const minimumJerk = (t: number) => t * t * t * (10 - 15 * t + 6 * t * t);

/** The pose at a point in the rep (0 to 1; values outside wrap round). */
export function poseAt(motion: Motion, phase: number): Pose {
  const p = phase - Math.floor(phase);
  const { keyframes } = motion;
  const next = keyframes.findIndex((k) => k.at > p);
  const i = next === -1 ? keyframes.length - 2 : next - 1;
  const from = full(motion, keyframes[i]);
  const to = full(motion, keyframes[i + 1]);
  const t = minimumJerk((p - keyframes[i].at) / (keyframes[i + 1].at - keyframes[i].at));
  const pose = { ...NEUTRAL };
  for (const key of POSE_KEYS) pose[key] = from[key] + (to[key] - from[key]) * t;
  return pose;
}
