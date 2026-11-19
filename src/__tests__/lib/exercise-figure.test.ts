import { describe, it, expect } from "vitest";
import * as THREE from "three";
import { createFigure, type Figure } from "@/components/exercise-animation/figure";
import { createCamera, inFrame, repBounds } from "@/components/exercise-animation/framing";
import { BODY, NEUTRAL, type Pose } from "@/lib/animation/body";
import { poseAt } from "@/lib/animation/motion";
import { DEMO_EXERCISES, motionFor } from "@/lib/animation/library";

const colors = { body: "#777777", target: "#ff6600", iron: "#111111" };
const at = (o: THREE.Object3D) => o.getWorldPosition(new THREE.Vector3());
const posed = (p: Partial<Pose>, figure: Figure = createFigure(colors)) => { figure.pose({ ...NEUTRAL, ...p }); return figure; };
const legLength = BODY.footHeight + BODY.thigh + BODY.shin;
const rad = (deg: number) => (deg * Math.PI) / 180;

describe("figure — joints move the way the angles say", () => {
  it("stands with its feet on the floor, hands at its sides (its left is +x)", () => {
    const f = posed({});
    expect(at(f.joints.pelvis).y).toBeCloseTo(legLength);
    expect(at(f.joints.leftAnkle).y).toBeCloseTo(BODY.footHeight);
    expect(at(f.joints.leftHand).x).toBeCloseTo(BODY.shoulderHalfWidth);
    expect(at(f.joints.leftHand).z).toBeCloseTo(0);
  });

  it("folds the elbow forward: at 90° the hand is level with the elbow, a forearm in front", () => {
    const straight = at(posed({}).joints.leftHand);
    const bent = at(posed({ elbowFlex: 90 }).joints.leftHand);
    expect(bent.z).toBeCloseTo(BODY.forearm);
    expect(bent.y).toBeCloseTo(straight.y + BODY.forearm);
  });

  it("leans the trunk forward from the pelvis, lower back and upper back adding up", () => {
    const f = posed({ spineFlex: 45, chestFlex: 45, shoulderFlex: 90 });
    // 90° of total lean with the arms raised 90° relative to the chest leaves them hanging straight down.
    expect(at(f.joints.leftHand).y).toBeLessThan(at(f.joints.chest).y);
    expect(at(f.joints.chest).z).toBeGreaterThan(0.1);
  });

  it("keeps both feet flat and on the floor in a deep squat, the hips sitting back", () => {
    const f = posed({ hipFlex: 108, kneeFlex: 120, spineFlex: 20 });
    for (const ankle of [f.joints.leftAnkle, f.joints.rightAnkle]) {
      expect(at(ankle).y).toBeCloseTo(BODY.footHeight, 6);
      expect(at(ankle).z).toBeCloseTo(0, 6);
      const tilt = new THREE.Euler().setFromQuaternion(ankle.getWorldQuaternion(new THREE.Quaternion()));
      expect(tilt.x).toBeCloseTo(0, 6); // the sole is level, not tipped with the shin
    }
    expect(at(f.joints.pelvis).y).toBeLessThan(legLength - 0.4);
    expect(at(f.joints.pelvis).z).toBeLessThan(-0.2);
  });

  it("never pushes anything through the floor, in any demo", () => {
    for (const name of DEMO_EXERCISES) {
      const motion = motionFor(name)!;
      const f = createFigure(colors);
      f.hold(motion.prop);
      expect(repBounds(f, motion).min.y, name).toBeGreaterThan(-0.005);
    }
  });
});

