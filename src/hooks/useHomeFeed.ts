import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import {
  getIncompleteSession, getNextSession, getRecentCompletedSessions, getWorkingSetsForSessions,
} from "@/lib/db";
import { buildWorkoutFeed, type WorkoutFeedItem } from "@/lib/feed";
import { cacheGet, cacheSet } from "@/lib/cache";

const FEED_LIMIT = 20;
const CACHE_KEY = "home-feed";

export interface HomeFeed {
  nextSession: { week: number; dayIndex: number };
  hasResume: boolean;
  items: WorkoutFeedItem[];
}

export function useHomeFeed(): { feed: HomeFeed | null } {
  const router = useRouter();
  const [feed, setFeed] = useState<HomeFeed | null>(() => cacheGet<HomeFeed>(CACHE_KEY));

  useEffect(() => {
    async function load() {
      const { data: { user } } = await createClient().auth.getUser();
      if (!user) { router.replace("/auth"); return; }

      const [incomplete, next, sessions] = await Promise.all([
        getIncompleteSession(user.id),
        getNextSession(user.id),
        getRecentCompletedSessions(user.id, FEED_LIMIT),
      ]);
      const sets = await getWorkingSetsForSessions(sessions.map((s) => s.id));
      const fresh: HomeFeed = {
        nextSession: incomplete ? { week: incomplete.week, dayIndex: incomplete.dayIndex } : next,
        hasResume: !!incomplete,
        items: buildWorkoutFeed(sessions, sets),
      };
      setFeed(fresh);
      cacheSet(CACHE_KEY, fresh);
    }
    void load();
  }, [router]);

  return { feed };
}
