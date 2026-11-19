import * as THREE from "three";
import { BODY, type Pose, type Segment } from "@/lib/animation/body";
import type { Prop } from "@/lib/animation/motion";

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

/** Owns every material and geometry, and which meshes belong to which segment. */
class Materials {
  readonly body: THREE.MeshStandardMaterial;
  readonly target: THREE.MeshStandardMaterial;
  readonly iron: THREE.MeshStandardMaterial;
  readonly bySegment = new Map<Segment, THREE.Mesh[]>();
  private geometries: THREE.BufferGeometry[] = [];

  constructor(colors: FigureColors) {
    this.body = new THREE.MeshStandardMaterial({ roughness: 0.65, metalness: 0.05 });
    this.target = new THREE.MeshStandardMaterial({ roughness: 0.5, metalness: 0.05 });
    this.iron = new THREE.MeshStandardMaterial({ roughness: 0.35, metalness: 0.6 });
    this.recolor(colors);
  }

  recolor({ body, target, iron }: FigureColors) {
    this.body.color.set(body);
    this.target.color.set(target);
    this.iron.color.set(iron);
  }

  add(parent: THREE.Object3D, geometry: THREE.BufferGeometry, at: Vec3, segment?: Segment): THREE.Mesh {
    this.geometries.push(geometry);
    const mesh = new THREE.Mesh(geometry, this.body);
    mesh.position.set(...at);
    parent.add(mesh);
    if (segment) this.bySegment.set(segment, [...(this.bySegment.get(segment) ?? []), mesh]);
    return mesh;
  }

  dispose() {
    this.geometries.forEach((g) => g.dispose());
    [this.body, this.target, this.iron].forEach((m) => m.dispose());
  }
}

function pivot(parent: THREE.Object3D, at: Vec3 = [0, 0, 0]): THREE.Group {
  const group = new THREE.Group();
  group.position.set(...at);
  parent.add(group);
  return group;
}

/** An ellipsoid with these radii along x, y and z: reads as muscle rather than tube. */
function ellipsoid(mats: Materials, parent: THREE.Object3D, radii: Vec3, at: Vec3, segment?: Segment) {
  mats.add(parent, new THREE.SphereGeometry(1, RES, RES), at, segment).scale.set(...radii);
}

/** A limb tapering from `top` to `bottom` radius, hanging down from its pivot, with a ball at the joint. */
function limb(mats: Materials, parent: THREE.Object3D, segment: Segment, [top, bottom, length]: Vec3) {
  mats.add(parent, new THREE.SphereGeometry(top * 1.05, RES, RES), [0, 0, 0]);
  mats.add(parent, new THREE.CylinderGeometry(top, bottom, length, RES), [0, -length / 2, 0], segment);
}

function buildArm(mats: Materials, chest: THREE.Object3D, side: 1 | -1) {
  const shoulder = pivot(chest, [side * BODY.shoulderHalfWidth, BODY.chest - 0.03, 0]);
  limb(mats, shoulder, "upperArm", [0.05, 0.038, BODY.upperArm]);
  const elbow = pivot(shoulder, [0, -BODY.upperArm, 0]);
  limb(mats, elbow, "forearm", [0.038, 0.028, BODY.forearm]);
  const hand = pivot(elbow, [0, -BODY.forearm, 0]);
  ellipsoid(mats, hand, [0.0315, 0.0567, 0.0231], [0, -0.05, 0]);
  return { shoulder, elbow, hand };
}

function buildLeg(mats: Materials, pelvis: THREE.Object3D, side: 1 | -1) {
  const hip = pivot(pelvis, [side * BODY.hipHalfWidth, 0, 0]);
  limb(mats, hip, "thigh", [0.075, 0.05, BODY.thigh]);
  const knee = pivot(hip, [0, -BODY.thigh, 0]);
  limb(mats, knee, "shin", [0.052, 0.034, BODY.shin]);
  const ankle = pivot(knee, [0, -BODY.shin, 0]);
  mats.add(ankle, new THREE.BoxGeometry(0.09, BODY.footHeight, 0.25), [0, -BODY.footHeight / 2, 0.07]);
  return { hip, knee, ankle };
}

function buildTrunk(mats: Materials, pelvis: THREE.Object3D) {
  ellipsoid(mats, pelvis, [0.156, 0.0975, 0.1105], [0, 0.02, 0], "pelvis");
  const spine = pivot(pelvis, [0, 0.04, 0]);
  ellipsoid(mats, spine, [0.12, 0.12, 0.09], [0, BODY.abdomen / 2, 0], "abdomen");
  const chest = pivot(spine, [0, BODY.abdomen, 0]);
  ellipsoid(mats, chest, [0.187, 0.17, 0.1224], [0, BODY.chest / 2, 0], "chest");
  const neck = pivot(chest, [0, BODY.chest, 0]);
  mats.add(neck, new THREE.CylinderGeometry(0.04, 0.045, 0.08, RES), [0, 0.04, 0]);
  ellipsoid(mats, neck, [0.09, 0.115, 0.1], [0, 0.17, 0.01]);
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
    highlight(targets) {
      for (const [segment, meshes] of mats.bySegment) {
        meshes.forEach((m) => { m.material = targets.includes(segment) ? mats.target : mats.body; });
      }
    },
    props: () => held,
    recolor: (c) => mats.recolor(c),
    dispose: () => mats.dispose(),
  };
}
