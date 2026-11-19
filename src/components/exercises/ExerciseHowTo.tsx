import type { CatalogExercise } from "@/lib/types";

/** Form notes and instructions; nothing when the exercise has neither. */
export default function ExerciseHowTo({ exercise }: { exercise: CatalogExercise }) {
  if (!exercise.formNote && !exercise.instructions) return null;
  return (
    <section className="glass gloss rounded-2xl p-4 space-y-2 text-sm text-fg">
      <h2 className="font-display font-bold text-xs uppercase tracking-widest text-muted">How to</h2>
      {exercise.formNote && <p className="whitespace-pre-line">{exercise.formNote}</p>}
      {exercise.instructions && <p className="whitespace-pre-line text-muted">{exercise.instructions}</p>}
    </section>
  );
}
