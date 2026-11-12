"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getSignedInUser } from "@/lib/auth";
import {
  getExerciseHistory, getWeeklyVolume, getLoggedExerciseIds, getRecentWorkouts,
} from "@/lib/db";
import { buildWorkoutFeed, type WorkoutFeedItem } from "@/lib/feed";
import { DAY_LABELS } from "@/lib/program-data";
import { formatCalendarDate } from "@/lib/dates";
import { useProgramContext } from "@/context/ProgramContext";
import HistoryTab from "./HistoryTab";
import EmptyState from "./EmptyState";
import { TrendingUp, BarChart3, Clock, ChevronDown } from "lucide-react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip,
  CartesianGrid,
} from "recharts";

type Tab = "exercise" | "volume" | "history";
const TAB_KEYS: readonly Tab[] = ["exercise", "volume", "history"];
const isTab = (v: string | null): v is Tab => TAB_KEYS.includes(v as Tab);

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
  const { program } = useProgramContext();
  // The tab lives in the URL so Back from a workout's detail page returns to History.
  const tabParam = searchParams.get("tab");
  const tab: Tab = isTab(tabParam) ? tabParam : "exercise";
  const setTab = (t: Tab) => router.replace(t === "exercise" ? "/progress" : `/progress?tab=${t}`, { scroll: false });
  const [userId, setUserId] = useState<string | null>(null);
  const [exercisesWithData, setExercisesWithData] = useState<string[]>([]);
  const [volume, setVolume] = useState<{ week: number; volume: number }[]>([]);
  const [selectedExercise, setSelectedExercise] = useState("");
  const [history, setHistory] = useState<{ date: string; weight: number; reps: number; dayType: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const [chartWidth, setChartWidth] = useState(0);
  const [historyItems, setHistoryItems] = useState<WorkoutFeedItem[]>([]);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [historyFailed, setHistoryFailed] = useState(false);

  const ALL_EXERCISES = useMemo(() => {
    const byName = new Map<string, string>();
    for (const week of program) {
      for (const day of week.days) {
        for (const ex of day.exercises) {
          if (!byName.has(ex.name)) byName.set(ex.name, ex.id);
        }
      }
    }
    return Array.from(byName.entries())
      .map(([name, id]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [program]);

  useEffect(() => {
    async function init() {
      const user = await getSignedInUser();
      if (!user) { router.replace("/auth"); return; }
      setUserId(user.id);

      const [ids, volData] = await Promise.all([
        getLoggedExerciseIds(user.id),
        getWeeklyVolume(user.id),
      ]);
      setExercisesWithData(ids);
      setVolume(volData);
      const firstWithData = ALL_EXERCISES.find((ex) => ids.includes(ex.id));
      if (firstWithData) setSelectedExercise(firstWithData.id);
      setLoading(false);
    }
    init();
  }, [router, ALL_EXERCISES]);

  useEffect(() => {
    if (!userId || !selectedExercise) return;
    getExerciseHistory(userId, selectedExercise).then(setHistory);
  }, [userId, selectedExercise]);

  useEffect(() => {
    if (tab !== "history" || !userId || historyLoaded) return;
    getRecentWorkouts(userId)
      .then(({ sessions, sets }) => setHistoryItems(buildWorkoutFeed(sessions, sets)))
      .catch((error) => { console.error(error); setHistoryFailed(true); })
      .finally(() => setHistoryLoaded(true));
  }, [tab, userId, historyLoaded]);

  useEffect(() => {
    if (loading) return;
    const el = chartContainerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      setChartWidth(Math.floor(entries[0].contentRect.width));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [loading]);

  const exercisesInDropdown = ALL_EXERCISES.filter((ex) => exercisesWithData.includes(ex.id));

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted text-sm font-display">
        Loading progress…
      </div>
    );
  }

  const TABS = [
    { key: "exercise" as Tab, label: "Exercise", icon: TrendingUp },
    { key: "volume"   as Tab, label: "Volume",   icon: BarChart3  },
    { key: "history"  as Tab, label: "History",  icon: Clock      },
  ];

  return (
    <div className="h-dvh max-w-lg md:max-w-3xl mx-auto flex flex-col">
      {/* Header */}
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
                tab === key
                  ? "bg-primary text-primary-fg shadow-sm"
                  : "text-muted hover:text-fg"
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
          <div className="space-y-4">
            {exercisesInDropdown.length === 0 ? (
              <EmptyState message="No exercise data yet — complete your first workout to start tracking." />
            ) : (
              <>
                <div className="relative">
                  <select
                    value={selectedExercise}
                    onChange={(e) => setSelectedExercise(e.target.value)}
                    className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-fg focus:outline-none focus:border-primary text-sm font-display font-medium appearance-none cursor-pointer"
                  >
                    {exercisesInDropdown.map((ex) => (
                      <option key={ex.id} value={ex.id}>{ex.name}</option>
                    ))}
                  </select>
                  <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
                </div>

                {history.length === 0 ? (
                  <EmptyState message="No data for this exercise yet." />
                ) : (
                  <div className="space-y-4">
                    {chartWidth > 0 && (
                      <div className="bg-surface border border-border rounded-2xl p-3">
                        <LineChart width={chartWidth - 24} height={200} data={history} margin={{ top: 4, right: 4, bottom: 4, left: -16 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                          <XAxis dataKey="date" tick={{ fill: "var(--muted)", fontSize: 11 }} tickFormatter={formatCalendarDate} />
                          <YAxis tick={{ fill: "var(--muted)", fontSize: 11 }} />
                          <Tooltip
                            contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--fg)" }}
                            labelFormatter={(l) => formatCalendarDate(String(l))}
                            formatter={(v) => [`${Number(v)} kg`, "Weight"]}
                          />
                          <Line type="monotone" dataKey="weight" stroke="var(--primary)" strokeWidth={2} dot={{ fill: "var(--primary)", r: 4 }} />
                        </LineChart>
                      </div>
                    )}
                    <div className="space-y-2">
                      {[...history].reverse().map((h, i) => (
                        <div key={i} className="bg-surface border border-border rounded-xl px-4 py-3 flex items-center justify-between">
                          <div>
                            <p className="font-display font-semibold text-sm text-fg">{h.weight}kg × {h.reps} reps</p>
                            <p className="text-xs text-muted mt-0.5">{formatCalendarDate(h.date)}</p>
                          </div>
                          {h.dayType && (
                            <span className="text-xs font-display font-semibold text-primary bg-primary/10 px-2.5 py-1 rounded-full">
                              {DAY_LABELS[h.dayType] ?? h.dayType}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {tab === "volume" && (
          <div className="space-y-4">
            <p className="text-xs text-muted font-display uppercase tracking-wider">Total weekly training volume (kg)</p>
            {volume.length === 0 ? (
              <EmptyState message="No volume data yet — complete a workout first." />
            ) : chartWidth > 0 ? (
              <div className="bg-surface border border-border rounded-2xl p-3">
                <BarChart width={chartWidth - 24} height={260} data={volume} margin={{ top: 4, right: 4, bottom: 4, left: -16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="week" tick={{ fill: "var(--muted)", fontSize: 12 }} tickFormatter={(v) => `W${v}`} />
                  <YAxis tick={{ fill: "var(--muted)", fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip
                    contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--fg)" }}
                    formatter={(v) => [`${Number(v).toLocaleString()} kg`, "Volume"]}
                    labelFormatter={(l) => `Week ${l}`}
                  />
                  <Bar dataKey="volume" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </div>
            ) : null}
          </div>
        )}

        {tab === "history" && (
          <HistoryTab items={historyItems} loaded={historyLoaded} failed={historyFailed} />
        )}
      </div>
    </div>
  );
}
