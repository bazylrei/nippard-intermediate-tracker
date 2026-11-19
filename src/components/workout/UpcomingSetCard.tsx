interface Props {
  setNumber: number;
  repRange: [number, number];
  targetRpe?: [number, number];
}

/** Carousel slide previewing a set that comes after the current one. */
export default function UpcomingSetCard({ setNumber, repRange, targetRpe }: Props) {
  return (
    <div className="glass rounded-2xl p-4 space-y-2 opacity-60">
      <span className="font-display font-bold text-base uppercase tracking-wide text-subtle">Set {setNumber}</span>
      <p className="text-sm text-muted">
        {repRange[0]}–{repRange[1]} reps{targetRpe && ` · RPE ${targetRpe[0]}–${targetRpe[1]}`}
      </p>
    </div>
  );
}
