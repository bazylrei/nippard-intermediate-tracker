import { useEffect, useMemo, useState } from "react";
import { useRequireUser } from "@/context/AuthContext";
import { getRecentWorkouts, getWorkoutOverview } from "@/lib/db";
import { buildWorkoutFeed, type WorkoutFeedItem } from "@/lib/feed";
import { programRun } from "@/lib/program-data";
import { useProgramContext } from "@/context/ProgramContext";
import { cacheGet, cacheSet } from "@/lib/cache";
import type { WorkoutPosition } from "@/lib/types";

const FEED_LIMIT = 20;
const CACHE_KEY = "home-feed-v3";

/** What the server told us; the suggested next workout is derived from it and the program. */
interface FeedData {
  resume: WorkoutPosition | null;
  /** Every completed workout's day, so the next one is the earliest not yet done. */
  completed: WorkoutPosition[];
  items: WorkoutFeedItem[];
}

export interface HomeFeed {
  /** Null until the program schedule has loaded. */
  nextSession: WorkoutPosition | null;
  hasResume: boolean;
  items: WorkoutFeedItem[];
}

/** `failed` is true only when loading failed and there is no cached feed to show. */
export function useHomeFeed(): { feed: HomeFeed | null; failed: boolean } {
  const user = useRequireUser();
  const { program } = useProgramContext();
  const [data, setData] = useState<FeedData | null>(() => cacheGet<FeedData>(CACHE_KEY));
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    if (!user) return;
    const userId = user.id;
    async function load() {
      const [{ unfinished, completed }, recent] = await Promise.all([
        getWorkoutOverview(),
        getRecentWorkouts(userId, FEED_LIMIT),
      ]);
      const fresh: FeedData = {
        resume: unfinished ? { week: unfinished.week, dayIndex: unfinished.dayIndex } : null,
        completed: completed.map(({ week, dayIndex }) => ({ week, dayIndex })),
        items: buildWorkoutFeed(recent.sessions, recent.sets),
      };
      setData(fresh);
      cacheSet(CACHE_KEY, fresh);
    }
    load().catch((error) => { console.error(error); setLoadFailed(true); });
  }, [user]);

  const feed = useMemo<HomeFeed | null>(() => data && {
    nextSession: data.resume ?? programRun(data.completed, program).next,
    hasResume: !!data.resume,
    items: data.items,
  }, [data, program]);

  return { feed, failed: loadFailed && !data };
}
