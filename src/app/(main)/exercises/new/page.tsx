"use client";

import { useRef } from "react";
import { useRouter } from "next/navigation";
import { createExercise, newExerciseId } from "@/lib/db";
import { EMPTY_DRAFT } from "@/lib/exercise-form";
import { EXERCISES_PATH, exerciseHref } from "@/lib/exercise-routes";
import ExerciseForm from "@/components/exercises/ExerciseForm";
import BackLink from "@/components/widgets/BackLink";
import type { ExerciseInput } from "@/lib/types";

export default function NewExercisePage() {
  const router = useRouter();
  // Made on the first save (not while rendering, which also runs at build time) and kept:
  // saving again after a failure reuses it, so it can't add the exercise twice.
  const idRef = useRef<string | null>(null);

  async function save(input: ExerciseInput) {
    const id = (idRef.current ??= newExerciseId());
    await createExercise(id, input);
    router.replace(exerciseHref(id));
  }

  return (
    <div className="main-min-viewport max-w-lg md:max-w-2xl mx-auto flex flex-col p-4 md:p-8 gap-4">
      <header className="flex items-center gap-2 pt-2">
        <BackLink href={EXERCISES_PATH} label="Back to Exercises" />
        <h1 className="font-display font-bold text-xl text-fg">New exercise</h1>
      </header>
      <ExerciseForm initial={EMPTY_DRAFT} submitLabel="Add exercise" onSave={save} />
    </div>
  );
}
