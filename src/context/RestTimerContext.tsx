"use client";

import { createContext, useContext, useEffect, useRef, useState, useCallback } from "react";

interface RestTimerContextValue {
  isActive: boolean;
  remaining: number;
  total: number;
  start: (durationSeconds: number) => void;
  stop: () => void;
}

const RestTimerContext = createContext<RestTimerContextValue>({
  isActive: false,
  remaining: 0,
  total: 0,
  start: () => {},
  stop: () => {},
});

export function useRestTimer() {
  return useContext(RestTimerContext);
}

export function RestTimerProvider({ children }: { children: React.ReactNode }) {
  const [isActive, setIsActive] = useState(false);
  const [remaining, setRemaining] = useState(0);
  const [total, setTotal] = useState(0);
  const endTimeRef = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stop = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setIsActive(false);
    setRemaining(0);
  }, []);

  const tick = useCallback(() => {
    const rem = Math.max(0, Math.ceil((endTimeRef.current - Date.now()) / 1000));
    setRemaining(rem);
    if (rem === 0) stop();
  }, [stop]);

  const start = useCallback((durationSeconds: number) => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    endTimeRef.current = Date.now() + durationSeconds * 1000;
    setTotal(durationSeconds);
    setRemaining(durationSeconds);
    setIsActive(true);
    tick();
    intervalRef.current = setInterval(tick, 500);
  }, [tick]);

  useEffect(() => {
    function handleVisibility() {
      if (!document.hidden && isActive) tick();
    }
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [isActive, tick]);

  useEffect(() => () => { if (intervalRef.current) clearInterval(intervalRef.current); }, []);

  return (
    <RestTimerContext.Provider value={{ isActive, remaining, total, start, stop }}>
      {children}
    </RestTimerContext.Provider>
  );
}
