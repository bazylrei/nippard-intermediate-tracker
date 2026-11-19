import * as THREE from "three";

/**
 * Body part outlines for the demo figure. Each limb is a profile — radius at each height,
 * measured down from its joint — turned on a lathe, so it swells and tapers like muscle
 * (calf bulge, slim ankle, full thigh) instead of being a tube.
 */

type Profile = [radius: number, y: number][];

const LATHE_SEGMENTS = 28;

/** Turns a profile into a smooth solid of revolution. */
export function lathe(profile: Profile): THREE.LatheGeometry {
  const geometry = new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(Math.max(r, 0.0005), y)), LATHE_SEGMENTS);
  geometry.computeVertexNormals();
  return geometry;
}

export const PROFILES = {
  thigh: [[0.001, 0.03], [0.07, 0.015], [0.083, -0.04], [0.084, -0.12], [0.077, -0.22], [0.066, -0.32], [0.052, -0.4], [0.046, -0.43], [0.001, -0.431]],
  shin: [[0.001, 0.001], [0.044, 0], [0.051, -0.07], [0.051, -0.14], [0.041, -0.24], [0.029, -0.35], [0.025, -0.43], [0.001, -0.431]],
  upperArm: [[0.001, 0.02], [0.044, 0.005], [0.047, -0.07], [0.044, -0.17], [0.037, -0.27], [0.034, -0.325], [0.001, -0.326]],
  forearm: [[0.001, 0.001], [0.034, 0], [0.039, -0.05], [0.034, -0.13], [0.025, -0.22], [0.021, -0.255], [0.001, -0.256]],
  /** Pelvis up to the bottom of the ribs: a waist that narrows then widens again. */
  abdomen: [[0.001, -0.03], [0.115, 0], [0.108, 0.07], [0.11, 0.14], [0.122, 0.2]],
  /** Ribs to the shoulders: widest across the chest, rounding into the shoulder line. */
  chest: [[0.001, 0], [0.122, 0], [0.135, 0.07], [0.145, 0.16], [0.138, 0.24], [0.1, 0.29], [0.04, 0.315], [0.001, 0.32]],
  neck: [[0.001, -0.01], [0.046, 0], [0.042, 0.05], [0.044, 0.09], [0.001, 0.1]],
} satisfies Record<string, Profile>;

/** Where the shaped muscles sit, as [radii, centre] in their parent joint's space. */
export type Blob = { radii: [number, number, number]; at: [number, number, number] };

export const MUSCLES = {
  /** On the back of the thigh, from just below the glutes to above the knee. */
  hamstrings: { radii: [0.075, 0.18, 0.06], at: [0, -0.2, -0.052] },
  glutes: { radii: [0.088, 0.095, 0.07], at: [0, -0.035, -0.055] },
  /** Front of the thigh, for squats and leg extensions. */
  quads: { radii: [0.08, 0.18, 0.06], at: [0, -0.19, 0.045] },
  calf: { radii: [0.05, 0.1, 0.045], at: [0, -0.13, -0.03] },
  deltoid: { radii: [0.06, 0.07, 0.062], at: [0.008, -0.025, 0] },
  pec: { radii: [0.075, 0.055, 0.035], at: [0, 0.18, 0.085] },
  trapezius: { radii: [0.12, 0.05, 0.07], at: [0, 0.29, -0.025] },
} satisfies Record<string, Blob>;
