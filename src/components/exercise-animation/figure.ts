import * as THREE from "three";
import { BODY, type Pose, type Segment } from "@/lib/animation/body";
import type { Prop } from "@/lib/animation/motion";
import { lathe, MUSCLES, PROFILES, type Blob } from "./anatomy";
import { MUSCLE_MAPS, Skin as Materials } from "./skin";

export interface FigureColors {
  body: string;
  /** The highlighted, working muscles. */
  target: string;
  /** The weights. */
  iron: string;
}

/** Pivots exposed so callers (and tests) can read where the body ended up. */
export interface FigureJoints {
  pelvis: THREE.Object3D;
  chest: THREE.Object3D;
  leftHand: THREE.Object3D;
  rightHand: THREE.Object3D;
  leftAnkle: THREE.Object3D;
  rightAnkle: THREE.Object3D;
}

export interface Figure {
  root: THREE.Group;
  joints: FigureJoints;
  /** Poses the body, then sets it on the floor with both feet flat. */
  pose(pose: Pose): void;
  /** Swaps what the figure holds. */
  hold(prop: Prop): void;
  /** Colours these segments as the working muscles; everything else returns to the body colour. */
  highlight(targets: Segment[]): void;
  /** The meshes of the weights currently held. */
  props(): THREE.Object3D[];
  recolor(colors: FigureColors): void;
  dispose(): void;
}

type Vec3 = [number, number, number];
const RES = 16;
const rad = (deg: number) => (deg * Math.PI) / 180;

function pivot(parent: THREE.Object3D, at: Vec3 = [0, 0, 0]): THREE.Group {
  const group = new THREE.Group();
  group.position.set(...at);
  parent.add(group);
  return group;
}

/** An ellipsoid with these radii along x, y and z: reads as muscle rather than tube. */
function ellipsoid(mats: Materials, parent: THREE.Object3D, radii: Vec3, at: Vec3, segment?: Segment): THREE.Mesh {
  const mesh = mats.add(parent, new THREE.SphereGeometry(1, 32, 24), at, segment);
  mesh.scale.set(...radii);
  return mesh;
}

/** A shaped muscle from the anatomy table, mirrored to the figure's `side`. */
function muscle(mats: Materials, parent: THREE.Object3D, blob: Blob, segment?: Segment, side: 1 | -1 = 1) {
  const [x, y, z] = blob.at;
  ellipsoid(mats, parent, blob.radii, [x * side, y, z], segment);
}

/** A lathed limb, flattened front-to-back or side-to-side by `scale`. */
function limb(mats: Materials, parent: THREE.Object3D, profile: keyof typeof PROFILES, segment: Segment, scale: [number, number] = [1, 1]): THREE.Mesh {
  // Limbs drawn a little fuller than measured: true-to-life radii look skeletal at phone size.
  const fuller = profile === "abdomen" || profile === "chest" || profile === "neck" ? 1 : 1.25;
  const mesh = mats.add(parent, lathe(PROFILES[profile]), [0, 0, 0], segment);
  mesh.scale.set(scale[0] * fuller, 1, scale[1] * fuller);
  return mesh;
}

/** A rounded joint that hides the seam where two segments meet. */
function joint(mats: Materials, parent: THREE.Object3D, radius: number) {
  ellipsoid(mats, parent, [radius, radius, radius], [0, 0, 0]);
}

function buildArm(mats: Materials, chest: THREE.Object3D, side: 1 | -1) {
  const shoulder = pivot(chest, [side * BODY.shoulderHalfWidth, BODY.chest - 0.035, 0]);
  muscle(mats, shoulder, MUSCLES.deltoid, undefined, side);
  limb(mats, shoulder, "upperArm", "upperArm", [0.95, 1.05]);
  const elbow = pivot(shoulder, [0, -BODY.upperArm, 0]);
  joint(mats, elbow, 0.034 * 1.25);
  limb(mats, elbow, "forearm", "forearm", [1.05, 0.9]);
  const hand = pivot(elbow, [0, -BODY.forearm, 0]);
  joint(mats, hand, 0.021 * 1.25);
  // Palm facing the body: flat side to side, fingers continuing the forearm.
  ellipsoid(mats, hand, [0.019, 0.05, 0.04], [0, -0.045, 0.004]);
  ellipsoid(mats, hand, [0.016, 0.035, 0.032], [0, -0.1, 0.006]);
  ellipsoid(mats, hand, [0.013, 0.028, 0.013], [side * 0.008, -0.04, 0.042]); // thumb
  return { shoulder, elbow, hand };
}

function buildLeg(mats: Materials, pelvis: THREE.Object3D, side: 1 | -1) {
  const hip = pivot(pelvis, [side * BODY.hipHalfWidth, 0, 0]);
  const thigh = limb(mats, hip, "thigh", "thigh", [0.95, 1.08]);
  mats.paint(thigh, "hamstrings", MUSCLE_MAPS.hamstrings);
  const knee = pivot(hip, [0, -BODY.thigh, 0]);
  joint(mats, knee, 0.045 * 1.25);
  limb(mats, knee, "shin", "shin", [0.95, 1.0]);
  const ankle = pivot(knee, [0, -BODY.shin, 0]);
  joint(mats, ankle, 0.025 * 1.25);
  // Heel, arch and toes as one rounded shape, lying on the floor.
  ellipsoid(mats, ankle, [0.042, BODY.footHeight / 2, 0.125], [0, -BODY.footHeight / 2, 0.06]);
  ellipsoid(mats, ankle, [0.036, 0.03, 0.04], [0, -0.025, -0.025]);
  return { hip, knee, ankle };
}

