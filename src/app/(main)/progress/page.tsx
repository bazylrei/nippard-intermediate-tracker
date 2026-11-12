"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { requireSignedInUser } from "@/lib/require-user";
import { getExerciseHistory, getWeeklyVolume, getLoggedExerciseIds, getRecentWorkouts } from "@/lib/db";
import { buildWorkoutFeed, type WorkoutFeedItem } from "@/lib/feed";
import { useExerciseCatalog } from "@/hooks/useExerciseCatalog";
import { useWeightUnit } from "@/hooks/useWeightUnit";
import FullScreenMessage from "@/components/FullScreenMessage";
import HistoryTab from "./HistoryTab";
import ExerciseTab, { type ExerciseHistoryPoint } from "./ExerciseTab";
import VolumeTab from "./VolumeTab";
import { TrendingUp, BarChart3, Clock } from "lucide-react";

type Tab = "exercise" | "volume" | "history";
const TABS = [
  { key: "exercise", label: "Exercise", icon: TrendingUp },
  { key: "volume",   label: "Volume",   icon: BarChart3  },
  { key: "history",  label: "History",  icon: Clock      },
] as const satisfies readonly { key: Tab; label: string; icon: unknown }[];
const isTab = (v: string | null): v is Tab => TABS.some((t) => t.key === v);

export default function ProgressPage() {
  return (
    <Suspense>
      <ProgressContent />
    </Suspense>
  );
}

function ProgressContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { options } = useExerciseCatalog();
  const unit = useWeightUnit();
  // The tab lives in the URL so Back from a workout's detail page returns to History.
  const tabParam = searchParams.get("tab");
  const tab: Tab = isTab(tabParam) ? tabParam : "exercise";
  const setTab = (t: Tab) => router.replace(t === "exercise" ? "/progress" : `/progress?tab=${t}`, { scroll: false });
  const [userId, setUserId] = useState<string | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [loggedIds, setLoggedIds] = useState<string[]>([]);
  const [volume, setVolume] = useState<{ week: number; volume: number }[]>([]);
  const [selectedExercise, setSelectedExercise] = useState("");
  const [history, setHistory] = useState<ExerciseHistoryPoint[]>([]);
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const [chartWidth, setChartWidth] = useState(0);
  const [historyItems, setHistoryItems] = useState<WorkoutFeedItem[]>([]);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [historyFailed, setHistoryFailed] = useState(false);

  // Every exercise you've logged, named from the full catalogue — not just the active program.
  const exercisesWithData = options.filter((ex) => loggedIds.includes(ex.id));
  const activeExercise = selectedExercise || exercisesWithData[0]?.id || "";

  useEffect(() => {
    async function init() {
      const user = await requireSignedInUser(router);
      if (!user) return;
      setUserId(user.id);
      try {
        const [ids, weekly] = await Promise.all([getLoggedExerciseIds(user.id), getWeeklyVolume(user.id)]);
        setLoggedIds(ids);
        setVolume(weekly);
        setStatus("ready");
      } catch (error) {
        console.error(error);
        setStatus("error");
      }
    }
    void init();
  }, [router]);

  useEffect(() => {
    if (!userId || !activeExercise) return;
    getExerciseHistory(userId, activeExercise)
      .then(setHistory)
      .catch((error) => { console.error(error); setHistory([]); });
  }, [userId, activeExercise]);

  useEffect(() => {
    if (tab !== "history" || !userId || historyLoaded) return;
    getRecentWorkouts(userId)
      .then(({ sessions, sets }) => setHistoryItems(buildWorkoutFeed(sessions, sets)))
      .catch((error) => { console.error(error); setHistoryFailed(true); })
      .finally(() => setHistoryLoaded(true));
  }, [tab, userId, historyLoaded]);

  useEffect(() => {
    if (status !== "ready") return;
    const el = chartContainerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => setChartWidth(Math.floor(entries[0].contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, [status]);

  if (status === "loading") return <FullScreenMessage message="Loading progress…" />;
  if (status === "error") return <FullScreenMessage message="Couldn't load your progress. Check your connection and try again." />;

  return (
    <div className="h-dvh max-w-lg md:max-w-3xl mx-auto flex flex-col">
      <div className="flex items-center px-4 pt-4 pb-3 border-b border-border">
        <h1 className="font-display font-bold text-xl tracking-wide text-fg">Progress</h1>
      </div>

      {/* Segment control tabs */}
      <div className="px-4 py-3 border-b border-border">
        <div className="flex bg-elevated rounded-xl p-1 gap-1">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-display font-semibold transition-all cursor-pointer ${
                tab === key ? "bg-primary text-primary-fg shadow-sm" : "text-muted hover:text-fg"
              }`}
            >
              <Icon size={13} />
              {label}
            </button>
          ))}
        </div>
      </div>

      <div ref={chartContainerRef} className="flex-1 min-h-0 overflow-y-auto p-4">
        {tab === "exercise" && (
          <ExerciseTab
            options={exercisesWithData}
            selectedId={activeExercise}
            onSelect={setSelectedExercise}
            history={history}
            unit={unit}
            chartWidth={chartWidth}
          />
        )}
        {tab === "volume" && <VolumeTab volume={volume} unit={unit} chartWidth={chartWidth} />}
        {tab === "history" && <HistoryTab items={historyItems} loaded={historyLoaded} failed={historyFailed} />}
      </div>
    </div>
  );
}
