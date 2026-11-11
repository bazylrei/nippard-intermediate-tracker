"use client";

import { useEffect, useState, useRef } from "react";
import { X } from "lucide-react";

interface Props {
  durationSeconds: number;
  onComplete: () => void;
  onSkip: () => void;
}

export default function RestTimer({ durationSeconds, onComplete, onSkip }: Props) {
  const endTimeRef = useRef(Date.now() + durationSeconds * 1000);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [remaining, setRemaining] = useState(durationSeconds);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    endTimeRef.current = Date.now() + durationSeconds * 1000;

    function tick() {
      const rem = Math.max(0, Math.ceil((endTimeRef.current - Date.now()) / 1000));
      setRemaining(rem);
      if (rem === 0) {
        clearInterval(intervalRef.current!);
        onCompleteRef.current();
      }
    }

    function handleVisibility() {
      if (!document.hidden) tick();
    }

    tick();
    intervalRef.current = setInterval(tick, 500);
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      clearInterval(intervalRef.current!);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [durationSeconds]);

  const pct = (durationSeconds - remaining) / durationSeconds;
  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;

  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - pct);

  return (
    <div className="fixed inset-0 flex items-end justify-center p-4 z-50"
      style={{ background: "color-mix(in srgb, var(--bg) 50%, transparent)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)" }}>
      <div className="w-full max-w-sm glass-strong gloss rounded-2xl p-6 space-y-5"
        style={{ boxShadow: "0 8px 40px color-mix(in srgb, var(--bg) 60%, transparent), 0 0 0 1px color-mix(in srgb, var(--fg) 8%, transparent)" }}>
        <div className="flex items-center justify-between">
          <span className="font-display font-semibold text-xs tracking-widest text-muted uppercase">Rest</span>
          <button onClick={onSkip} className="text-subtle hover:text-fg transition-colors cursor-pointer p-1 -mr-1">
            <X size={18} />
          </button>
        </div>

        <div className="flex justify-center">
          <div className="relative w-36 h-36">
            <svg className="-rotate-90 w-full h-full" viewBox="0 0 140 140">
              <circle cx="70" cy="70" r={radius} strokeWidth="6" stroke="color-mix(in srgb, var(--fg) 10%, transparent)" fill="none" />
              <circle
                cx="70" cy="70" r={radius}
                strokeWidth="6"
                stroke="var(--primary)"
                fill="none"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                style={{
                  transition: "stroke-dashoffset 0.5s linear",
                  filter: "drop-shadow(0 0 6px var(--primary))",
                }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-display text-4xl font-bold text-fg tabular-nums leading-none">
                {mins}:{secs.toString().padStart(2, "0")}
              </span>
              <span className="text-xs text-muted mt-1">remaining</span>
            </div>
          </div>
        </div>

        <button
          onClick={onSkip}
          className="glass w-full flex items-center justify-center gap-2 text-fg font-medium py-3 rounded-xl transition-colors cursor-pointer hover:text-primary"
        >
          Skip Rest
        </button>
      </div>
    </div>
  );
}
