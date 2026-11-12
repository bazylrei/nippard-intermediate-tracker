import Link from "next/link";
import { CheckCircle2, ChevronRight } from "lucide-react";
import { DAY_LABELS } from "@/lib/program-data";
import { formatRelativeDay, type WorkoutFeedItem } from "@/lib/feed";
import { workoutDetailHref } from "@/lib/workout-history";

/** The one row used wherever a completed workout is listed (Home feed, Progress history). */
export default function CompletedWorkoutCell({ item }: { item: WorkoutFeedItem }) {
  const { session, exerciseCount, setCount } = item;
  return (
    <Link
      href={workoutDetailHref(session.id)}
      className="glass gloss rounded-2xl p-4 flex items-center gap-3 transition-opacity hover:opacity-90"
    >
      <CheckCircle2 size={20} className="text-accent shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="font-display font-semibold text-sm text-fg truncate">
          {DAY_LABELS[session.dayType] ?? session.dayType}
          <span className="text-muted font-normal"> · Week {session.week}</span>
        </p>
        <p className="text-xs text-muted mt-0.5">
          {exerciseCount} exercises · {setCount} sets
        </p>
      </div>
      <span className="text-xs text-subtle shrink-0">
        {session.completedAt ? formatRelativeDay(session.completedAt) : ""}
      </span>
      <ChevronRight size={16} className="text-subtle shrink-0" />
    </Link>
  );
}
