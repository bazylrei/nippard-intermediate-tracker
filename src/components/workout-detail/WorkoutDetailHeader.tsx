import { ArrowLeft, Check, Pencil } from "lucide-react";
import { dayLabel } from "@/lib/day-types";
import type { WorkoutSession } from "@/lib/types";
import { formatLongDate } from "@/lib/dates";

interface Props {
  session: WorkoutSession;
  exerciseCount: number;
  setCount: number;
  editing: boolean;
  onToggleEdit: () => void;
  onBack: () => void;
}

export default function WorkoutDetailHeader({ session, exerciseCount, setCount, editing, onToggleEdit, onBack }: Props) {
  return (
    <header className="flex items-start gap-3 pt-2">
      <button onClick={onBack} aria-label="Back" className="p-2 -ml-2 text-muted hover:text-fg transition-colors rounded-xl cursor-pointer">
        <ArrowLeft size={20} />
      </button>
      <div className="flex-1 min-w-0">
        <h1 className="font-display font-bold text-2xl text-fg leading-tight">
          {dayLabel(session.dayType)}
        </h1>
        <p className="text-sm text-muted mt-0.5">
          Week {session.week}
          {session.completedAt && <> · {formatLongDate(session.completedAt)}</>}
        </p>
        <p className="text-xs text-subtle mt-0.5">{exerciseCount} exercises · {setCount} sets</p>
      </div>
      <button
        onClick={onToggleEdit}
        aria-pressed={editing}
        className={`glass gloss flex items-center gap-1.5 font-display font-semibold text-sm px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
          editing ? "text-primary" : "text-fg"
        }`}
      >
        {editing ? <><Check size={14} /> Done</> : <><Pencil size={14} /> Edit</>}
      </button>
    </header>
  );
}
