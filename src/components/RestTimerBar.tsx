"use client";

import { useRestTimer } from "@/context/RestTimerContext";
import { Timer, X } from "lucide-react";

interface Props {
  /**
   * "overlay" pins the bar over the top of the page. "inline" puts it in the
   * page's flow, pushing the content down instead of covering it: the workout
   * screen uses it so its header (exercise list, progress) stays reachable while resting.
   */
  placement?: "overlay" | "inline";
}

export default function RestTimerBar({ placement = "overlay" }: Props) {
  const { isActive, remaining, total, stop } = useRestTimer();

  if (!isActive) return null;

  // The overlay sits under the status bar, so it clears the safe area itself; inline, the page already has.
  const safeTop = placement === "overlay" ? "env(safe-area-inset-top, 0px)" : "0px";
  const pct = total > 0 ? (remaining / total) * 100 : 0;
  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;

  return (
    <div className={placement === "overlay" ? "fixed top-0 left-0 right-0 z-50" : "shrink-0"}>
      <div
        className="relative overflow-hidden"
        style={{
          background: "var(--surface)",
          borderBottom: "1px solid color-mix(in srgb, var(--fg) 8%, transparent)",
          paddingTop: safeTop,
        }}
      >
        {/* Background fill */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            width: `${pct}%`,
            background: "color-mix(in srgb, var(--primary) 10%, transparent)",
            top: safeTop,
            transition: "width 0.5s linear",
          }}
        />

        {/* Content row */}
        <div className="relative flex items-center gap-3 px-4 py-3">
          <div className="flex items-center gap-2 w-20 shrink-0">
            <Timer size={18} className="text-primary shrink-0" />
            <span className="font-display font-semibold text-sm uppercase tracking-widest text-muted">Rest</span>
          </div>
          <span
            role="timer"
            aria-label="Rest remaining"
            className="flex-1 text-center font-display font-bold text-4xl leading-none text-primary tabular-nums"
          >
            {mins}:{secs.toString().padStart(2, "0")}
          </span>
          <div className="w-20 shrink-0 flex justify-end">
            <button
              onClick={stop}
              className="text-subtle hover:text-fg transition-colors cursor-pointer p-1"
              aria-label="Skip rest"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Progress line */}
        <div className="h-1" style={{ background: "color-mix(in srgb, var(--fg) 6%, transparent)" }}>
          <div
            className="h-full bg-primary"
            style={{ width: `${pct}%`, transition: "width 0.5s linear" }}
          />
        </div>
      </div>
    </div>
  );
}
