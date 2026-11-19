import WeighInCard from "@/components/widgets/WeighInCard";
import type { WeightUnit } from "@/lib/units";

interface Props {
  unit: WeightUnit;
  /** Logs today's weight (in `unit`) and moves on; rejects if saving fails, for the form to show. */
  onSave: (weight: number) => Promise<void>;
  onSkip: () => void;
}

export default function BodyWeightStep({ unit, onSave, onSkip }: Props) {
  return (
    <div className="flex-1 flex flex-col justify-center gap-6">
      <div className="space-y-2">
        <h1 className="font-display text-3xl font-bold text-fg leading-tight">What do you weigh?</h1>
        <p className="text-sm text-muted">
          Pull-ups and dips count your body weight, so your volume adds up properly. We&apos;ll ask for a quick weigh-in each week to keep it current.
        </p>
      </div>
      <WeighInCard unit={unit} title="Your body weight" dismissLabel="Skip for now" onSave={onSave} onDismiss={onSkip} />
    </div>
  );
}
