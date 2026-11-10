"use client";

import { useEffect, useState, useRef } from "react";
import { X, SkipForward } from "lucide-react";

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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end justify-center p-4 z-50">
      <div className="w-full max-w-sm bg-surface rounded-2xl p-6 space-y-5 border border-border">
        <div className="flex items-center justify-between">
          <span className="font-display font-semibold text-xs tracking-widest text-muted uppercase">Rest</span>
          <button onClick={onSkip} className="text-subtle hover:text-fg transition-colors cursor-pointer p-1 -mr-1">
            <X size={18} />
          </button>
        </div>

        <div className="flex justify-center">
          <div className="relative w-36 h-36">
            <svg className="-rotate-90 w-full h-full" viewBox="0 0 140 140">
              <circle cx="70" cy="70" r={radius} strokeWidth="6" stroke="var(--border)" fill="none" />
              <circle
                cx="70" cy="70" r={radius}
                strokeWidth="6"
                stroke="var(--primary)"
                fill="none"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                style={{ transition: "stroke-dashoffset 0.5s linear" }}
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
          className="w-full flex items-center justify-center gap-2 bg-elevated border border-border hover:border-primary/40 text-fg font-medium py-3 rounded-xl transition-colors cursor-pointer"
        >
          <SkipForward size={16} />
          Skip Rest
        </button>
      </div>
    </div>
  );
}
