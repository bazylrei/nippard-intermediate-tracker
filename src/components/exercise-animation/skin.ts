import * as THREE from "three";
import type { Segment } from "@/lib/animation/body";

export interface SkinColors {
  body: string;
  target: string;
  iron: string;
}

/** How strongly (0 to 1) a point on a mesh, in the mesh's own space, belongs to a muscle. */
export type MuscleMap = (p: THREE.Vector3) => number;

type Tracked = { mesh: THREE.Mesh; segment?: Segment; muscle?: { segment: Segment; weights: Float32Array } };

const fade = (edge0: number, edge1: number, x: number) => {
  const t = Math.min(Math.max((x - edge0) / (edge1 - edge0), 0), 1);
  return t * t * (3 - 2 * t);
};

/** Back (or front, with -1) of a limb, fading in around its sides. */
const facing = (p: THREE.Vector3, side: 1 | -1) => fade(0.05, 0.55, (side * -p.z) / (Math.hypot(p.x, p.z) || 1));
/** Between two heights, with soft ends. */
const between = (y: number, top: number, bottom: number) => fade(bottom, bottom + 0.05, y) * fade(top, top - 0.05, y);

/** Muscle regions painted onto the skin, like an anatomy chart: soft-edged, flush with the body. */
export const MUSCLE_MAPS = {
  /** Thigh, lathe space (y runs down from the hip, -z is the back). */
  hamstrings: (p) => facing(p, 1) * between(p.y, -0.05, -0.39),
  quads: (p) => facing(p, -1) * between(p.y, -0.04, -0.37),
  /** Pelvis, unit-sphere space: the lower back half, split into two cheeks. */
  glutes: (p) => fade(0.15, 0.45, -p.z) * fade(0.35, -0.2, p.y) * fade(0.04, 0.2, Math.abs(p.x)),
} satisfies Record<string, MuscleMap>;

/**
 * The figure's materials. Skin is one material coloured per vertex, so a highlighted muscle
 * blends into the body instead of being a separate shape.
 */
export class Skin {
  readonly skin = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.78, metalness: 0 });
  // Satin rather than chrome: metal with nothing to reflect renders black.
  readonly iron = new THREE.MeshStandardMaterial({ roughness: 0.45, metalness: 0.25 });
  private tracked: Tracked[] = [];
  private targets: Segment[] = [];
  private body = new THREE.Color();
  private target = new THREE.Color();

  constructor(colors: SkinColors) {
    this.recolor(colors);
  }

  add(parent: THREE.Object3D, geometry: THREE.BufferGeometry, at: [number, number, number], segment?: Segment): THREE.Mesh {
    geometry.setAttribute("color", new THREE.BufferAttribute(new Float32Array(geometry.attributes.position.count * 3), 3));
    const mesh = new THREE.Mesh(geometry, this.skin);
    mesh.position.set(...at);
    parent.add(mesh);
    this.tracked.push({ mesh, segment });
    this.paintOne(this.tracked.at(-1)!);
    return mesh;
  }

  /** Marks part of `mesh` as `segment`'s muscle, using `map` to say where. */
  paint(mesh: THREE.Mesh, segment: Segment, map: MuscleMap) {
    const entry = this.tracked.find((t) => t.mesh === mesh)!;
    const position = mesh.geometry.attributes.position;
    const p = new THREE.Vector3();
    const weights = new Float32Array(position.count);
    for (let i = 0; i < position.count; i++) weights[i] = map(p.fromBufferAttribute(position, i));
    entry.muscle = { segment, weights };
    this.paintOne(entry);
  }

  highlight(targets: Segment[]) {
    this.targets = targets;
    this.tracked.forEach((t) => this.paintOne(t));
  }

  recolor({ body, target, iron }: SkinColors) {
    this.body.set(body);
    this.target.set(target);
    this.iron.color.set(iron);
    this.tracked.forEach((t) => this.paintOne(t));
  }

  dispose() {
    this.tracked.forEach(({ mesh }) => mesh.geometry.dispose());
    this.skin.dispose();
    this.iron.dispose();
  }

  private paintOne({ mesh, segment, muscle }: Tracked) {
    const colors = mesh.geometry.attributes.color as THREE.BufferAttribute;
    const whole = segment && this.targets.includes(segment) ? 1 : 0;
    const painted = muscle && this.targets.includes(muscle.segment) ? muscle.weights : null;
    const c = new THREE.Color();
    for (let i = 0; i < colors.count; i++) {
      c.copy(this.body).lerp(this.target, Math.max(whole, painted ? painted[i] : 0));
      colors.setXYZ(i, c.r, c.g, c.b);
    }
    colors.needsUpdate = true;
  }
}
