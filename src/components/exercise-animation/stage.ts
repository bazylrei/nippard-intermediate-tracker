import * as THREE from "three";
import { poseAt, type Motion } from "@/lib/animation/motion";
import { createFigure, type FigureColors } from "./figure";
import { createCamera } from "./framing";

/** A running demo in the page. Browser only: it needs WebGL and the DOM. */
export interface Stage {
  setPlaying(playing: boolean): void;
  /** Re-reads the theme's colours (after a light / dark switch). */
  recolor(): void;
  dispose(): void;
}

export function webglAvailable(): boolean {
  try {
    return !!document.createElement("canvas").getContext("webgl2");
  } catch {
    return false;
  }
}

const token = (name: string, fallback: string) =>
  getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;

function themeColors(): FigureColors & { floor: string } {
  return {
    body: token("--muted", "#6F6F6B"),
    target: token("--primary", "#E8540A"),
    iron: token("--fg", "#111110"),
    floor: token("--border", "#D4D3CB"),
  };
}

/** A soft round shadow, drawn once: cheaper than real shadow maps and never shows jagged edges. */
function contactShadow(): THREE.Mesh {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext("2d")!;
  const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  gradient.addColorStop(0, "rgba(0,0,0,0.35)");
  gradient.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 128, 128);
  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(0.9, 0.9),
    new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(canvas), transparent: true, depthWrite: false }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.002;
  return shadow;
}

function buildScene(motion: Motion) {
  const colors = themeColors();
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xffffff, 0x77736c, 1.5));
  const key = new THREE.DirectionalLight(0xffffff, 2.2);
  key.position.set(2, 4, 3);
  const rim = new THREE.DirectionalLight(0xffffff, 0.8);
  rim.position.set(-3, 2, -2);
  scene.add(key, rim);

  const floor = new THREE.Mesh(new THREE.CircleGeometry(0.85, 64), new THREE.MeshBasicMaterial({ color: colors.floor }));
  floor.rotation.x = -Math.PI / 2;
  const shadow = contactShadow();
  const figure = createFigure(colors);
  figure.hold(motion.prop);
  figure.highlight(motion.targets);
  scene.add(floor, shadow, figure.root);

  return {
    scene,
    figure,
    recolor() {
      const next = themeColors();
      figure.recolor(next);
      (floor.material as THREE.MeshBasicMaterial).color.set(next.floor);
    },
    dispose() {
      figure.dispose();
      for (const mesh of [floor, shadow]) {
        mesh.geometry.dispose();
        const material = mesh.material as THREE.MeshBasicMaterial;
        material.map?.dispose();
        material.dispose();
      }
    },
  };
}

/** A clock for the rep that only advances while playing, so pausing freezes the pose mid-rep. */
function repClock(seconds: number, startAt: number) {
  let elapsed = startAt * seconds;
  let last: number | null = null;
  return {
    tick(now: number, playing: boolean) {
      if (playing && last !== null) elapsed += (now - last) / 1000;
      last = playing ? now : null;
      return (elapsed % seconds) / seconds;
    },
  };
}

/** Starts a demo inside `host`. Shows `motion.peak` as a still until played. */
export function createStage(host: HTMLElement, motion: Motion, playing: boolean): Stage {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.domElement.style.display = "block";
  host.appendChild(renderer.domElement);
  const world = buildScene(motion);
  const camera = createCamera();
  const clock = repClock(motion.seconds, playing ? 0 : motion.peak);
  let onScreen = true;
  let frame = 0;

  const draw = (now: number) => {
    world.figure.pose(poseAt(motion, clock.tick(now, playing && onScreen && !document.hidden)));
    renderer.render(world.scene, camera);
  };
  const loop = (now: number) => {
    draw(now);
    frame = playing && onScreen && !document.hidden ? requestAnimationFrame(loop) : 0;
  };
  /** Draws once now, and keeps going only if the demo should be moving. */
  const refresh = () => {
    if (!frame) loop(performance.now());
  };
  const resize = () => {
    const { clientWidth: width, clientHeight: height } = host;
    if (!width || !height) return;
    renderer.setSize(width, height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    draw(performance.now());
  };

  const resizer = new ResizeObserver(resize);
  resizer.observe(host);
  const visibility = new IntersectionObserver(([entry]) => { onScreen = entry.isIntersecting; refresh(); });
  visibility.observe(host);
  document.addEventListener("visibilitychange", refresh);
  resize();
  refresh();

  return {
    setPlaying(next) {
      playing = next;
      refresh();
    },
    recolor() {
      world.recolor();
      draw(performance.now());
    },
    dispose() {
      cancelAnimationFrame(frame);
      resizer.disconnect();
      visibility.disconnect();
      document.removeEventListener("visibilitychange", refresh);
      world.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
