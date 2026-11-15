"use client";

import { useEffect, useState } from "react";

/**
 * Whole seconds since `startIso`, updated every second. Derived from the clock
 * on each tick (not counted up), so it stays right after the tab was asleep.
 */
export function useElapsedSeconds(startIso: string): number {
  const start = new Date(startIso).getTime();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  return Math.max(0, Math.floor((now - start) / 1000));
}
