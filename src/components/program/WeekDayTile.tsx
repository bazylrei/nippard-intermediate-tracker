import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { dayLabel } from "@/lib/day-types";
import type { WorkoutDay } from "@/lib/types";

/** Where a day stands in the current run through the program. */
export type DayStatus = "done" | "next" | "in-progress" | "todo";

interface Props {
  day: WorkoutDay;
  number: number;
  status: DayStatus;
  /** A done day opens its workout's details. */
  href?: string;
  /** Any day not done can be chosen. */
  onSelect?: () => void;
}

const CAPTION: Partial<Record<DayStatus, string>> = { next: "Up next", "in-progress": "In progress" };

export default function WeekDayTile({ day, number, status, href, onSelect }: Props) {
  const isDone = status === "done";
  const highlighted = status === "next" || status === "in-progress";
  const caption = CAPTION[status];
  const body = (
    <>
      <div className="flex items-center justify-between mb-2">
        <span
          className={`w-6 h-6 rounded-lg flex items-center justify-center font-display font-bold text-xs ${
            isDone ? "bg-accent/20 text-accent" : highlighted ? "bg-primary/20 text-primary" : "text-muted"
          }`}
          style={!isDone && !highlighted ? { background: "color-mix(in srgb, var(--fg) 8%, transparent)" } : {}}
        >
          {isDone ? "✓" : number}
        </span>
        {(href || onSelect) && <ChevronRight size={14} className={highlighted ? "text-primary" : "text-subtle"} />}
      </div>
      <p className={`font-display font-semibold text-sm leading-tight ${isDone ? "text-muted" : "text-fg"}`}>
        {dayLabel(day.dayType)}
      </p>
      <p className="text-xs text-subtle mt-0.5">
        {caption ? <span className="text-primary font-display font-semibold">{caption}</span> : `${day.exercises.length} exercises`}
      </p>
    </>
  );

  const className = `glass gloss rounded-2xl p-4 text-left transition-opacity ${isDone ? "opacity-50" : ""}`;
  const style = highlighted ? { borderColor: "color-mix(in srgb, var(--primary) 35%, transparent)" } : {};

  if (href) return <Link href={href} className={`${className} block hover:opacity-80`} style={style}>{body}</Link>;
  if (onSelect) {
    return (
      <button type="button" onClick={onSelect} className={`${className} w-full cursor-pointer hover:opacity-80`} style={style}>
        {body}
      </button>
    );
  }
  return <div className={className} style={style}>{body}</div>;
}
