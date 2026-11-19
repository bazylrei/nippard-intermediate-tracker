import * as THREE from "three";
import { poseAt, type Motion } from "@/lib/animation/motion";
import type { Figure } from "./figure";

/** The demo's shape on screen. */
export const ASPECT = 4 / 3;

/**
 * One three-quarter view for every exercise, at one scale, so demos sit side by side as a set.
 * Not tuned per exercise: the framing test checks every motion stays inside it instead.
 */
export function createCamera(aspect = ASPECT): THREE.PerspectiveCamera {
  const camera = new THREE.PerspectiveCamera(28, aspect, 0.1, 50);
  // From the side and a little behind: the hinge reads in profile and the back of the legs shows.
  camera.position.set(3.6, 1.45, -1.7);
  camera.lookAt(0, 0.8, 0);
  camera.updateMatrixWorld(true);
  return camera;
}

/** Everything the figure (and what it holds) sweeps through over one rep. */
export function repBounds(figure: Figure, motion: Motion, samples = 32): THREE.Box3 {
  const box = new THREE.Box3();
  for (let i = 0; i < samples; i++) {
    figure.pose(poseAt(motion, i / samples));
    box.expandByObject(figure.root, true);
  }
  return box;
}

/** Whether all of `box` lands on screen through `camera`, leaving `margin` (in screen fractions) clear. */
export function inFrame(box: THREE.Box3, camera: THREE.Camera, margin = 0.04): boolean {
  const limit = 1 - 2 * margin;
  const { min, max } = box;
  for (const x of [min.x, max.x]) for (const y of [min.y, max.y]) for (const z of [min.z, max.z]) {
    const p = new THREE.Vector3(x, y, z).project(camera);
    if (Math.abs(p.x) > limit || Math.abs(p.y) > limit) return false;
  }
  return true;
}
