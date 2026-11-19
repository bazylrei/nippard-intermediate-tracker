/**
 * The exercise mannequin's skeleton, as plain numbers: segment lengths and the joint angles
 * a motion is described in. Nothing here knows about three.js, so it is cheap to test and
 * reusable by anything that wants to draw the same figure (another renderer, a native app).
 *
 * Axes: y up, the figure faces +z, its left is +x. Angles are degrees and always mean the
 * same thing whatever the exercise: positive flexion bends a joint the way the body folds.
 */

/** Segment lengths in metres. */
export const DIMS = {
  thigh: 0.45,
  shin: 0.45,
  footHeight: 0.05,
  torso: 0.55,
  upperArm: 0.3,
  forearm: 0.27,
  hipHalfWidth: 0.1,
  shoulderHalfWidth: 0.2,
} as const;

/** The joint angles a motion drives. Both sides move together (no one-armed exercises yet). */
export interface Pose {
  /** Thigh raised forward from hanging straight down. */
  hipFlex: number;
  /** Shin folded back behind the thigh. */
  kneeFlex: number;
  /** Torso leaned forward from upright, pivoting at the pelvis. */
  spineFlex: number;
  /** Upper arm raised forward from hanging straight down; negative swings it back. */
  shoulderFlex: number;
  /** Forearm folded forward at the elbow. */
  elbowFlex: number;
}

export const STANDING: Pose = { hipFlex: 0, kneeFlex: 0, spineFlex: 0, shoulderFlex: 0, elbowFlex: 0 };

export const JOINTS = Object.keys(STANDING) as (keyof Pose)[];

const rad = (deg: number) => (deg * Math.PI) / 180;

/**
 * Where the pelvis must sit for the feet to stay flat on the floor at the origin, given the
 * hip and knee angles. This is what keeps every lower-body motion planted instead of floating.
 */
export function plantedPelvis({ hipFlex, kneeFlex }: Pick<Pose, "hipFlex" | "kneeFlex">): { y: number; z: number } {
  const thighAngle = rad(hipFlex);
  const shinAngle = rad(hipFlex - kneeFlex);
  return {
    y: DIMS.footHeight + DIMS.thigh * Math.cos(thighAngle) + DIMS.shin * Math.cos(shinAngle),
    z: -(DIMS.thigh * Math.sin(thighAngle) + DIMS.shin * Math.sin(shinAngle)),
  };
}
