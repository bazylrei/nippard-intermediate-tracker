import { Play } from "lucide-react";
import { dayLabel } from "@/lib/day-types";
import type { WorkoutDay } from "@/lib/types";

const PREVIEW_COUNT = 3;

interface Props {
  week: number;
  totalWeeks: number;
  sessionNumber: number;
  day: WorkoutDay;
  isResume: boolean;
  onStart: () => void;
}

export default function NextWorkoutCard({ week, totalWeeks, sessionNumber, day, isResume, onStart }: Props) {
  const extra = day.exercises.length - PREVIEW_COUNT;
  return (
    <div className="glass gloss rounded-2xl overflow-hidden">
      <div className="px-5 pt-4 flex items-center justify-between">
        <span className="font-display font-bold text-xs uppercase tracking-widest text-primary">
          {isResume ? "Resume workout" : "Suggested next"}
        </span>
        <span className="font-display font-bold text-xs text-muted">Session {sessionNumber}</span>
      </div>
      <div className="px-5 pt-2 pb-3">
        <h2 className="font-display font-bold text-2xl text-fg leading-tight">{dayLabel(day.dayType)}</h2>
        <p className="text-sm text-muted mt-0.5">
          Week {week} of {totalWeeks} · {day.exercises.length} exercises
        </p>
        <p className="text-xs text-subtle mt-2">
          {day.exercises.slice(0, PREVIEW_COUNT).map((e) => e.name).join(" · ")}
          {extra > 0 && ` · +${extra} more`}
        </p>
      </div>
      <div className="px-5 pb-5">
        <button
          onClick={onStart}
          className="btn-primary gloss w-full flex items-center justify-center gap-2 font-display font-bold text-base py-3.5 rounded-2xl"
        >
          <Play size={16} fill="currentColor" />
          {isResume ? "Resume workout" : "Start workout"}
        </button>
      </div>
    </div>
  );
}
