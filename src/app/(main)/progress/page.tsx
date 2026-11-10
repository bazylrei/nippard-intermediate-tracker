"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import {
  getExerciseHistory, getWeeklyVolume, getPersonalRecords,
  getCompletedSessions, getSessionSets, updateSetLog, deleteWorkoutSession,
  deleteSetLog, deleteExerciseSetsFromSession,
} from "@/lib/db";
import { DAY_LABELS } from "@/lib/program-data";
import { useProgramContext } from "@/context/ProgramContext";
import type { WorkoutSession, SetLog } from "@/lib/types";
import { TrendingUp, BarChart3, Clock, ChevronDown, Pencil, Check, X, Trash2 } from "lucide-react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip,
  CartesianGrid,
} from "recharts";

type Tab = "exercise" | "volume" | "history";

function formatDate(iso: string): string {
  const [, m, d] = iso.split("-");
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${months[parseInt(m) - 1]} ${parseInt(d)}`;
}

export default function ProgressPage() {
  const router = useRouter();
  const { program } = useProgramContext();
  const [tab, setTab] = useState<Tab>("exercise");
  const [userId, setUserId] = useState<string | null>(null);
  const [exercisesWithData, setExercisesWithData] = useState<string[]>([]);
  const [volume, setVolume] = useState<{ week: number; volume: number }[]>([]);
  const [selectedExercise, setSelectedExercise] = useState("");
  const [history, setHistory] = useState<{ date: string; weight: number; reps: number; dayType: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const [chartWidth, setChartWidth] = useState(0);
  // History tab
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [sessionsLoaded, setSessionsLoaded] = useState(false);

  const ALL_EXERCISES = useMemo(() => {
    // Deduplicate by name — same exercise can have different IDs across blocks
    const byName = new Map<string, string>(); // name → first id seen
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

  const EXERCISE_NAME = useMemo(
    () => Object.fromEntries(ALL_EXERCISES.map((ex) => [ex.id, ex.name])),
    [ALL_EXERCISES]
  );

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
  }, [router, ALL_EXERCISES]);

  useEffect(() => {
    if (!userId || !selectedExercise) return;
    getExerciseHistory(userId, selectedExercise).then(setHistory);
  }, [userId, selectedExercise]);

  useEffect(() => {
    if (tab !== "history" || !userId || sessionsLoaded) return;
    getCompletedSessions(userId).then((s) => { setSessions(s); setSessionsLoaded(true); });
  }, [tab, userId, sessionsLoaded]);

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
      <div className="min-h-screen flex items-center justify-center text-zinc-500">
        Loading progress...
      </div>
    );
  }

  return (
    <div className="h-dvh max-w-lg md:max-w-3xl mx-auto flex flex-col">
      <div className="flex items-center p-4 border-b border-zinc-800">
        <h1 className="text-lg font-semibold text-zinc-100">Progress</h1>
      </div>

      <div className="flex border-b border-zinc-800">
        {([
          { key: "exercise", label: "Exercise", icon: TrendingUp },
          { key: "volume",   label: "Volume",   icon: BarChart3  },
          { key: "history",  label: "History",  icon: Clock      },
        ] as const).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-sm font-medium transition-colors border-b-2 ${
              tab === key
                ? "text-orange-400 border-orange-400"
                : "text-zinc-500 border-transparent hover:text-zinc-300"
            }`}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      <div ref={chartContainerRef} className="flex-1 min-h-0 overflow-y-auto p-4">
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
                    {chartWidth > 0 && (
                      <LineChart width={chartWidth} height={200} data={history} margin={{ top: 4, right: 4, bottom: 4, left: -16 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                        <XAxis dataKey="date" tick={{ fill: "#71717a", fontSize: 11 }} tickFormatter={formatDate} />
                        <YAxis tick={{ fill: "#71717a", fontSize: 11 }} />
                        <Tooltip
                          contentStyle={{ background: "#18181b", border: "1px solid #3f3f46", borderRadius: 8, color: "#e4e4e7" }}
                          labelFormatter={(l) => formatDate(String(l))}
                          formatter={(v) => [`${Number(v)} kg`, "Weight"]}
                        />
                        <Line type="monotone" dataKey="weight" stroke="#f97316" strokeWidth={2} dot={{ fill: "#f97316", r: 4 }} />
                      </LineChart>
                    )}
                    <div className="space-y-2">
                      {[...history].reverse().map((h, i) => (
                        <div key={i} className="bg-zinc-900 rounded-xl px-4 py-3 flex items-center justify-between">
                          <div>
                            <p className="text-sm text-zinc-300 font-medium">{h.weight}kg × {h.reps} reps</p>
                            <p className="text-xs text-zinc-500">{formatDate(h.date)}</p>
                          </div>
                          {h.dayType && (
                            <p className="text-xs font-medium text-orange-400/80 bg-orange-500/10 px-2.5 py-1 rounded-full">
                              {DAY_LABELS[h.dayType] ?? h.dayType}
                            </p>
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
            <p className="text-xs text-zinc-500">Total weekly training volume (kg)</p>
            {volume.length === 0 ? (
              <EmptyState message="No volume data yet — complete a workout first." />
            ) : chartWidth > 0 ? (
              <BarChart width={chartWidth} height={260} data={volume} margin={{ top: 4, right: 4, bottom: 4, left: -16 }}>
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
            ) : null}
          </div>
        )}

        {tab === "history" && (
          <HistoryTab
            sessions={sessions}
            loaded={sessionsLoaded}
            onSessionsUpdate={setSessions}
            exerciseName={EXERCISE_NAME}
          />
        )}
      </div>
    </div>
  );
}

// ── History tab ───────────────────────────────────────────────────────────────

function HistoryTab({
  sessions,
  loaded,
  onSessionsUpdate,
  exerciseName,
}: {
  sessions: WorkoutSession[];
  loaded: boolean;
  onSessionsUpdate: (s: WorkoutSession[]) => void;
  exerciseName: Record<string, string>;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [setsCache, setSetsCache] = useState<Record<string, SetLog[]>>({});
  const [editingSetId, setEditingSetId] = useState<string | null>(null);
  const [editWeight, setEditWeight] = useState("");
  const [editReps, setEditReps] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [confirmDeleteSetId, setConfirmDeleteSetId] = useState<string | null>(null);
  const [confirmDeleteExerciseKey, setConfirmDeleteExerciseKey] = useState<string | null>(null);
  const [deletingItem, setDeletingItem] = useState(false);

  async function toggleSession(sessionId: string) {
    setEditingSetId(null);
    setConfirmDeleteId(null);
    setConfirmDeleteSetId(null);
    setConfirmDeleteExerciseKey(null);
    setExpandedId((prev) => (prev === sessionId ? null : sessionId));
    if (!setsCache[sessionId]) {
      const sets = await getSessionSets(sessionId);
      setSetsCache((prev) => ({ ...prev, [sessionId]: sets }));
    }
  }

  async function saveEdit(setId: string) {
    const w = parseFloat(editWeight);
    const r = parseInt(editReps, 10);
    if (isNaN(w) || isNaN(r) || w < 0 || r <= 0) return;
    await updateSetLog(setId, w, r);
    setSetsCache((prev) => {
      const next = { ...prev };
      for (const sid in next) {
        next[sid] = next[sid].map((s) =>
          s.id === setId ? { ...s, weight: w, reps: r } : s
        );
      }
      return next;
    });
    setEditingSetId(null);
  }

  async function confirmDelete(sessionId: string) {
    setDeleting(true);
    await deleteWorkoutSession(sessionId);
    onSessionsUpdate(sessions.filter((s) => s.id !== sessionId));
    setConfirmDeleteId(null);
    setExpandedId(null);
    setDeleting(false);
  }

  async function confirmDeleteSet(setId: string, sessionId: string) {
    setDeletingItem(true);
    await deleteSetLog(setId);
    setSetsCache((prev) => ({
      ...prev,
      [sessionId]: prev[sessionId]?.filter((s) => s.id !== setId) ?? [],
    }));
    setConfirmDeleteSetId(null);
    setDeletingItem(false);
  }

  async function confirmDeleteExercise(sessionId: string, exerciseId: string) {
    setDeletingItem(true);
    await deleteExerciseSetsFromSession(sessionId, exerciseId);
    setSetsCache((prev) => ({
      ...prev,
      [sessionId]: prev[sessionId]?.filter((s) => s.exerciseId !== exerciseId) ?? [],
    }));
    setConfirmDeleteExerciseKey(null);
    setDeletingItem(false);
  }

  if (!loaded) {
    return <div className="text-center py-16 text-zinc-500 text-sm">Loading history...</div>;
  }
  if (sessions.length === 0) {
    return <EmptyState message="No completed workouts yet." />;
  }

  return (
    <div className="space-y-3">
      {sessions.map((session) => {
        const sets = setsCache[session.id];
        const isExpanded = expandedId === session.id;

        const workingSets = (sets ?? []).filter((s) => s.setIndex >= 0);
        const exerciseOrder: string[] = [];
        const setsByExercise: Record<string, SetLog[]> = {};
        for (const s of workingSets) {
          if (!setsByExercise[s.exerciseId]) {
            exerciseOrder.push(s.exerciseId);
            setsByExercise[s.exerciseId] = [];
          }
          setsByExercise[s.exerciseId].push(s);
        }

        return (
          <div key={session.id} className="bg-zinc-900 rounded-xl overflow-hidden">
            <div className="flex items-center px-4 py-3.5">
              <button
                onClick={() => toggleSession(session.id)}
                className="flex-1 flex items-center justify-between text-left"
              >
                <div>
                  <p className="text-sm font-semibold text-zinc-200">
                    {DAY_LABELS[session.dayType] ?? session.dayType}
                    <span className="text-zinc-500 font-normal ml-2">· Wk {session.week}</span>
                  </p>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    {session.completedAt ? formatDate(session.completedAt.split("T")[0]) : ""}
                  </p>
                </div>
                <ChevronDown
                  size={16}
                  className={`text-zinc-500 transition-transform shrink-0 ml-2 ${isExpanded ? "rotate-180" : ""}`}
                />
              </button>

              {confirmDeleteId === session.id ? (
                <div className="flex items-center gap-2 ml-3 shrink-0">
                  <button
                    onClick={() => confirmDelete(session.id)}
                    disabled={deleting}
                    className="text-xs font-medium text-red-400 hover:text-red-300 transition-colors disabled:opacity-50"
                  >
                    {deleting ? "Deleting…" : "Confirm"}
                  </button>
                  <button
                    onClick={() => setConfirmDeleteId(null)}
                    className="text-zinc-600 hover:text-zinc-400 transition-colors"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <button
                  onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(session.id); }}
                  className="ml-3 shrink-0 text-zinc-700 hover:text-red-400 transition-colors p-1"
                >
                  <Trash2 size={15} />
                </button>
              )}
            </div>

            {isExpanded && (
              <div className="border-t border-zinc-800 px-4 py-3 space-y-4">
                {sets === undefined ? (
                  <p className="text-xs text-zinc-500 py-2">Loading…</p>
                ) : exerciseOrder.length === 0 ? (
                  <p className="text-xs text-zinc-500 py-2">No sets logged.</p>
                ) : (
                  exerciseOrder.map((exId) => {
                    const exKey = `${session.id}:${exId}`;
                    return (
                    <div key={exId}>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">
                          {exerciseName[exId] ?? exId}
                        </p>
                        {confirmDeleteExerciseKey === exKey ? (
                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              onClick={() => confirmDeleteExercise(session.id, exId)}
                              disabled={deletingItem}
                              className="text-xs font-medium text-red-400 hover:text-red-300 transition-colors disabled:opacity-50"
                            >
                              {deletingItem ? "…" : "Remove"}
                            </button>
                            <button onClick={() => setConfirmDeleteExerciseKey(null)} className="text-zinc-600 hover:text-zinc-400">
                              <X size={12} />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setConfirmDeleteExerciseKey(exKey)}
                            className="text-zinc-700 hover:text-red-400 transition-colors p-0.5 shrink-0"
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                      <div className="space-y-1">
                        {setsByExercise[exId].map((set) => {
                          if (editingSetId === set.id) {
                            return (
                              <div key={set.id} className="flex items-center gap-2 bg-zinc-800 rounded-lg px-3 py-2">
                                <input
                                  type="number"
                                  value={editWeight}
                                  onChange={(e) => setEditWeight(e.target.value)}
                                  step="any"
                                  min="0"
                                  className="w-20 bg-zinc-700 border border-zinc-600 rounded px-2 py-1 text-zinc-100 text-sm text-center focus:outline-none focus:border-orange-500"
                                  placeholder="kg"
                                />
                                <span className="text-zinc-500 text-xs">kg ×</span>
                                <input
                                  type="number"
                                  value={editReps}
                                  onChange={(e) => setEditReps(e.target.value)}
                                  min="1"
                                  className="w-16 bg-zinc-700 border border-zinc-600 rounded px-2 py-1 text-zinc-100 text-sm text-center focus:outline-none focus:border-orange-500"
                                  placeholder="reps"
                                />
                                <span className="text-zinc-500 text-xs flex-1">reps</span>
                                <button
                                  onClick={() => saveEdit(set.id)}
                                  className="text-green-400 hover:text-green-300 transition-colors"
                                >
                                  <Check size={16} />
                                </button>
                                <button
                                  onClick={() => setEditingSetId(null)}
                                  className="text-zinc-500 hover:text-zinc-300 transition-colors"
                                >
                                  <X size={16} />
                                </button>
                              </div>
                            );
                          }

                          if (confirmDeleteSetId === set.id) {
                            return (
                              <div key={set.id} className="flex items-center justify-between px-1 py-1">
                                <span className="text-xs text-zinc-500">
                                  {set.weight}kg × {set.reps} reps
                                </span>
                                <div className="flex items-center gap-2 shrink-0">
                                  <button
                                    onClick={() => confirmDeleteSet(set.id, session.id)}
                                    disabled={deletingItem}
                                    className="text-xs font-medium text-red-400 hover:text-red-300 transition-colors disabled:opacity-50"
                                  >
                                    {deletingItem ? "…" : "Delete"}
                                  </button>
                                  <button onClick={() => setConfirmDeleteSetId(null)} className="text-zinc-600 hover:text-zinc-400">
                                    <X size={14} />
                                  </button>
                                </div>
                              </div>
                            );
                          }

                          return (
                            <div key={set.id} className="flex items-center justify-between px-1 py-1">
                              <div className="flex items-center gap-2">
                                <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                                  set.isLastSet
                                    ? "bg-orange-500/20 text-orange-400"
                                    : "bg-zinc-800 text-zinc-500"
                                }`}>
                                  {set.isLastSet ? "Last" : `S${set.setIndex + 1}`}
                                </span>
                                <span className="text-sm text-zinc-300">
                                  {set.weight}kg × {set.reps} reps
                                </span>
                                {set.rpe && (
                                  <span className="text-xs text-zinc-600">@ RPE {set.rpe}</span>
                                )}
                              </div>
                              <div className="flex items-center gap-0.5">
                                <button
                                  onClick={() => {
                                    setEditingSetId(set.id);
                                    setEditWeight(String(set.weight));
                                    setEditReps(String(set.reps));
                                  }}
                                  className="text-zinc-600 hover:text-orange-400 transition-colors p-1"
                                >
                                  <Pencil size={13} />
                                </button>
                                <button
                                  onClick={() => setConfirmDeleteSetId(set.id)}
                                  className="text-zinc-700 hover:text-red-400 transition-colors p-1"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        );
      })}
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
