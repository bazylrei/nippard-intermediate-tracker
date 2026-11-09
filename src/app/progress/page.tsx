"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { getExerciseHistory, getWeeklyVolume, getPersonalRecords } from "@/lib/db";
import { PROGRAM } from "@/lib/program-data";
import { ArrowLeft, TrendingUp, BarChart3 } from "lucide-react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from "recharts";

type Tab = "exercise" | "volume";

// Collect all unique exercises from the program
const ALL_EXERCISES = (() => {
  const seen = new Set<string>();
  const list: { id: string; name: string }[] = [];
  for (const week of PROGRAM) {
    for (const day of week.days) {
      for (const ex of day.exercises) {
        if (!seen.has(ex.id)) {
          seen.add(ex.id);
          list.push({ id: ex.id, name: ex.name });
        }
      }
    }
  }
  return list;
})();

export default function ProgressPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("exercise");
  const [userId, setUserId] = useState<string | null>(null);
  const [exercisesWithData, setExercisesWithData] = useState<string[]>([]);
  const [volume, setVolume] = useState<{ week: number; volume: number }[]>([]);
  const [selectedExercise, setSelectedExercise] = useState("");
  const [history, setHistory] = useState<{ date: string; weight: number; reps: number; estimatedOneRm: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function init() {
      const sb = createClient();
      const { data: { user } } = await sb.auth.getUser();
      if (!user) { router.replace("/auth"); return; }
      setUserId(user.id);

      const [prData, volData] = await Promise.all([
        getPersonalRecords(user.id),
        getWeeklyVolume(user.id),
      ]);
      const ids = prData.map((pr) => pr.exerciseId);
      setExercisesWithData(ids);
      setVolume(volData.sort((a, b) => a.week - b.week));
      const firstWithData = ALL_EXERCISES.find((ex) => ids.includes(ex.id));
      if (firstWithData) setSelectedExercise(firstWithData.id);
      setLoading(false);
    }
    init();
  }, [router]);

  useEffect(() => {
    if (!userId || !selectedExercise) return;
    getExerciseHistory(userId, selectedExercise).then(setHistory);
  }, [userId, selectedExercise]);

  const exercisesInDropdown = ALL_EXERCISES.filter((ex) => exercisesWithData.includes(ex.id));

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-zinc-500">
        Loading progress...
      </div>
    );
  }

  return (
    <div className="min-h-screen max-w-lg mx-auto flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-zinc-800">
        <button onClick={() => router.push("/")} className="text-zinc-500 hover:text-zinc-200 transition-colors">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-lg font-semibold text-zinc-100">Progress</h1>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-zinc-800">
        {([
          { key: "exercise", label: "Exercise", icon: TrendingUp },
          { key: "volume", label: "Volume", icon: BarChart3 },
        ] as const).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors border-b-2 ${
              tab === key
                ? "text-orange-400 border-orange-400"
                : "text-zinc-500 border-transparent hover:text-zinc-300"
            }`}
          >
            <Icon size={15} />
            {label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {/* Exercise history tab */}
        {tab === "exercise" && (
          <div className="space-y-4">
            {exercisesInDropdown.length === 0 ? (
              <EmptyState message="No exercise data yet — complete your first workout to start tracking." />
            ) : (
              <>
                <select
                  value={selectedExercise}
                  onChange={(e) => setSelectedExercise(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-zinc-200 focus:outline-none focus:border-orange-500 text-base"
                >
                  {exercisesInDropdown.map((ex) => (
                    <option key={ex.id} value={ex.id}>{ex.name}</option>
                  ))}
                </select>

                {history.length === 0 ? (
                  <EmptyState message="No data for this exercise yet." />
                ) : (
                  <div className="space-y-4">
                    <div className="w-full" style={{ height: 220 }}>
                      <ResponsiveContainer width="100%" height="100%" debounce={50}>
                        <LineChart data={history} margin={{ top: 4, right: 4, bottom: 4, left: -16 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                          <XAxis dataKey="date" tick={{ fill: "#71717a", fontSize: 11 }} tickFormatter={(v) => v.slice(5)} />
                          <YAxis tick={{ fill: "#71717a", fontSize: 11 }} />
                          <Tooltip
                            contentStyle={{ background: "#18181b", border: "1px solid #3f3f46", borderRadius: 8, color: "#e4e4e7" }}
                            formatter={(v) => [`${Number(v)} kg`, "e1RM"]}
                          />
                          <Line type="monotone" dataKey="estimatedOneRm" stroke="#f97316" strokeWidth={2} dot={{ fill: "#f97316", r: 4 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="space-y-2">
                      {[...history].reverse().map((h, i) => (
                        <div key={i} className="bg-zinc-900 rounded-xl px-4 py-3 flex items-center justify-between">
                          <div>
                            <p className="text-sm text-zinc-300 font-medium">{h.weight}kg × {h.reps} reps</p>
                            <p className="text-xs text-zinc-500">{h.date}</p>
                          </div>
                          <p className="text-sm font-bold text-orange-400">{h.estimatedOneRm} e1RM</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Volume tab */}
        {tab === "volume" && (
          <div className="space-y-4">
            <p className="text-xs text-zinc-500">Total weekly training volume (kg)</p>
            {volume.length === 0 ? (
              <EmptyState message="No volume data yet — complete a workout first." />
            ) : (
              <div className="w-full" style={{ height: 260 }}>
                <ResponsiveContainer width="100%" height="100%" debounce={50}>
                  <BarChart data={volume} margin={{ top: 4, right: 4, bottom: 4, left: -16 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                    <XAxis dataKey="week" tick={{ fill: "#71717a", fontSize: 12 }} tickFormatter={(v) => `W${v}`} />
                    <YAxis tick={{ fill: "#71717a", fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                    <Tooltip
                      contentStyle={{ background: "#18181b", border: "1px solid #3f3f46", borderRadius: 8, color: "#e4e4e7" }}
                      formatter={(v) => [`${Number(v).toLocaleString()} kg`, "Volume"]}
                      labelFormatter={(l) => `Week ${l}`}
                    />
                    <Bar dataKey="volume" fill="#f97316" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="text-center py-16 text-zinc-500 text-sm">
      {message}
    </div>
  );
}
