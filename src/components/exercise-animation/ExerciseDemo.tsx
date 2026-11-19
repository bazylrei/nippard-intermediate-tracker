"use client";

import dynamic from "next/dynamic";
import { motionFor } from "@/lib/animation/library";
import type { CatalogExercise } from "@/lib/types";

// three.js is large: it downloads only when a demo is actually on screen.
const Player = dynamic(() => import("./ExerciseAnimationPlayer"), {
  ssr: false,
  loading: () => <div className="w-full aspect-[4/3] bg-elevated animate-pulse" aria-hidden />,
});

/**
 * The 3D demo of how to do an exercise, or nothing when there isn't one. Built-ins only: a
 * custom exercise can share a built-in's name without being the same movement.
 */
export default function ExerciseDemo({ exercise }: { exercise: Pick<CatalogExercise, "name" | "createdBy"> }) {
  const motion = exercise.createdBy === null ? motionFor(exercise.name) : undefined;
  if (!motion) return null;
  return (
    <section aria-label={`How to do ${exercise.name}`} className="glass gloss rounded-2xl overflow-hidden">
      <Player motion={motion} />
    </section>
  );
}