describe("figure — the pilot demos are anatomically right", () => {
  it("RDL: the dumbbells hang straight below the shoulders at the bottom", () => {
    const rdl = motionFor("DB RDL")!;
    const bottom = poseAt(rdl, rdl.peak);
    const f = posed(bottom);
    const lean = rad(bottom.spineFlex + bottom.chestFlex);
    const shoulder = new THREE.Vector3(BODY.shoulderHalfWidth, BODY.chest - 0.03, 0);
    f.joints.chest.localToWorld(shoulder);
    expect(at(f.joints.leftHand).z).toBeCloseTo(shoulder.z, 1);
    expect(lean).toBeGreaterThan(rad(60)); // a real hinge, not a nod
  });

  it("RDL: the hips travel back as the trunk tips", () => {
    const rdl = motionFor("DB RDL")!;
    const top = at(posed(poseAt(rdl, 0)).joints.pelvis).z;
    const bottom = at(posed(poseAt(rdl, rdl.peak)).joints.pelvis).z;
    expect(top - bottom).toBeGreaterThan(0.07);
  });

  it("Goblet squat: the hands stay on the dumbbell's ends through the whole rep", () => {
    const squat = motionFor("Goblet Squat")!;
    const f = createFigure(colors);
    f.hold(squat.prop);
    for (let i = 0; i < 16; i++) {
      f.pose(poseAt(squat, i / 16));
      const bell = at(f.props()[0]);
      const hand = at(f.joints.leftHand);
      expect(Math.hypot(hand.y - bell.y, hand.z - bell.z), `phase ${i / 16}`).toBeLessThan(0.07);
    }
  });

  it("Curl: the dumbbell comes up to the shoulder at the top", () => {
    const curl = motionFor("DB Curl")!;
    const f = posed(poseAt(curl, curl.peak));
    const hand = at(f.joints.leftHand).y;
    const shoulder = new THREE.Vector3(0, BODY.chest - 0.03, 0);
    f.joints.chest.localToWorld(shoulder);
    expect(shoulder.y - hand).toBeLessThan(0.15);
  });
});

describe("figure — props and highlighting", () => {
  it("holds a dumbbell per hand, one for a goblet, and swaps rather than piles them up", () => {
    const f = createFigure(colors);
    expect(f.props()).toHaveLength(0);
    f.hold({ kind: "dumbbells" });
    expect(f.props().map((p) => p.parent)).toEqual([f.joints.leftHand, f.joints.rightHand]);
    f.hold({ kind: "goblet" });
    expect(f.props()).toHaveLength(1);
    let attached = 0;
    f.root.traverse((o) => { if (o === f.props()[0]) attached++; });
    expect(attached).toBe(1);
    f.hold({ kind: "none" });
    expect(f.props()).toHaveLength(0);
  });

  it("colours only the target muscles, and can change its mind", () => {
    const f = createFigure(colors);
    f.highlight(["upperArm"]);
    expect(meshesColoured(f, "ff6600")).toBe(2); // both upper arms
    f.highlight(["thigh", "pelvis"]);
    expect(meshesColoured(f, "ff6600")).toBe(3); // two thighs and the pelvis
    f.highlight([]);
    expect(meshesColoured(f, "ff6600")).toBe(0);
  });

  it("recolours in place for a theme switch", () => {
    const f = createFigure(colors);
    f.highlight(["upperArm"]);
    f.recolor({ body: "#ffffff", target: "#00ff00", iron: "#000000" });
    expect(meshesColoured(f, "00ff00")).toBe(2);
    expect(meshesColoured(f, "ff6600")).toBe(0);
  });
});

describe("framing — one shot fits every demo", () => {
  it.each(DEMO_EXERCISES)("%s stays fully in frame through the whole rep", (name) => {
    const motion = motionFor(name)!;
    const f = createFigure(colors);
    f.hold(motion.prop);
    expect(inFrame(repBounds(f, motion), createCamera())).toBe(true);
  });

  it("would catch a motion that leaves the frame", () => {
    const tooBig = new THREE.Box3(new THREE.Vector3(-1, 0, -1), new THREE.Vector3(1, 3, 1));
    expect(inFrame(tooBig, createCamera())).toBe(false);
  });
});

/** How many of the figure's meshes are drawn in this colour. */
function meshesColoured(f: Figure, hex: string): number {
  let n = 0;
  f.root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (mesh.isMesh && (mesh.material as THREE.MeshStandardMaterial).color.getHexString() === hex) n++;
  });
  return n;
}
