interface Props {
  doneCount: number;
  totalSessions: number;
  firstWeek: number;
  lastWeek: number;
}

/** How far through the program the current run is: count, bar and the weeks at either end. */
export default function ProgramProgressCard({ doneCount, totalSessions, firstWeek, lastWeek }: Props) {
  const progressPct = totalSessions ? Math.round((doneCount / totalSessions) * 100) : 0;
  return (
    <div className="glass gloss rounded-2xl p-5 space-y-3">
      <div className="flex items-center justify-between">
        <span className="font-display font-semibold text-xs uppercase tracking-widest text-muted">Program Progress</span>
        <span className="font-display font-bold text-sm text-fg">
          {doneCount}<span className="text-muted font-normal"> / {totalSessions}</span>
        </span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "color-mix(in srgb, var(--fg) 10%, transparent)" }}>
        <div
          className="h-full bg-primary rounded-full transition-all duration-500"
          style={{ width: `${progressPct}%`, boxShadow: "0 0 8px var(--primary)" }}
        />
      </div>
      <div className="flex justify-between text-xs text-subtle">
        <span>Week {firstWeek}</span>
        <span className="text-muted font-display font-semibold">{progressPct}% complete</span>
        <span>Week {lastWeek}</span>
      </div>
    </div>
  );
}
