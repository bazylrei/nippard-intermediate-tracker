"use client";

import { Suspense } from "react";
import { useParams, useRouter } from "next/navigation";
import { useCatalogExercise } from "@/hooks/useCatalog";
import { updateExercise } from "@/lib/db";
import { draftFrom } from "@/lib/exercise-form";
import { exerciseHref } from "@/lib/exercise-routes";
import ExerciseForm from "@/components/exercises/ExerciseForm";
import FullScreenMessage from "@/components/FullScreenMessage";
import { BackLink } from "@/components/BackToProfile";
import type { ExerciseInput } from "@/lib/types";

function EditExercise() {
  const { exerciseId } = useParams<{ exerciseId: string }>();
  const id = decodeURIComponent(exerciseId);
  const router = useRouter();
  const { status, exercise, isOwn } = useCatalogExercise(id);

  if (status === "error") return <FullScreenMessage message="Couldn't load this exercise. Check your connection and try again." />;
  if (status === "missing") return <FullScreenMessage message="Exercise not found." />;
  if (status === "loading" || !exercise) return <FullScreenMessage message="Loading…" />;
  if (!isOwn) return <FullScreenMessage message="You can only edit exercises you added." />;

  async function save(input: ExerciseInput) {
    await updateExercise(id, input);
    router.replace(exerciseHref(id));
  }

  return (
    <div className="main-min-viewport max-w-lg md:max-w-2xl mx-auto flex flex-col p-4 md:p-8 gap-4">
      <header className="flex items-center gap-2 pt-2">
        <BackLink href={exerciseHref(id)} label="Back to exercise" />
        <h1 className="font-display font-bold text-xl text-fg">Edit exercise</h1>
      </header>
      <ExerciseForm initial={draftFrom(exercise)} submitLabel="Save changes" onSave={save} />
    </div>
  );
}

/** useParams needs a Suspense boundary to prerender. */
export default function EditExercisePage() {
  return (
    <Suspense>
      <EditExercise />
    </Suspense>
  );
}
