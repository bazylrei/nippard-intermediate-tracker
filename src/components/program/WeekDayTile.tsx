import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { dayLabel } from "@/lib/day-types";
import type { WorkoutDay } from "@/lib/types";

interface Props {
  day: WorkoutDay;
  number: number;
  isDone: boolean;
  isNext: boolean;
  /** Set for a completed day — the tile then opens that workout's details. */
  href?: string;
}

export default function WeekDayTile({ day, number, isDone, isNext, href }: Props) {
  const body = (
    <>
      <div className="flex items-center justify-between mb-2">
        <span
          className={`w-6 h-6 rounded-lg flex items-center justify-center font-display font-bold text-xs ${
            isDone ? "bg-accent/20 text-accent" : isNext ? "bg-primary/20 text-primary" : "text-muted"
          }`}
          style={!isDone && !isNext ? { background: "color-mix(in srgb, var(--fg) 8%, transparent)" } : {}}
        >
          {isDone ? "✓" : number}
        </span>
        {(isNext || href) && <ChevronRight size={14} className={isNext ? "text-primary" : "text-subtle"} />}
      </div>
      <p className={`font-display font-semibold text-sm leading-tight ${isNext ? "text-fg" : "text-muted"}`}>
        {dayLabel(day.dayType)}
      </p>
      <p className="text-xs text-subtle mt-0.5">{day.exercises.length} exercises</p>
    </>
  );

  const className = `glass gloss rounded-2xl p-4 transition-opacity ${isDone ? "opacity-50" : ""}`;
  const style = isNext ? { borderColor: "color-mix(in srgb, var(--primary) 35%, transparent)" } : {};

  return href ? (
    <Link href={href} className={`${className} block hover:opacity-80`} style={style}>{body}</Link>
  ) : (
    <div className={className} style={style}>{body}</div>
  );
}
