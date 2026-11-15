"use client";

import { useEffect, useState } from "react";
import { ACTIVE_WORKOUT_EVENT, readActiveWorkout, type ActiveWorkoutInfo } from "@/lib/active-workout";

/**
 * The workout in progress on this device, kept in sync across this tab and
 * others. Read after mount: the server can't see it, so reading it during the
 * first render would make server and client markup differ.
 */
export function useActiveWorkout(): ActiveWorkoutInfo | null {
  const [workout, setWorkout] = useState<ActiveWorkoutInfo | null>(null);

  useEffect(() => {
    function sync() {
      setWorkout(readActiveWorkout());
    }
    sync();
    window.addEventListener(ACTIVE_WORKOUT_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(ACTIVE_WORKOUT_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return workout;
}
