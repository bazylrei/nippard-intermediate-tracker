"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { requireSignedInUser } from "@/lib/require-user";
import { getExerciseHistory, getWeeklyVolume, getLoggedExerciseIds, logBodyWeight } from "@/lib/db";
import { localYmd } from "@/lib/dates";
import { useExerciseCatalog } from "@/hooks/useExerciseCatalog";
import { useWeightUnit } from "@/hooks/useWeightUnit";
import FullScreenMessage from "@/components/FullScreenMessage";
import ExerciseTab from "./ExerciseTab";
import type { ExerciseHistoryPoint } from "@/lib/types";
import VolumeTab from "./VolumeTab";
import type { WeeklyVolume } from "@/lib/volume";
import { TrendingUp, BarChart3 } from "lucide-react";

type Tab = "exercise" | "volume";
const TABS = [
  { key: "exercise", label: "Exercise", icon: TrendingUp },
  { key: "volume",   label: "Volume",   icon: BarChart3  },
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
  // The tab lives in the URL so a reload or Back keeps it.
  const tabParam = searchParams.get("tab");
  const tab: Tab = isTab(tabParam) ? tabParam : "exercise";
  const setTab = (t: Tab) => router.replace(t === "exercise" ? "/progress" : `/progress?tab=${t}`, { scroll: false });
  const [userId, setUserId] = useState<string | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [loggedIds, setLoggedIds] = useState<string[]>([]);
  const [volume, setVolume] = useState<WeeklyVolume>({ weeks: [], missingBodyWeight: false });
  const [selectedExercise, setSelectedExercise] = useState("");
  const [history, setHistory] = useState<ExerciseHistoryPoint[]>([]);
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const [chartWidth, setChartWidth] = useState(0);

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

  /** From the volume tab's call to action: rejects on failure so the form can show it. */
  async function logWeightAndRefresh(weightKg: number) {
    if (!userId) return;
    await logBodyWeight(userId, localYmd(new Date()), weightKg);
    setVolume(await getWeeklyVolume(userId));
  }

  useEffect(() => {
    if (!userId || !activeExercise) return;
    getExerciseHistory(userId, activeExercise)
      .then(setHistory)
      .catch((error) => { console.error(error); setHistory([]); });
  }, [userId, activeExercise]);

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
    <div className="main-viewport max-w-lg md:max-w-3xl mx-auto flex flex-col">
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

      <div ref={chartContainerRef} className="flex-1 min-h-0 overflow-y-auto px-4 pt-4 pb-above-raised-tab">
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
        {tab === "volume" && <VolumeTab volume={volume} unit={unit} chartWidth={chartWidth} onLogBodyWeight={logWeightAndRefresh} />}
      </div>
    </div>
  );
}
