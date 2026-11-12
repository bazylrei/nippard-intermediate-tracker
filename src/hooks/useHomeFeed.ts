import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getSignedInUser } from "@/lib/auth";
import { getIncompleteSession, getLastCompletedWorkout, getRecentWorkouts } from "@/lib/db";
import { buildWorkoutFeed, type WorkoutFeedItem } from "@/lib/feed";
import { nextWorkout } from "@/lib/program-data";
import { useProgramContext } from "@/context/ProgramContext";
import { cacheGet, cacheSet } from "@/lib/cache";
import type { WorkoutPosition } from "@/lib/types";

const FEED_LIMIT = 20;
const CACHE_KEY = "home-feed-v2";

/** What the server told us; the suggested next workout is derived from it and the program. */
interface FeedData {
  resume: WorkoutPosition | null;
  lastCompleted: WorkoutPosition | null;
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
  const router = useRouter();
  const { program } = useProgramContext();
  const [data, setData] = useState<FeedData | null>(() => cacheGet<FeedData>(CACHE_KEY));
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    async function load() {
      const user = await getSignedInUser();
      if (!user) { router.replace("/auth"); return; }

      const [incomplete, lastCompleted, recent] = await Promise.all([
        getIncompleteSession(user.id),
        getLastCompletedWorkout(user.id),
        getRecentWorkouts(user.id, FEED_LIMIT),
      ]);
      const fresh: FeedData = {
        resume: incomplete ? { week: incomplete.week, dayIndex: incomplete.dayIndex } : null,
        lastCompleted,
        items: buildWorkoutFeed(recent.sessions, recent.sets),
      };
      setData(fresh);
      cacheSet(CACHE_KEY, fresh);
    }
    load().catch((error) => { console.error(error); setLoadFailed(true); });
  }, [router]);

  const feed = useMemo<HomeFeed | null>(() => data && {
    nextSession: data.resume ?? nextWorkout(data.lastCompleted, program),
    hasResume: !!data.resume,
    items: data.items,
  }, [data, program]);

  return { feed, failed: loadFailed && !data };
}
