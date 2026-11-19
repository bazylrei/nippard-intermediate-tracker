import { WARMUP_PROTOCOLS } from "@/components/builder/constants";
import type { CatalogExercise } from "@/lib/types";

/** Rest, warm-up and how weight is logged, as three tiles. */
export default function ExerciseFacts({ exercise }: { exercise: CatalogExercise }) {
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
