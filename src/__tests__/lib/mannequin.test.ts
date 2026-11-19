import { describe, it, expect } from "vitest";
import * as THREE from "three";
import { createMannequin, type Mannequin } from "@/components/exercise-animation/mannequin";
import { poseAt } from "@/lib/animation/motion";
import { motionFor } from "@/lib/animation/motions";
import { DIMS, STANDING, type Pose } from "@/lib/animation/rig";

const colors = { body: "#888888", accent: "#ff6600" };
const world = (o: THREE.Object3D) => o.getWorldPosition(new THREE.Vector3());
const pose = (p: Partial<Pose>): Pose => ({ ...STANDING, ...p });
const standingHeight = DIMS.footHeight + DIMS.thigh + DIMS.shin;

/** Counts the dumbbell plates in the figure's hands: each dumbbell has two. */
const plates = (m: Mannequin) => {
  let n = 0;
  m.root.traverse((o) => { if ((o as THREE.Mesh).geometry instanceof THREE.CylinderGeometry && (o as THREE.Mesh).geometry.parameters.radiusTop > 0.05) n++; });
  return n;
};

describe("createMannequin — joint conventions", () => {
  it("stands upright with its hands hanging at its sides and its feet on the floor", () => {
    const m = createMannequin(colors);
    m.apply(STANDING, true);

    expect(world(m.joints.pelvis).y).toBeCloseTo(standingHeight);
    expect(world(m.joints.leftAnkle).y).toBeCloseTo(DIMS.footHeight);
    const hand = world(m.joints.leftHand);
    expect(hand.x).toBeCloseTo(DIMS.shoulderHalfWidth); // the figure's left is +x
    expect(hand.z).toBeCloseTo(0);
    expect(hand.y).toBeCloseTo(standingHeight + DIMS.torso - 0.05 - DIMS.upperArm - DIMS.forearm);
  });

  it("flexes the elbow forward: the hand comes up in front of the body, level with the elbow at 90°", () => {
    const m = createMannequin(colors);
    m.apply(STANDING, true);
    const elbowY = world(m.joints.leftHand).y + DIMS.forearm;

    m.apply(pose({ elbowFlex: 90 }), true);
    const hand = world(m.joints.leftHand);

    expect(hand.z).toBeCloseTo(DIMS.forearm);
    expect(hand.y).toBeCloseTo(elbowY);
  });

  it("raises the arm forward with shoulder flexion, and swings it back when negative", () => {
    const m = createMannequin(colors);
    m.apply(pose({ shoulderFlex: 90 }), true);
    expect(world(m.joints.leftHand).z).toBeGreaterThan(0.5);
    m.apply(pose({ shoulderFlex: -45 }), true);
    expect(world(m.joints.leftHand).z).toBeLessThan(-0.3);
  });

  it("leans the torso forward from the pelvis: shoulders end up in front, and an arm turned to match hangs straight down", () => {
    const m = createMannequin(colors);
    m.apply(pose({ spineFlex: 90, shoulderFlex: 90 }), true);

    const pelvis = world(m.joints.pelvis);
    const hand = world(m.joints.leftHand);
    expect(hand.z - pelvis.z).toBeCloseTo(DIMS.torso - 0.05); // shoulders are level with the pelvis, out in front of it
    expect(hand.y).toBeCloseTo(pelvis.y - DIMS.upperArm - DIMS.forearm); // the arm drops vertically from there
  });

  it("hangs the hands straight down at the bottom of the RDL, as the dumbbells would", () => {
    const rdl = motionFor("DB RDL")!;
    const bottom = poseAt(rdl, rdl.peak);
    const m = createMannequin(colors);
    m.apply(bottom, rdl.plantFeet);

    const pelvis = world(m.joints.pelvis);
    const shoulderZ = pelvis.z + (DIMS.torso - 0.05) * Math.sin((bottom.spineFlex * Math.PI) / 180);
    expect(world(m.joints.leftHand).z).toBeCloseTo(shoulderZ, 1);
  });

  it("keeps both feet flat on the floor through a deep squat", () => {
    const m = createMannequin(colors);
    m.apply(pose({ hipFlex: 105, kneeFlex: 118, spineFlex: 28 }), true);

    for (const ankle of [m.joints.leftAnkle, m.joints.rightAnkle]) {
      const p = world(ankle);
      expect(p.y).toBeCloseTo(DIMS.footHeight, 5);
      expect(p.z).toBeCloseTo(0, 5);
    }
    expect(world(m.joints.pelvis).y).toBeLessThan(standingHeight - 0.4);
  });

  it("stays at standing height when feet aren't being planted", () => {
    const m = createMannequin(colors);
    m.apply(pose({ hipFlex: 105, kneeFlex: 118 }), false);
    expect(world(m.joints.pelvis).y).toBeCloseTo(standingHeight);
  });
});

describe("createMannequin — props", () => {
  it("holds a dumbbell in each hand, one at the chest for a goblet hold, and replaces rather than piles up", () => {
    const m = createMannequin(colors);
    expect(plates(m)).toBe(0);

    m.hold({ kind: "dumbbells" });
    expect(plates(m)).toBe(4);

    m.hold({ kind: "goblet" });
    expect(plates(m)).toBe(2);

    m.hold({ kind: "none" });
    expect(plates(m)).toBe(0);
  });

  it("centres the goblet dumbbell between the hands", () => {
    const m = createMannequin(colors);
    m.hold({ kind: "goblet" });
    m.apply(pose({ shoulderFlex: 28, elbowFlex: 125 }), true);

    let x = NaN;
    m.root.traverse((o) => { if ((o as THREE.Mesh).geometry instanceof THREE.CylinderGeometry && (o as THREE.Mesh).geometry.parameters.radiusTop < 0.02) x = world(o).x; });
    expect(x).toBeCloseTo(0, 5);
  });

  it("disposes without throwing", () => {
    const m = createMannequin(colors);
    m.hold({ kind: "dumbbells" });
    expect(() => m.dispose()).not.toThrow();
  });
});
