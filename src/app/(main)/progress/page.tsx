/* eslint-disable max-lines */
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import {
  getExerciseHistory, getWeeklyVolume, getPersonalRecords,
  getCompletedSessions, getSessionSets, updateSetLog, deleteWorkoutSession,
  deleteSetLog, deleteExerciseSetsFromSession, getAllExercises,
  updateExerciseIdForSets, addSetsToSession,
} from "@/lib/db";
import { DAY_LABELS } from "@/lib/program-data";
import { useProgramContext } from "@/context/ProgramContext";
import type { WorkoutSession, SetLog } from "@/lib/types";
import { TrendingUp, BarChart3, Clock, ChevronDown, Pencil, Check, X, Trash2, Plus } from "lucide-react";
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
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [sessionsLoaded, setSessionsLoaded] = useState(false);
  const [allExercisesDb, setAllExercisesDb] = useState<{ id: string; name: string; muscleGroup: string }[]>([]);

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

  const EXERCISE_NAME = useMemo(() => {
    const fromDb = Object.fromEntries(allExercisesDb.map((ex) => [ex.id, ex.name]));
    const fromProgram = Object.fromEntries(ALL_EXERCISES.map((ex) => [ex.id, ex.name]));
    return { ...fromDb, ...fromProgram };
  }, [ALL_EXERCISES, allExercisesDb]);

  useEffect(() => {
    async function init() {
      const sb = createClient();
      const { data: { user } } = await sb.auth.getUser();
      if (!user) { router.replace("/auth"); return; }
      setUserId(user.id);

      const [prData, volData, exData] = await Promise.all([
        getPersonalRecords(user.id),
        getWeeklyVolume(user.id),
        getAllExercises(),
      ]);
      setAllExercisesDb(exData);
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
                          <XAxis dataKey="date" tick={{ fill: "var(--muted)", fontSize: 11 }} tickFormatter={formatDate} />
                          <YAxis tick={{ fill: "var(--muted)", fontSize: 11 }} />
                          <Tooltip
                            contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--fg)" }}
                            labelFormatter={(l) => formatDate(String(l))}
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
                            <p className="text-xs text-muted mt-0.5">{formatDate(h.date)}</p>
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
          <HistoryTab
            sessions={sessions}
            loaded={sessionsLoaded}
            onSessionsUpdate={setSessions}
            exerciseName={EXERCISE_NAME}
            allExercises={allExercisesDb}
            userId={userId}
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
  allExercises,
  userId,
}: {
  sessions: WorkoutSession[];
  loaded: boolean;
  onSessionsUpdate: (s: WorkoutSession[]) => void;
  exerciseName: Record<string, string>;
  allExercises: { id: string; name: string; muscleGroup: string }[];
  userId: string | null;
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
  const [editExKey, setEditExKey] = useState<string | null>(null);
  const [editExSearch, setEditExSearch] = useState("");
  const [addToSessionId, setAddToSessionId] = useState<string | null>(null);
  const [addExId, setAddExId] = useState("");
  const [addExSearch, setAddExSearch] = useState("");
  const [addSetsRows, setAddSetsRows] = useState<{ weight: string; reps: string }[]>([{ weight: "", reps: "" }]);
  const [savingAdd, setSavingAdd] = useState(false);

  async function toggleSession(sessionId: string) {
    setEditingSetId(null);
    setConfirmDeleteId(null);
    setConfirmDeleteSetId(null);
    setConfirmDeleteExerciseKey(null);
    setEditExKey(null);
    setEditExSearch("");
    setAddToSessionId(null);
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
    await updateSetLog(setId, w, r, null);
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

  async function saveEditExercise(sessionId: string, oldExId: string, newExId: string) {
    if (!newExId || newExId === oldExId) { setEditExKey(null); setEditExSearch(""); return; }
    await updateExerciseIdForSets(sessionId, oldExId, newExId);
    setSetsCache((prev) => ({
      ...prev,
      [sessionId]: prev[sessionId]?.map((s) => s.exerciseId === oldExId ? { ...s, exerciseId: newExId } : s) ?? [],
    }));
    setEditExKey(null);
    setEditExSearch("");
  }

  async function saveAddExercise(sessionId: string) {
    if (!addExId || !userId) return;
    const validSets = addSetsRows
      .map((r) => ({ weight: parseFloat(r.weight), reps: parseInt(r.reps, 10) }))
      .filter((r) => !isNaN(r.weight) && !isNaN(r.reps) && r.weight > 0 && r.reps > 0);
    if (!validSets.length) return;
    setSavingAdd(true);
    const newSets = await addSetsToSession(sessionId, addExId, userId, validSets);
    setSetsCache((prev) => ({
      ...prev,
      [sessionId]: [...(prev[sessionId] ?? []), ...newSets],
    }));
    setAddToSessionId(null);
    setAddExId("");
    setAddExSearch("");
    setAddSetsRows([{ weight: "", reps: "" }]);
    setSavingAdd(false);
  }

  if (!loaded) {
    return <div className="text-center py-16 text-muted text-sm font-display">Loading history…</div>;
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
          <div key={session.id} className="bg-surface border border-border rounded-2xl overflow-hidden">
            {/* Session header row */}
            <div className="flex items-center px-4 py-3.5">
              <button
                onClick={() => toggleSession(session.id)}
                className="flex-1 flex items-center justify-between text-left cursor-pointer"
              >
                <div>
                  <p className="font-display font-semibold text-sm text-fg">
                    {DAY_LABELS[session.dayType] ?? session.dayType}
                    <span className="text-muted font-normal ml-2">· Week {session.week}</span>
                  </p>
                  <p className="text-xs text-muted mt-0.5">
                    {session.completedAt ? formatDate(session.completedAt.split("T")[0]) : ""}
                  </p>
                </div>
                <ChevronDown
                  size={16}
                  className={`text-muted transition-transform shrink-0 ml-2 ${isExpanded ? "rotate-180" : ""}`}
                />
              </button>

              {confirmDeleteId === session.id ? (
                <div className="flex items-center gap-2 ml-3 shrink-0">
                  <button
                    onClick={() => confirmDelete(session.id)}
                    disabled={deleting}
                    className="text-xs font-display font-semibold text-danger hover:opacity-80 transition-opacity disabled:opacity-50 cursor-pointer"
                  >
                    {deleting ? "Deleting…" : "Confirm"}
                  </button>
                  <button
                    onClick={() => setConfirmDeleteId(null)}
                    className="text-muted hover:text-fg transition-colors cursor-pointer"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <button
                  onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(session.id); }}
                  className="ml-3 shrink-0 text-subtle hover:text-danger transition-colors p-1 cursor-pointer"
                >
                  <Trash2 size={15} />
                </button>
              )}
            </div>

            {/* Expanded exercise list */}
            {isExpanded && (
              <div className="border-t border-border px-4 py-3 space-y-4">
                {sets === undefined ? (
                  <p className="text-xs text-muted py-2">Loading…</p>
                ) : exerciseOrder.length === 0 ? (
                  <p className="text-xs text-muted py-2">No sets logged.</p>
                ) : (
                  exerciseOrder.map((exId) => {
                    const exKey = `${session.id}:${exId}`;
                    const isEditingThisEx = editExKey === exKey;
                    const filteredExercises = allExercises
                      .filter((e) => e.name.toLowerCase().includes(editExSearch.toLowerCase()))
                      .slice(0, 25);
                    return (
                      <div key={exId}>
                        {isEditingThisEx ? (
                          <div className="mb-2 space-y-1">
                            <div className="flex items-center gap-2">
                              <input
                                autoFocus
                                type="text"
                                value={editExSearch}
                                onChange={(e) => setEditExSearch(e.target.value)}
                                placeholder="Search exercise…"
                                className="flex-1 text-xs bg-elevated border border-primary/50 rounded-lg px-2 py-1.5 text-fg focus:outline-none focus:border-primary"
                              />
                              <button onClick={() => { setEditExKey(null); setEditExSearch(""); }} className="text-muted hover:text-fg cursor-pointer">
                                <X size={14} />
                              </button>
                            </div>
                            <div className="bg-elevated border border-border rounded-xl overflow-hidden max-h-36 overflow-y-auto">
                              {filteredExercises.length === 0 ? (
                                <p className="text-xs text-muted px-3 py-2">No matches</p>
                              ) : filteredExercises.map((e) => (
                                <button
                                  key={e.id}
                                  onClick={() => saveEditExercise(session.id, exId, e.id)}
                                  className={`w-full text-left px-3 py-1.5 text-xs transition-colors cursor-pointer ${
                                    e.id === exId ? "text-primary bg-primary/10" : "text-fg hover:bg-border"
                                  }`}
                                >
                                  {e.name}
                                </button>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-xs font-display font-semibold text-muted uppercase tracking-wider">
                              {exerciseName[exId] ?? exId}
                            </p>
                            <div className="flex items-center gap-0.5 shrink-0 ml-2">
                              {confirmDeleteExerciseKey === exKey ? (
                                <>
                                  <button
                                    onClick={() => confirmDeleteExercise(session.id, exId)}
                                    disabled={deletingItem}
                                    className="text-xs font-display font-semibold text-danger hover:opacity-80 transition-opacity disabled:opacity-50 mr-1 cursor-pointer"
                                  >
                                    {deletingItem ? "…" : "Remove"}
                                  </button>
                                  <button onClick={() => setConfirmDeleteExerciseKey(null)} className="text-muted hover:text-fg cursor-pointer">
                                    <X size={12} />
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    onClick={() => { setEditExKey(exKey); setEditExSearch(""); setConfirmDeleteExerciseKey(null); }}
                                    className="text-subtle hover:text-primary transition-colors p-0.5 cursor-pointer"
                                    title="Change exercise"
                                  >
                                    <Pencil size={12} />
                                  </button>
                                  <button
                                    onClick={() => setConfirmDeleteExerciseKey(exKey)}
                                    className="text-subtle hover:text-danger transition-colors p-0.5 cursor-pointer"
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        )}

                        <div className="space-y-1">
                          {setsByExercise[exId].map((set) => {
                            if (editingSetId === set.id) {
                              return (
                                <div key={set.id} className="flex items-center gap-2 bg-elevated border border-border rounded-xl px-3 py-2">
                                  <input
                                    type="number"
                                    value={editWeight}
                                    onChange={(e) => setEditWeight(e.target.value)}
                                    step="any"
                                    min="0"
                                    className="w-20 bg-surface border border-border rounded-lg px-2 py-1 text-fg text-sm text-center focus:outline-none focus:border-primary"
                                    placeholder="kg"
                                  />
                                  <span className="text-muted text-xs">kg ×</span>
                                  <input
                                    type="number"
                                    value={editReps}
                                    onChange={(e) => setEditReps(e.target.value)}
                                    min="1"
                                    className="w-16 bg-surface border border-border rounded-lg px-2 py-1 text-fg text-sm text-center focus:outline-none focus:border-primary"
                                    placeholder="reps"
                                  />
                                  <span className="text-muted text-xs flex-1">reps</span>
                                  <button
                                    onClick={() => saveEdit(set.id)}
                                    className="text-accent hover:opacity-80 transition-opacity cursor-pointer"
                                  >
                                    <Check size={16} />
                                  </button>
                                  <button
                                    onClick={() => setEditingSetId(null)}
                                    className="text-muted hover:text-fg transition-colors cursor-pointer"
                                  >
                                    <X size={16} />
                                  </button>
                                </div>
                              );
                            }

                            if (confirmDeleteSetId === set.id) {
                              return (
                                <div key={set.id} className="flex items-center justify-between px-1 py-1">
                                  <span className="text-xs text-muted">
                                    {set.weight}kg × {set.reps} reps
                                  </span>
                                  <div className="flex items-center gap-2 shrink-0">
                                    <button
                                      onClick={() => confirmDeleteSet(set.id, session.id)}
                                      disabled={deletingItem}
                                      className="text-xs font-display font-semibold text-danger hover:opacity-80 transition-opacity disabled:opacity-50 cursor-pointer"
                                    >
                                      {deletingItem ? "…" : "Delete"}
                                    </button>
                                    <button onClick={() => setConfirmDeleteSetId(null)} className="text-muted hover:text-fg cursor-pointer">
                                      <X size={14} />
                                    </button>
                                  </div>
                                </div>
                              );
                            }

                            return (
                              <div key={set.id} className="flex items-center justify-between px-1 py-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs px-1.5 py-0.5 rounded-md font-display font-semibold bg-elevated text-muted">
                                    {set.setIndex + 1}
                                  </span>
                                  <span className="text-sm text-fg font-medium">
                                    {set.weight}kg × {set.reps} reps
                                  </span>
                                  {set.rpe && (
                                    <span className="text-xs text-subtle">@ RPE {set.rpe}</span>
                                  )}
                                </div>
                                <div className="flex items-center gap-0.5">
                                  <button
                                    onClick={() => {
                                      setEditingSetId(set.id);
                                      setEditWeight(String(set.weight));
                                      setEditReps(String(set.reps));
                                    }}
                                    className="text-subtle hover:text-primary transition-colors p-1 cursor-pointer"
                                  >
                                    <Pencil size={13} />
                                  </button>
                                  <button
                                    onClick={() => setConfirmDeleteSetId(set.id)}
                                    className="text-subtle hover:text-danger transition-colors p-1 cursor-pointer"
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

                {/* Add exercise */}
                {addToSessionId === session.id ? (
                  <div className="border-t border-border pt-3 mt-1 space-y-3">
                    <div className="space-y-1">
                      <input
                        autoFocus
                        type="text"
                        value={addExSearch}
                        onChange={(e) => { setAddExSearch(e.target.value); setAddExId(""); }}
                        placeholder="Search exercise…"
                        className="w-full text-xs bg-elevated border border-border rounded-xl px-3 py-2 text-fg focus:outline-none focus:border-primary"
                      />
                      {!addExId && (
                        <div className="bg-elevated border border-border rounded-xl overflow-hidden max-h-36 overflow-y-auto">
                          {allExercises
                            .filter((e) => e.name.toLowerCase().includes(addExSearch.toLowerCase()))
                            .slice(0, 25)
                            .map((e) => (
                              <button
                                key={e.id}
                                onClick={() => { setAddExId(e.id); setAddExSearch(e.name); }}
                                className="w-full text-left px-3 py-1.5 text-xs text-fg hover:bg-border transition-colors cursor-pointer"
                              >
                                {e.name}
                              </button>
                            ))}
                        </div>
                      )}
                      {addExId && (
                        <p className="text-xs text-primary px-1 font-display font-semibold">
                          {addExSearch}
                          <button onClick={() => { setAddExId(""); setAddExSearch(""); }} className="text-muted hover:text-fg ml-1 cursor-pointer">
                            <X size={10} className="inline" />
                          </button>
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      {addSetsRows.map((row, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <span className="text-xs text-muted w-6 font-display">S{i + 1}</span>
                          <input
                            type="number"
                            value={row.weight}
                            onChange={(e) => setAddSetsRows((prev) => prev.map((r, j) => j === i ? { ...r, weight: e.target.value } : r))}
                            placeholder="kg"
                            className="w-20 bg-elevated border border-border rounded-lg px-2 py-1 text-fg text-sm text-center focus:outline-none focus:border-primary"
                          />
                          <span className="text-muted text-xs">×</span>
                          <input
                            type="number"
                            value={row.reps}
                            onChange={(e) => setAddSetsRows((prev) => prev.map((r, j) => j === i ? { ...r, reps: e.target.value } : r))}
                            placeholder="reps"
                            className="w-16 bg-elevated border border-border rounded-lg px-2 py-1 text-fg text-sm text-center focus:outline-none focus:border-primary"
                          />
                          {addSetsRows.length > 1 && (
                            <button onClick={() => setAddSetsRows((prev) => prev.filter((_, j) => j !== i))} className="text-muted hover:text-danger transition-colors cursor-pointer">
                              <X size={14} />
                            </button>
                          )}
                        </div>
                      ))}
                      <button
                        onClick={() => setAddSetsRows((prev) => [...prev, { weight: "", reps: "" }])}
                        className="text-xs text-subtle hover:text-primary transition-colors flex items-center gap-1 pl-8 cursor-pointer"
                      >
                        <Plus size={11} /> Add set
                      </button>
                    </div>
                    <div className="flex items-center gap-4">
                      <button
                        onClick={() => saveAddExercise(session.id)}
                        disabled={!addExId || savingAdd}
                        className="text-xs font-display font-semibold text-primary hover:opacity-80 transition-opacity disabled:opacity-40 cursor-pointer"
                      >
                        {savingAdd ? "Saving…" : "Save"}
                      </button>
                      <button
                        onClick={() => { setAddToSessionId(null); setAddExId(""); setAddExSearch(""); setAddSetsRows([{ weight: "", reps: "" }]); }}
                        className="text-xs text-muted hover:text-fg transition-colors cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => { setAddToSessionId(session.id); setAddExId(""); setAddExSearch(""); setAddSetsRows([{ weight: "", reps: "" }]); }}
                    className="mt-2 text-xs text-subtle hover:text-primary transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <Plus size={12} /> Add exercise
                  </button>
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
    <div className="text-center py-16 text-muted text-sm font-display">
      {message}
    </div>
  );
}
