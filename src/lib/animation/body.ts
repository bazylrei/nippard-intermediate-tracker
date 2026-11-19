/**
 * The demo figure's body as plain numbers: proportions, the parts that can be highlighted,
 * and the joint angles motions are written in. No three.js here, so it is cheap to test
 * and any renderer (or a future native app) can draw the same figure from it.
 *
 * Axes: y up, the figure faces +z, its left is +x. Angles are degrees.
 */

const HEIGHT = 1.75;

/**
 * Segment lengths in metres for a 1.75 m adult, from the Drillis & Contini fractions of
 * height (as tabulated in Winter, "Biomechanics and Motor Control of Human Movement").
 */
export const BODY = {
  upperArm: 0.186 * HEIGHT,
  forearm: 0.146 * HEIGHT,
  thigh: 0.245 * HEIGHT,
  shin: 0.246 * HEIGHT,
  footHeight: 0.039 * HEIGHT,
  /** Pelvis to the bottom of the rib cage, and from there to the shoulder line (together 0.288 H). */
  abdomen: 0.2,
  chest: 0.3,
  /** Half the distance between the shoulder joints and between the hip joints. */
  shoulderHalfWidth: 0.175,
  hipHalfWidth: 0.09,
} as const;

/** Parts of the body a motion can highlight as the muscles doing the work. */
export type Segment = "upperArm" | "forearm" | "thigh" | "shin" | "pelvis" | "abdomen" | "chest";

/**
 * The angles a motion drives. Both sides move together. Each angle means the same thing in
 * every exercise; positive is the way the body folds. Feet are not in here: they stay flat
 * on the floor by themselves.
 */
export interface Pose {
  /** Thigh swung forward from vertical. The pelvis stays upright; the trunk leans with spineFlex. */
  hipFlex: number;
  /** Shin folded back behind the thigh. */
  kneeFlex: number;
  /** Lower back: the trunk leaning forward from the pelvis. */
  spineFlex: number;
  /** Upper back: the chest curling forward on top of the lower back. */
  chestFlex: number;
  /** Head tipping forward; negative lifts the gaze, as when keeping the eyes level in a lean. */
  neckFlex: number;
  /** Upper arm raised forward from hanging along the trunk; relative to the chest, not the room. */
  shoulderFlex: number;
  /** Forearm folded forward at the elbow. */
  elbowFlex: number;
}

export const NEUTRAL: Pose = { hipFlex: 0, kneeFlex: 0, spineFlex: 0, chestFlex: 0, neckFlex: 0, shoulderFlex: 0, elbowFlex: 0 };

export const POSE_KEYS = Object.keys(NEUTRAL) as (keyof Pose)[];
