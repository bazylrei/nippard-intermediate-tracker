import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { requireSignedInUser } from "@/lib/require-user";
import { getWorkoutOverview, type CompletedSlot } from "@/lib/db";
import { cacheGet, cacheSet } from "@/lib/cache";
import type { WorkoutPosition } from "@/lib/types";

const CACHE_KEY = "dashboard-v5";

/** The workout left unfinished, if any. */
export interface UnfinishedWorkout {
  sessionId: string;
  position: WorkoutPosition;
  dayType: string;
  /** Working sets logged so far (warm-ups not counted). */
  setCount: number;
}

export interface ProgramOverview {
  unfinished: UnfinishedWorkout | null;
  /** Newest first. */
  completed: CompletedSlot[];
}

/**
 * What the Program screen shows, from the cache at once and then fresh from the
 * server. `failed` is true only when loading failed and nothing is cached.
 */
export function useProgramOverview(): { overview: ProgramOverview | null; failed: boolean } {
  const router = useRouter();
  const [overview, setOverview] = useState<ProgramOverview | null>(() => cacheGet<ProgramOverview>(CACHE_KEY));
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    async function load() {
      const user = await requireSignedInUser(router);
      if (!user) return;
      const { unfinished: found, completed } = await getWorkoutOverview();
      const unfinished = found && {
        sessionId: found.sessionId,
        position: { week: found.week, dayIndex: found.dayIndex },
        dayType: found.dayType,
        setCount: found.setCount,
      };
      const fresh = { unfinished, completed };
      setOverview(fresh);
      cacheSet(CACHE_KEY, fresh);
    }
    load().catch((error) => { console.error(error); setLoadFailed(true); });
  }, [router]);

  return { overview, failed: loadFailed && !overview };
}
