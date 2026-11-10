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

  const pct = ((durationSeconds - remaining) / durationSeconds) * 100;
  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-end justify-center p-4 z-50">
      <div className="w-full max-w-sm bg-zinc-900 rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-zinc-400 font-medium uppercase tracking-widest">Rest Timer</span>
          <button onClick={onSkip} className="text-zinc-500 hover:text-zinc-300 transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="text-center">
          <span className="text-6xl font-mono font-bold text-zinc-100 tabular-nums">
            {mins}:{secs.toString().padStart(2, "0")}
          </span>
        </div>

        <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-orange-500 transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>

        <button
          onClick={onSkip}
          className="w-full flex items-center justify-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-medium py-3 rounded-xl transition-colors"
        >
          <SkipForward size={16} />
          Skip Rest
        </button>
      </div>
    </div>
  );
}
