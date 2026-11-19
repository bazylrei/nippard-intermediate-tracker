"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ExternalLink, Pencil } from "lucide-react";
import { useCatalogExercise } from "@/hooks/useCatalog";
import { useSaveError } from "@/hooks/useSaveError";
import { deleteExercise } from "@/lib/db";
import { equipmentLabel, muscleGroupLabel } from "@/lib/exercise-form";
import { EXERCISES_PATH, editExerciseHref } from "@/lib/exercise-routes";
import ExerciseFacts from "@/components/exercises/ExerciseFacts";
import ExerciseAnimation from "@/components/exercise-animation/ExerciseAnimation";
import ExerciseHowTo from "@/components/exercises/ExerciseHowTo";
import DeleteExerciseControl from "@/components/exercises/DeleteExerciseControl";
import FullScreenMessage from "@/components/widgets/FullScreenMessage";
import SaveErrorAlert from "@/components/widgets/SaveErrorAlert";
import BackLink from "@/components/widgets/BackLink";
import VideoLink from "@/components/widgets/VideoLink";

const IN_USE = "This exercise is used in a program or in logged sets, so it can't be deleted.";

function ExerciseDetail() {
  const { exerciseId } = useParams<{ exerciseId: string }>();
  const router = useRouter();
  const id = decodeURIComponent(exerciseId);
  const { status, exercise, isOwn } = useCatalogExercise(id);
  const saveError = useSaveError();

  if (status === "error") return <FullScreenMessage message="Couldn't load this exercise. Check your connection and try again." />;
  if (status === "missing") return <FullScreenMessage message="Exercise not found." />;
  if (status === "loading" || !exercise) return <FullScreenMessage message="Loading…" />;

  async function handleDelete() {
    let deleted: boolean;
    try {
      deleted = await deleteExercise(id);
    } catch (error) {
      saveError.report("Couldn't delete the exercise. Try again.", error);
      return;
    }
    if (deleted) router.replace(EXERCISES_PATH);
    else saveError.report(IN_USE);
  }

  return (
    <div className="main-min-viewport max-w-lg md:max-w-2xl mx-auto flex flex-col p-4 md:p-8 gap-4">
      <header className="flex items-start gap-2 pt-2">
        <BackLink href={EXERCISES_PATH} label="Back to Exercises" />
        <div className="flex-1 min-w-0">
          <h1 className="font-display font-bold text-2xl text-fg leading-tight">{exercise.name}</h1>
          <p className="text-sm text-muted mt-0.5">
            {muscleGroupLabel(exercise.muscleGroup)}
            {equipmentLabel(exercise.equipment) && <> · {equipmentLabel(exercise.equipment)}</>}
            {isOwn && <> · Added by you</>}
          </p>
        </div>
        {isOwn && (
          <Link href={editExerciseHref(id)} className="glass gloss flex items-center gap-1.5 font-display font-semibold text-sm text-fg px-3 py-1.5 rounded-lg">
            <Pencil size={14} /> Edit
          </Link>
        )}
      </header>

      {saveError.message && <SaveErrorAlert message={saveError.message} onDismiss={saveError.clear} />}

      {/* Built-in exercises only: a custom exercise could share a name with one that has an animation. */}
      {exercise.createdBy === null && <ExerciseAnimation exerciseName={exercise.name} />}

      <ExerciseFacts exercise={exercise} />

      <ExerciseHowTo exercise={exercise} />

      {exercise.youtubeUrl && (
        <VideoLink url={exercise.youtubeUrl} className="glass gloss rounded-2xl p-4 flex items-center gap-2 text-sm font-medium text-primary">
          <ExternalLink size={16} /> Watch the demo
        </VideoLink>
      )}

      {isOwn && <DeleteExerciseControl name={exercise.name} onDelete={handleDelete} />}
    </div>
  );
}

/** useParams needs a Suspense boundary to prerender. */
export default function ExerciseDetailPage() {
  return (
    <Suspense>
      <ExerciseDetail />
    </Suspense>
  );
}
