"use client";

import { useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";
import type { Motion } from "@/lib/animation/motion";
import { createStage, webglAvailable, type Stage } from "./stage";

const prefersReducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * The demo with a pause / play control: anything moving for more than five seconds must be
 * pausable (WCAG 2.2.2). People who ask for reduced motion start on a still of the hardest
 * point and can press play if they want the movement.
 */
export default function ExerciseAnimationPlayer({ motion }: { motion: Motion }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Stage | null>(null);
  // This component only renders in the browser (no SSR), so these can read it directly.
  const [supported] = useState(webglAvailable);
  const [playing, setPlaying] = useState(() => !prefersReducedMotion());
  const playingRef = useRef(playing);

  useEffect(() => {
    const host = hostRef.current;
    if (!host || !supported) return;
    const stage = createStage(host, motion, playingRef.current);
    stageRef.current = stage;
    // Follow a light / dark switch, whether from the app's toggle or the device.
    const themeObserver = new MutationObserver(() => stage.recolor());
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    const scheme = window.matchMedia("(prefers-color-scheme: dark)");
    const onScheme = () => stage.recolor();
    scheme.addEventListener("change", onScheme);
    return () => {
      themeObserver.disconnect();
      scheme.removeEventListener("change", onScheme);
      stage.dispose();
      stageRef.current = null;
    };
  }, [motion, supported]);

  function toggle() {
    const next = !playing;
    playingRef.current = next;
    setPlaying(next);
    stageRef.current?.setPlaying(next);
  }

  if (!supported) return null;
  return (
    <div className="relative w-full aspect-[4/3]">
      <div ref={hostRef} className="absolute inset-0" />
      <button
        type="button"
        onClick={toggle}
        aria-label={playing ? "Pause animation" : "Play animation"}
        className="absolute bottom-2.5 right-2.5 w-9 h-9 rounded-full glass flex items-center justify-center text-fg cursor-pointer"
      >
        {playing ? <Pause size={16} /> : <Play size={16} />}
      </button>
    </div>
  );
}
