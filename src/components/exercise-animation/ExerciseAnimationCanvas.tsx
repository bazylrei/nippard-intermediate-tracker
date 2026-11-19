"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { poseAt, type Motion } from "@/lib/animation/motion";
import { createMannequin } from "./mannequin";

/** One fixed three-quarter view for every exercise, so the set reads as one system. */
const CAMERA_POSITION = new THREE.Vector3(2.4, 1.45, 3.65);
const CAMERA_TARGET = new THREE.Vector3(0, 0.8, 0);

const token = (name: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

function webglAvailable(): boolean {
  try {
    return !!document.createElement("canvas").getContext("webgl2");
  } catch {
    return false;
  }
}

/** Draws the looping animation. Pauses when scrolled away or the tab is hidden; a still frame if motion is reduced. */
export default function ExerciseAnimationCanvas({ motion }: { motion: Motion }) {
  const hostRef = useRef<HTMLDivElement>(null);
  // Decided once on the client (this component never renders on the server).
  const [supported] = useState(webglAvailable);

  useEffect(() => {
    const host = hostRef.current;
    if (!host || !supported) return;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    host.appendChild(renderer.domElement);
    renderer.domElement.style.display = "block";

    const scene = new THREE.Scene();
    scene.add(new THREE.HemisphereLight(0xffffff, 0x8a8a85, 1.6));
    const sun = new THREE.DirectionalLight(0xffffff, 2);
    sun.position.set(2, 4, 3);
    scene.add(sun);

    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(0.75, 48),
      new THREE.MeshBasicMaterial({ color: token("--border") || "#D4D3CB" }),
    );
    floor.rotation.x = -Math.PI / 2;
    scene.add(floor);

    const mannequin = createMannequin({ body: token("--muted") || "#6F6F6B", accent: token("--primary") || "#E8540A" });
    mannequin.hold(motion.prop);
    scene.add(mannequin.root);

    const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
    camera.position.copy(CAMERA_POSITION);
    camera.lookAt(CAMERA_TARGET);

    const draw = (phase: number) => {
      mannequin.apply(poseAt(motion, phase), motion.plantFeet);
      renderer.render(scene, camera);
    };
    const resize = () => {
      const { clientWidth: w, clientHeight: h } = host;
      if (!w || !h) return;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let visible = true;
    let frame = 0;
    let startedAt = 0;

    const tick = (now: number) => {
      frame = 0;
      if (!visible || document.hidden) return;
      if (!startedAt) startedAt = now;
      draw((((now - startedAt) / 1000) % motion.seconds) / motion.seconds);
      frame = requestAnimationFrame(tick);
    };
    const refresh = () => {
      resize();
      if (reducedMotion) draw(motion.peak);
      else if (!frame && visible && !document.hidden) frame = requestAnimationFrame(tick);
    };

    const resizeObserver = new ResizeObserver(refresh);
    resizeObserver.observe(host);
    const visibility = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; refresh(); });
    visibility.observe(host);
    document.addEventListener("visibilitychange", refresh);
    refresh();

    return () => {
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      visibility.disconnect();
      document.removeEventListener("visibilitychange", refresh);
      mannequin.dispose();
      floor.geometry.dispose();
      (floor.material as THREE.Material).dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [motion, supported]);

  if (!supported) return null;
  return <div ref={hostRef} className="w-full aspect-[4/3]" />;
}
