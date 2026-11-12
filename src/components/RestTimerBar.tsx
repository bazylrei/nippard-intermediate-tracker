"use client";

import { useRestTimer } from "@/context/RestTimerContext";
import { Timer, X } from "lucide-react";

export default function RestTimerBar() {
  const { isActive, remaining, total, stop } = useRestTimer();

  if (!isActive) return null;

  const pct = total > 0 ? (remaining / total) * 100 : 0;
  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;

  return (
    <div
      className="fixed left-0 right-0 z-50"
      style={{ top: 0 }}
    >
      <div
        className="relative overflow-hidden"
        style={{
          background: "var(--surface)",
          borderBottom: "1px solid color-mix(in srgb, var(--fg) 8%, transparent)",
          paddingTop: "env(safe-area-inset-top, 0px)",
        }}
      >
        {/* Background fill */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            width: `${pct}%`,
            background: "color-mix(in srgb, var(--primary) 10%, transparent)",
            top: "env(safe-area-inset-top, 0px)",
            transition: "width 0.5s linear",
          }}
        />

        {/* Content row */}
        <div className="relative flex items-center gap-3 px-4 py-2.5">
          <Timer size={14} className="text-primary shrink-0" />
          <span className="font-display font-semibold text-xs uppercase tracking-widest text-muted">Rest</span>
          <span className="font-display font-bold text-lg text-fg tabular-nums ml-auto">
            {mins}:{secs.toString().padStart(2, "0")}
          </span>
          <button
            onClick={stop}
            className="text-subtle hover:text-fg transition-colors cursor-pointer ml-1 shrink-0"
            aria-label="Skip rest"
          >
            <X size={16} />
          </button>
        </div>

        {/* Progress line */}
        <div className="h-0.5" style={{ background: "color-mix(in srgb, var(--fg) 6%, transparent)" }}>
          <div
            className="h-full bg-primary"
            style={{ width: `${pct}%`, transition: "width 0.5s linear" }}
          />
        </div>
      </div>
    </div>
  );
}