function buildTrunk(mats: Materials, pelvis: THREE.Object3D) {
  // Pelvis rounded out behind into the glutes.
  const hips = ellipsoid(mats, pelvis, [0.155, 0.115, 0.125], [0, 0.0, -0.01], "pelvis");
  mats.paint(hips, "glutes", MUSCLE_MAPS.glutes);
  const spine = pivot(pelvis, [0, 0.04, 0]);
  limb(mats, spine, "abdomen", "abdomen", [1.25, 0.82]);
  const chest = pivot(spine, [0, BODY.abdomen, 0]);
  limb(mats, chest, "chest", "chest", [1.3, 0.8]);
  // Fills the waist seam as the lower and upper back bend.
  ellipsoid(mats, chest, [0.155, 0.06, 0.1], [0, 0, 0]);
  for (const side of [1, -1] as const) muscle(mats, chest, { ...MUSCLES.pec, at: [0.065, MUSCLES.pec.at[1], MUSCLES.pec.at[2]] }, undefined, side);
  muscle(mats, chest, MUSCLES.trapezius);
  const neck = pivot(chest, [0, BODY.chest - 0.01, 0]);
  limb(mats, neck, "neck", "chest");
  // Skull, then the jaw a little lower and forward: a head, not an egg.
  ellipsoid(mats, neck, [0.077, 0.098, 0.093], [0, 0.17, 0.0]);
  ellipsoid(mats, neck, [0.058, 0.05, 0.06], [0, 0.115, 0.03]);
  return { spine, chest, neck };
}

/** A dumbbell whose bar runs side to side, centred on `at` within `parent`. */
function dumbbell(mats: Materials, parent: THREE.Object3D, at: Vec3, barLength: number): THREE.Object3D {
  const holder = pivot(parent, at);
  holder.rotation.z = Math.PI / 2;
  const parts = [
    mats.add(holder, new THREE.CylinderGeometry(0.014, 0.014, barLength, 10), [0, 0, 0]),
    ...[-1, 1].map((end) => mats.add(holder, new THREE.CylinderGeometry(0.065, 0.065, 0.05, RES), [0, (end * barLength) / 2, 0])),
  ];
  parts.forEach((p) => { p.material = mats.iron; });
  return holder;
}

/** Builds the demo figure: one body for every exercise, so the whole set reads as one system. */
export function createFigure(colors: FigureColors): Figure {
  const mats = new Materials(colors);
  const root = new THREE.Group();
  const pelvis = pivot(root);
  const { spine, chest, neck } = buildTrunk(mats, pelvis);
  const arms = [buildArm(mats, chest, 1), buildArm(mats, chest, -1)];
  const legs = [buildLeg(mats, pelvis, 1), buildLeg(mats, pelvis, -1)];
  let held: THREE.Object3D[] = [];

  /** Puts the feet on the floor at the origin, wherever the legs have left the pelvis. */
  const stand = () => {
    pelvis.position.set(0, 0, 0);
    root.updateMatrixWorld(true);
    const ankles = legs.map(({ ankle }) => ankle.getWorldPosition(new THREE.Vector3()));
    const mid = ankles[0].add(ankles[1]).multiplyScalar(0.5);
    pelvis.position.set(-mid.x, BODY.footHeight - mid.y, -mid.z);
    root.updateMatrixWorld(true);
  };

  return {
    root,
    joints: { pelvis, chest, leftHand: arms[0].hand, rightHand: arms[1].hand, leftAnkle: legs[0].ankle, rightAnkle: legs[1].ankle },
    pose(p) {
      spine.rotation.x = rad(p.spineFlex);
      chest.rotation.x = rad(p.chestFlex);
      neck.rotation.x = rad(p.neckFlex);
      for (const { shoulder, elbow } of arms) {
        shoulder.rotation.x = -rad(p.shoulderFlex);
        elbow.rotation.x = -rad(p.elbowFlex);
      }
      for (const { hip, knee, ankle } of legs) {
        hip.rotation.x = -rad(p.hipFlex);
        knee.rotation.x = rad(p.kneeFlex);
        // Undo the shin's tilt so the sole stays flat on the floor.
        ankle.rotation.x = -(hip.rotation.x + knee.rotation.x);
      }
      stand();
    },
    hold(prop) {
      held.forEach((part) => part.removeFromParent());
      if (prop.kind === "dumbbells") held = arms.map(({ hand }) => dumbbell(mats, hand, [0, -0.06, 0], 0.17));
      // Level at the chest, held by its ends: plate centres line up with the hands.
      else if (prop.kind === "goblet") held = [dumbbell(mats, chest, [0, 0.12, 0.22], 2 * BODY.shoulderHalfWidth)];
      else held = [];
    },
    highlight: (targets) => mats.highlight(targets),
    props: () => held,
    recolor: (c) => mats.recolor(c),
    dispose: () => mats.dispose(),
  };
}
