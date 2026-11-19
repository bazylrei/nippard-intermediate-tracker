"use client";

import dynamic from "next/dynamic";
import { motionFor } from "@/lib/animation/motions";

// three.js is large; it only downloads on screens that actually show an animation.
const Canvas = dynamic(() => import("./ExerciseAnimationCanvas"), {
  ssr: false,
  loading: () => <div className="w-full aspect-[4/3] bg-elevated animate-pulse" aria-hidden />,
});

/** The 3D demo of how to perform an exercise, or nothing for exercises that don't have one yet. */
export default function ExerciseAnimation({ exerciseName }: { exerciseName: string }) {
  const motion = motionFor(exerciseName);
  if (!motion) return null;
  return (
    <section aria-label={`How to do ${exerciseName}`} className="glass gloss rounded-2xl overflow-hidden">
      <Canvas motion={motion} />
    </section>
  );
}
