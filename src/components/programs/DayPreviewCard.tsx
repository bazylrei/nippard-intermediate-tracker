import { dayLabel } from "@/lib/day-types";
import type { BuilderDay } from "@/lib/types";

/** One day of a program, read-only: its exercises with sets and reps. */
export default function DayPreviewCard({ day }: { day: BuilderDay }) {
  const exercises = [...day.exercises].sort((a, b) => a.position - b.position);
  return (
    <section aria-label={`Day ${day.dayIndex + 1}`} className="glass gloss rounded-2xl p-4 space-y-3">
      <div className="flex items-center gap-3">
        <span
          className="w-6 h-6 rounded-lg flex items-center justify-center font-display font-bold text-xs text-muted"
          style={{ background: "color-mix(in srgb, var(--fg) 8%, transparent)" }}
        >
          {day.dayIndex + 1}
        </span>
        <h3 className="font-display font-bold text-base text-fg leading-tight">{dayLabel(day.dayType)}</h3>
      </div>
      {exercises.length === 0 ? (
        <p className="text-xs text-subtle italic">No exercises yet.</p>
      ) : (
        <ul className="space-y-2">
          {exercises.map((ex) => (
            <li key={ex.pdeId} className="flex items-baseline gap-3 text-sm">
              <span className="flex-1 min-w-0 text-fg truncate">{ex.name}</span>
              <span className="text-xs text-muted shrink-0">
                {ex.earlySetCount + ex.lastSetCount} sets · {ex.repRangeMin}–{ex.repRangeMax} reps
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
