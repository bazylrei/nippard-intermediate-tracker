import * as THREE from "three";
import { DIMS, plantedPelvis, type Pose } from "@/lib/animation/rig";
import type { Prop } from "@/lib/animation/motion";

export interface MannequinColors {
  body: string;
  /** The weight the figure holds. */
  accent: string;
}

/** The figure's pivots, exposed so callers (and tests) can read where limbs ended up. */
export interface MannequinJoints {
  pelvis: THREE.Object3D;
  leftHand: THREE.Object3D;
  rightHand: THREE.Object3D;
  leftAnkle: THREE.Object3D;
  rightAnkle: THREE.Object3D;
}

export interface Mannequin {
  root: THREE.Group;
  joints: MannequinJoints;
  /** Poses the figure; `plantFeet` moves the pelvis so the feet stay on the floor. */
  apply(pose: Pose, plantFeet: boolean): void;
  /** Holds (or puts down) what the figure carries. */
  hold(prop: Prop): void;
  dispose(): void;
}

type Side = 1 | -1;
type Vec3 = [number, number, number];

const RADIAL = 12;
const CAP = 6;
const ORIGIN: Vec3 = [0, 0, 0];
const rad = (deg: number) => (deg * Math.PI) / 180;

/** Materials plus every geometry made with them, so disposing is one call. */
class Kit {
  readonly body: THREE.Material;
  readonly accent: THREE.Material;
  private geometries: THREE.BufferGeometry[] = [];

  constructor({ body, accent }: MannequinColors) {
    this.body = new THREE.MeshStandardMaterial({ color: body, roughness: 0.7, metalness: 0.05 });
    this.accent = new THREE.MeshStandardMaterial({ color: accent, roughness: 0.5, metalness: 0.2 });
  }

  mesh(parent: THREE.Object3D, geometry: THREE.BufferGeometry, material: THREE.Material, at: Vec3 = ORIGIN) {
    this.geometries.push(geometry);
    const m = new THREE.Mesh(geometry, material);
    m.position.set(...at);
    parent.add(m);
  }

  /** A capsule whose caps end exactly at `length`, so segments meet at their joints. */
  limb(parent: THREE.Object3D, radius: number, length: number, at: Vec3) {
    this.mesh(parent, new THREE.CapsuleGeometry(radius, Math.max(length - 2 * radius, 0.001), CAP, RADIAL), this.body, at);
  }

  ball(parent: THREE.Object3D, radius: number, at: Vec3 = ORIGIN) {
    this.mesh(parent, new THREE.SphereGeometry(radius, RADIAL, RADIAL), this.body, at);
  }

  dispose() {
    this.geometries.forEach((g) => g.dispose());
    this.body.dispose();
    this.accent.dispose();
  }
}

function pivot(parent: THREE.Object3D, at: Vec3 = ORIGIN): THREE.Group {
  const g = new THREE.Group();
  g.position.set(...at);
  parent.add(g);
  return g;
}

function buildArm(kit: Kit, spine: THREE.Object3D, side: Side) {
  const shoulder = pivot(spine, [side * DIMS.shoulderHalfWidth, DIMS.torso - 0.05, 0]);
  kit.ball(shoulder, 0.06);
  kit.limb(shoulder, 0.045, DIMS.upperArm, [0, -DIMS.upperArm / 2, 0]);
  const elbow = pivot(shoulder, [0, -DIMS.upperArm, 0]);
  kit.limb(elbow, 0.04, DIMS.forearm, [0, -DIMS.forearm / 2, 0]);
  const hand = pivot(elbow, [0, -DIMS.forearm, 0]);
  kit.ball(hand, 0.05);
  return { shoulder, elbow, hand };
}

function buildLeg(kit: Kit, pelvis: THREE.Object3D, side: Side) {
  const hip = pivot(pelvis, [side * DIMS.hipHalfWidth, 0, 0]);
  kit.limb(hip, 0.075, DIMS.thigh, [0, -DIMS.thigh / 2, 0]);
  const knee = pivot(hip, [0, -DIMS.thigh, 0]);
  kit.limb(knee, 0.055, DIMS.shin, [0, -DIMS.shin / 2, 0]);
  const ankle = pivot(knee, [0, -DIMS.shin, 0]);
  kit.mesh(ankle, new THREE.BoxGeometry(0.1, DIMS.footHeight, 0.26), kit.body, [0, -DIMS.footHeight / 2, 0.07]);
  return { hip, knee, ankle };
}

/** A dumbbell hanging from `hand`, its bar lying side to side ("x") or standing upright ("y"). */
function addDumbbell(kit: Kit, hand: THREE.Object3D, axis: "x" | "y", offsetX = 0): THREE.Object3D {
  const holder = pivot(hand, [offsetX, -0.02, 0]);
  holder.rotation.z = axis === "x" ? Math.PI / 2 : 0;
  kit.mesh(holder, new THREE.CylinderGeometry(0.015, 0.015, 0.2, 8), kit.accent);
  for (const end of [-0.1, 0.1]) kit.mesh(holder, new THREE.CylinderGeometry(0.06, 0.06, 0.04, 16), kit.accent, [0, end, 0]);
  return holder;
}

/** Builds the figure from capsules and spheres: one body, so every exercise looks like part of one set. */
export function createMannequin(colors: MannequinColors): Mannequin {
  const kit = new Kit(colors);
  const root = new THREE.Group();
  const pelvis = pivot(root);
  kit.ball(pelvis, 0.15);

  // Torso, head and arms ride on the spine, which pivots at the pelvis.
  const spine = pivot(pelvis);
  kit.limb(spine, 0.14, DIMS.torso, [0, DIMS.torso / 2, 0]);
  kit.ball(spine, 0.11, [0, DIMS.torso + 0.16, 0]);
  const arms = [buildArm(kit, spine, 1), buildArm(kit, spine, -1)];
  const legs = [buildLeg(kit, pelvis, 1), buildLeg(kit, pelvis, -1)];
  const [left, right] = arms;
  let held: THREE.Object3D[] = [];

  return {
    root,
    joints: { pelvis, leftHand: left.hand, rightHand: right.hand, leftAnkle: legs[0].ankle, rightAnkle: legs[1].ankle },
    apply(pose, plantFeet) {
      const at = plantedPelvis(plantFeet ? pose : { hipFlex: 0, kneeFlex: 0 });
      pelvis.position.set(0, at.y, at.z);
      spine.rotation.x = rad(pose.spineFlex);
      for (const { shoulder, elbow } of arms) {
        shoulder.rotation.x = -rad(pose.shoulderFlex);
        elbow.rotation.x = -rad(pose.elbowFlex);
      }
      for (const { hip, knee } of legs) {
        hip.rotation.x = -rad(pose.hipFlex);
        knee.rotation.x = rad(pose.kneeFlex);
      }
      root.updateMatrixWorld(true);
    },
    hold(prop) {
      held.forEach((part) => part.parent?.remove(part));
      held = [];
      if (prop.kind === "dumbbells") held = [addDumbbell(kit, left.hand, "x"), addDumbbell(kit, right.hand, "x")];
      // One dumbbell, upright, centred between the hands: offset from the left hand by half the hand gap.
      else if (prop.kind === "goblet") held = [addDumbbell(kit, left.hand, "y", -DIMS.shoulderHalfWidth)];
    },
    dispose: () => kit.dispose(),
  };
}
