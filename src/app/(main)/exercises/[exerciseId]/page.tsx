"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ExternalLink, Pencil, Trash2 } from "lucide-react";
import { useCatalogExercise } from "@/hooks/useCatalog";
import { useSaveError } from "@/hooks/useSaveError";
import { deleteExercise } from "@/lib/db";
import { equipmentLabel, muscleGroupLabel } from "@/lib/exercise-form";
import { EXERCISES_PATH, editExerciseHref } from "@/lib/exercise-routes";
import { WARMUP_PROTOCOLS } from "@/components/builder/constants";
import FullScreenMessage from "@/components/FullScreenMessage";
import SaveErrorAlert from "@/components/SaveErrorAlert";
import { BackLink } from "@/components/BackToProfile";
import type { CatalogExercise } from "@/lib/types";

const IN_USE = "This exercise is used in a program or in logged sets, so it can't be deleted.";

function ExerciseDetail() {
  const { exerciseId } = useParams<{ exerciseId: string }>();
  const router = useRouter();
  const id = decodeURIComponent(exerciseId);
  const { status, exercise, isOwn } = useCatalogExercise(id);
  const [confirming, setConfirming] = useState(false);
  const saveError = useSaveError();

  if (status === "error") return <FullScreenMessage message="Couldn't load this exercise. Check your connection and try again." />;
  if (status === "missing") return <FullScreenMessage message="Exercise not found." />;
  if (status === "loading" || !exercise) return <FullScreenMessage message="Loading…" />;

  async function handleDelete() {
    setConfirming(false);
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
    <div className="min-h-screen max-w-lg md:max-w-2xl mx-auto flex flex-col p-4 md:p-8 gap-4">
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

      <Facts exercise={exercise} />

      {(exercise.formNote || exercise.instructions) && (
        <section className="glass gloss rounded-2xl p-4 space-y-2 text-sm text-fg">
          <h2 className="font-display font-bold text-xs uppercase tracking-widest text-muted">How to</h2>
          {exercise.formNote && <p className="whitespace-pre-line">{exercise.formNote}</p>}
          {exercise.instructions && <p className="whitespace-pre-line text-muted">{exercise.instructions}</p>}
        </section>
      )}

      {exercise.youtubeUrl && (
        <a href={exercise.youtubeUrl} target="_blank" rel="noopener noreferrer" className="glass gloss rounded-2xl p-4 flex items-center gap-2 text-sm font-medium text-primary">
          <ExternalLink size={16} /> Watch the demo
        </a>
      )}

      {isOwn && (confirming ? (
        <div className="glass gloss rounded-2xl p-4 space-y-3">
          <p className="text-sm text-fg">Delete “{exercise.name}”? This can&apos;t be undone.</p>
          <div className="flex gap-2">
            <button onClick={handleDelete} className="flex-1 rounded-xl py-2 text-sm font-semibold bg-danger/10 text-danger cursor-pointer">Delete</button>
            <button onClick={() => setConfirming(false)} className="flex-1 rounded-xl py-2 text-sm font-semibold bg-elevated text-fg cursor-pointer">Cancel</button>
          </div>
        </div>
      ) : (
        <button onClick={() => setConfirming(true)} className="flex items-center justify-center gap-2 py-3 text-sm font-medium text-danger cursor-pointer">
          <Trash2 size={16} /> Delete exercise
        </button>
      ))}
    </div>
  );
}

function Facts({ exercise }: { exercise: CatalogExercise }) {
  const [restMin, restMax] = exercise.restSeconds;
  const warmup = WARMUP_PROTOCOLS.find((w) => w.value === exercise.warmupProtocol)?.label ?? exercise.warmupProtocol;
  const facts = [
    { label: "Rest", value: restMin === restMax ? `${restMin}s` : `${restMin}–${restMax}s` },
    { label: "Warm-up", value: warmup },
    { label: "Weight", value: exercise.weightPerSide ? "Per side" : exercise.isBodyweight ? "Added to body weight" : "Total" },
  ];
  return (
    <dl className="grid grid-cols-3 gap-2.5">
      {facts.map((f) => (
        <div key={f.label} className="glass gloss rounded-2xl p-3">
          <dt className="text-xs text-muted">{f.label}</dt>
          <dd className="font-display font-semibold text-sm text-fg mt-0.5">{f.value}</dd>
        </div>
      ))}
    </dl>
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
