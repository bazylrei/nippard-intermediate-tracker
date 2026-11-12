/* eslint-disable max-lines */
"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase";
import {
  createSession,
  getIncompleteSession,
  updateSessionProgress,
  completeSession,
  logSet,
  getSessionSets,
  deleteWorkoutSession,
  updateSetLog,
  saveExerciseNote,
  getLastSessionSetsForExercise,
  getExerciseHistory,
  getPreferences,
} from "@/lib/db";
import { DAY_LABELS } from "@/lib/program-data";
import { useProgramContext } from "@/context/ProgramContext";
import type { WorkoutSession, SetLog, UserPreferences, Exercise } from "@/lib/types";
import { cacheGet, cacheSet, cacheDelete } from "@/lib/cache";
import type { ActiveWorkoutInfo } from "@/components/ActiveWorkoutBanner";
import { useRestTimer } from "@/context/RestTimerContext";
import SetLogger from "@/components/SetLogger";
import WarmupChecklist from "@/components/WarmupChecklist";
import SetDetailSheet from "@/components/SetDetailSheet";
import ExerciseNotesSheet from "@/components/ExerciseNotesSheet";
import { ArrowLeft, ChevronRight, Repeat2, Trophy, List, X, Play, CheckCircle2, ExternalLink, Info, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { LineChart, Line, ResponsiveContainer, Tooltip, YAxis } from "recharts";
import { Suspense } from "react";

type Phase = "overview" | "warmup" | "sets";

function WorkoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { getWorkoutDay, warmupSteps, programId, ready: programReady } = useProgramContext();
  const [userId, setUserId] = useState<string | null>(null);
  const [session, setSession] = useState<WorkoutSession | null>(null);
  const cachedPrefs = cacheGet<UserPreferences>("prefs");
  const [prefs, setPrefs] = useState<UserPreferences>(cachedPrefs ?? { unit: "kg", alternateSelections: {}, exerciseNotes: {} });
  const [exerciseIndex, setExerciseIndex] = useState(0);
  const [setIndex, setSetIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("overview");
  const [sessionSets, setSessionSets] = useState<SetLog[]>([]);
  const [prevSets, setPrevSets] = useState<SetLog[]>([]);
  const { start: startRestTimer } = useRestTimer();
  const [useAlternate, setUseAlternate] = useState<Record<string, number>>(cachedPrefs?.alternateSelections ?? {});
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showExerciseList, setShowExerciseList] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [viewingSet, setViewingSet] = useState<SetLog | null>(null);
  const [showNotes, setShowNotes] = useState(false);
  const [postHistory, setPostHistory] = useState<Record<string, { date: string; weight: number; reps: number }[]>>({});

  const week = parseInt(searchParams.get("week") ?? "1");
  const dayIndex = parseInt(searchParams.get("day") ?? "0");
  const workoutDay = useMemo(() => getWorkoutDay(week, dayIndex), [week, dayIndex, getWorkoutDay]);

  const resolvedExercises = useMemo(() => workoutDay?.exercises.map((ex) => {
    const idx = useAlternate[ex.id] ?? 0;
    if (idx === 1) return { ...ex, name: ex.alternates[0] };
    if (idx === 2) return { ...ex, name: ex.alternates[1] };
    return ex;
  }) ?? [], [workoutDay, useAlternate]);

  const currentExercise: Exercise | undefined = resolvedExercises[exerciseIndex];

  const loadPrevSets = useCallback(async (uid: string, exId: string) => {
    const sets = await getLastSessionSetsForExercise(uid, exId);
    setPrevSets(sets);
  }, []);

  const writeBanner = useCallback((exIdx: number, exercises: Exercise[], wk: number, dIdx: number, dType: string) => {
    const ex = exercises[exIdx];
    if (!ex) return;
    const info: ActiveWorkoutInfo = {
      week: wk, dayIndex: dIdx, dayType: dType,
      exerciseName: ex.name,
      exerciseIndex: exIdx,
      exerciseTotal: exercises.length,
    };
    cacheSet("active_workout", info);
    window.dispatchEvent(new Event("active_workout_changed"));
  }, []);

  function clearBanner() {
    cacheDelete("active_workout");
    window.dispatchEvent(new Event("active_workout_changed"));
  }

  useEffect(() => {
    if (!programReady) return;

    async function init() {
      setDone(false);
      setLoading(true);
      setSessionSets([]);
      const sb = createClient();
      const { data: { user } } = await sb.auth.getUser();
      if (!user) { router.replace("/auth"); return; }
      setUserId(user.id);

      const [p, existing] = await Promise.all([
        getPreferences(user.id),
        getIncompleteSession(user.id),
      ]);
      setPrefs(p);
      setUseAlternate(p.alternateSelections);
      cacheSet("prefs", p);

      const exerciseCount = workoutDay?.exercises.length ?? 0;
      let sess: WorkoutSession;
      const matchesThisWorkout = existing && existing.week === week && existing.dayIndex === dayIndex;
      const hasValidProgress = matchesThisWorkout && existing.currentExerciseIndex < exerciseCount;

      if (hasValidProgress) {
        sess = existing;
        const sets = await getSessionSets(existing.id);
        setSessionSets(sets);
        setExerciseIndex(existing.currentExerciseIndex);
        setSetIndex(existing.currentSetIndex);
        setPhase(existing.currentSetIndex === -1 ? "warmup" : "sets");
      } else {
        const dayType = workoutDay?.dayType ?? "upper-a";
        sess = await createSession(user.id, week, dayIndex, dayType, programId);
        setPhase("overview");
      }
      setSession(sess);

      const exercises = workoutDay?.exercises ?? [];
      const resolvedExs = exercises.map((ex) => {
        const idx = p.alternateSelections[ex.id] ?? 0;
        if (idx === 1) return { ...ex, name: ex.alternates[0] };
        if (idx === 2) return { ...ex, name: ex.alternates[1] };
        return ex;
      });
      writeBanner(sess.currentExerciseIndex ?? 0, resolvedExs, week, dayIndex, sess.dayType);

      const targetEx = exercises[sess.currentExerciseIndex ?? 0];
      if (targetEx) await loadPrevSets(user.id, targetEx.id);

      setLoading(false);
    }
    init();
  }, [week, dayIndex, router, workoutDay, loadPrevSets, programReady, programId, writeBanner]);

  useEffect(() => {
    if (!userId || !currentExercise?.id) return;
    const uid = userId;
    const exId = currentExercise.id;
    async function run() { await loadPrevSets(uid, exId); }
    void run();
  }, [exerciseIndex, userId, currentExercise?.id, loadPrevSets]);

  useEffect(() => {
    if (!done || !userId || resolvedExercises.length === 0) return;
    Promise.all(
      resolvedExercises.map((ex) =>
        getExerciseHistory(userId, ex.id).then((h) => [ex.id, h] as const)
      )
    ).then((results) => setPostHistory(Object.fromEntries(results)));
  }, [done, userId, resolvedExercises]); 

  async function advanceTo(exIdx: number, sIdx: number) {
    if (!session) return;
    setExerciseIndex(exIdx);
    setSetIndex(sIdx);
    await updateSessionProgress(session.id, exIdx, sIdx);
    writeBanner(exIdx, resolvedExercises, week, dayIndex, session.dayType);
  }

  function totalSetsForExercise(ex: Exercise): number {
    return ex.earlySetCount + ex.lastSetCount;
  }

  function isExerciseDone(exIdx: number): boolean {
    const ex = resolvedExercises[exIdx];
    if (!ex) return false;
    const logged = sessionSets.filter((s) => s.exerciseId === ex.id && s.setIndex >= 0);
    return logged.length >= totalSetsForExercise(ex);
  }

  async function handleSetLogged(weight: number, reps: number, rpe: number | null, failureHit: boolean | null) {
    if (!session || !currentExercise || !userId) return;
    const totalSets = totalSetsForExercise(currentExercise);
    const isLastSet = setIndex === totalSets - 1;

    await logSet({ sessionId: session.id, userId, exerciseId: currentExercise.id, setIndex, isLastSet, weight, reps, rpe, failureHit });

    const updated = await getSessionSets(session.id);
    setSessionSets(updated);

    const [restMin, restMax] = currentExercise.restSeconds;
    startRestTimer(Math.round((restMin + restMax) / 2));

    if (isLastSet) {
      const allDone = resolvedExercises.every((ex) => {
        const exSets = updated.filter((s) => s.exerciseId === ex.id && s.setIndex >= 0);
        return exSets.length >= totalSetsForExercise(ex);
      });
      if (allDone) {
        await completeSession(session.id);
        clearBanner();
        setDone(true);
      } else {
        const nextIdx = resolvedExercises.findIndex((ex, i) => {
          const exSets = updated.filter((s) => s.exerciseId === ex.id && s.setIndex >= 0);
          return i !== exerciseIndex && exSets.length < totalSetsForExercise(ex);
        });
        const targetIdx = nextIdx !== -1 ? nextIdx : exerciseIndex + 1;
        await advanceTo(targetIdx, -1);
        setPhase("warmup");
      }
    } else {
      await advanceTo(exerciseIndex, setIndex + 1);
    }
  }

  async function handleEditSet(setId: string, weightKg: number, reps: number, rpe: number | null) {
    await updateSetLog(setId, weightKg, reps, rpe);
    if (session) {
      const updated = await getSessionSets(session.id);
      setSessionSets(updated);
    }
    setViewingSet((prev) => prev ? { ...prev, weight: weightKg, reps, rpe } : null);
  }

  async function handleSaveNote(note: string) {
    if (!userId || !currentExercise) return;
    const current = prefs.exerciseNotes ?? {};
    await saveExerciseNote(userId, currentExercise.id, note, current);
    const updated = { ...prefs, exerciseNotes: { ...current, [currentExercise.id]: note } };
    setPrefs(updated);
    cacheSet("prefs", updated);
  }

  async function handleWarmupComplete() {
    setSetIndex(0);
    setPhase("sets");
    if (session) await updateSessionProgress(session.id, exerciseIndex, 0);
  }

  async function toggleAlternate(exId: string) {
    const current = useAlternate[exId] ?? 0;
    const next = { ...useAlternate, [exId]: (current + 1) % 3 };
    setUseAlternate(next);
    cacheSet("prefs", { ...prefs, alternateSelections: next });
    if (userId) {
      const sb = createClient();
      await sb.from("user_preferences").upsert(
        { user_id: userId, alternate_selections: next },
        { onConflict: "user_id" }
      );
    }
  }

  if (!programReady && loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg">
        <div className="text-muted text-sm">Loading workout…</div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg">
        <div className="text-muted text-sm">Loading workout…</div>
      </div>
    );
  }

  if (!workoutDay || !currentExercise) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg">
        <div className="text-muted text-sm">Invalid workout.</div>
      </div>
    );
  }

  // ── Done screen ──────────────────────────────────────────────────────────
  if (done) {
    const totalWorkingSets = sessionSets.filter((s) => s.setIndex >= 0).length;

    return (
      <div className="min-h-screen bg-bg pb-16">
        <div className="max-w-lg mx-auto px-4">
          {/* Header */}
          <div className="flex flex-col items-center text-center pt-12 pb-8 gap-4">
            <div className="w-20 h-20 glass gloss rounded-full flex items-center justify-center"
              style={{ boxShadow: "0 0 40px color-mix(in srgb, var(--primary) 25%, transparent)" }}>
              <Trophy size={40} className="text-primary" />
            </div>
            <div>
              <h1 className="font-display text-4xl font-bold text-fg leading-tight">Workout Complete!</h1>
              <p className="text-muted mt-1 text-sm">
                Week {week} · {DAY_LABELS[workoutDay.dayType]}
              </p>
              <p className="text-muted text-xs mt-0.5">
                {resolvedExercises.length} exercises · {totalWorkingSets} sets
              </p>
            </div>
            <div className="flex gap-3 w-full max-w-xs">
              <button
                onClick={() => router.push("/")}
                className="flex-1 glass gloss text-fg font-medium py-3 rounded-2xl transition-colors cursor-pointer text-sm"
              >
                Home
              </button>
              <button
                onClick={() => router.push("/progress")}
                className="flex-1 gloss text-primary-fg font-display font-bold py-3 rounded-2xl transition-opacity cursor-pointer hover:opacity-90 text-sm"
                style={{
                  background: "linear-gradient(170deg, color-mix(in srgb, var(--primary) 80%, white) 0%, var(--primary) 100%)",
                  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.2), 0 4px 20px color-mix(in srgb, var(--primary) 35%, transparent)",
                }}
              >
                Full Progress
              </button>
            </div>
          </div>

          {/* Per-exercise cards */}
          <div className="space-y-4">
            {resolvedExercises.map((ex) => {
              const exSets = sessionSets.filter((s) => s.exerciseId === ex.id && s.setIndex >= 0);
              if (exSets.length === 0) return null;

              const history = postHistory[ex.id] ?? [];
              const chartData = history.slice(-8).map((h, i, arr) => ({
                session: i + 1,
                weight: Math.round(h.weight * 10) / 10,
                isToday: i === arr.length - 1,
              }));

              const todayBest = exSets.reduce((m, s) => s.weight > m.weight ? s : m, exSets[0]);
              const prevPoint = history.length >= 2 ? history[history.length - 2] : null;
              const todayWeight = history[history.length - 1]?.weight ?? todayBest.weight;
              const delta = prevPoint ? todayWeight - prevPoint.weight : null;
              const totalVolume = Math.round(exSets.reduce((sum, s) => sum + s.weight * s.reps, 0));
              const displayWeight = prefs.unit === "lbs"
                ? Math.round(todayBest.weight * 2.20462 * 4) / 4
                : todayBest.weight;

              return (
                <div key={ex.id} className="glass gloss rounded-2xl p-4 space-y-3">
                  {/* Exercise header */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-display font-bold text-base text-fg leading-tight">{ex.name}</p>
                      <p className="text-xs text-muted capitalize">{ex.muscleGroup}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-display font-bold text-xl text-fg">
                        {ex.weightPerSide && <span className="text-sm text-muted mr-0.5">2×</span>}
                        {displayWeight}{prefs.unit}
                      </p>
                      <p className="text-xs text-muted">{exSets.length} sets · {exSets.map(s => s.reps).join("-")} reps</p>
                    </div>
                  </div>

                  {/* Delta vs last time + volume */}
                  <div className="flex items-center gap-3">
                    {delta !== null && (
                      <div className={`flex items-center gap-1 text-xs font-display font-semibold px-2.5 py-1 rounded-full ${
                        delta > 0 ? "text-accent" : delta < 0 ? "text-danger" : "text-muted"
                      }`} style={{ background: delta > 0
                        ? "color-mix(in srgb, var(--accent) 12%, transparent)"
                        : delta < 0
                        ? "color-mix(in srgb, var(--danger) 12%, transparent)"
                        : "color-mix(in srgb, var(--fg) 8%, transparent)"
                      }}>
                        {delta > 0 ? <TrendingUp size={11} /> : delta < 0 ? <TrendingDown size={11} /> : <Minus size={11} />}
                        {delta > 0 ? "+" : ""}{Math.round(delta * 10) / 10}{prefs.unit} vs last
                      </div>
                    )}
                    <div className="text-xs text-muted">
                      Vol: <span className="text-fg font-display font-semibold">{Math.round(totalVolume * (prefs.unit === "lbs" ? 2.20462 : 1))}{prefs.unit}</span>
                    </div>
                  </div>

                  {/* Sparkline chart */}
                  {chartData.length >= 2 && (
                    <div>
                      <p className="text-[10px] text-subtle uppercase tracking-widest mb-1 font-display">Weight progression (last set)</p>
                      <ResponsiveContainer width="100%" height={72}>
                        <LineChart data={chartData} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
                          <YAxis domain={["auto", "auto"]} hide />
                          <Tooltip
                            content={({ active, payload }) => {
                              if (!active || !payload?.length) return null;
                              const d = payload[0].payload as { weight: number; isToday: boolean };
                              return (
                                <div className="glass rounded-lg px-2 py-1 text-xs font-display font-semibold"
                                  style={{ border: "1px solid color-mix(in srgb, var(--fg) 10%, transparent)", background: "var(--surface)" }}>
                                  {d.isToday ? "Today · " : ""}{d.weight}{prefs.unit}
                                </div>
                              );
                            }}
                          />
                          <Line
                            type="monotone"
                            dataKey="weight"
                            stroke="var(--primary)"
                            strokeWidth={2}
                            dot={(props) => {
                              const { cx, cy, payload } = props as { cx: number; cy: number; payload: { isToday: boolean } };
                              if (payload.isToday) {
                                return <circle key={`dot-${cx}-${cy}`} cx={cx} cy={cy} r={4} fill="var(--primary)" stroke="var(--bg)" strokeWidth={2} />;
                              }
                              return <circle key={`dot-${cx}-${cy}`} cx={cx} cy={cy} r={2} fill="var(--primary)" opacity={0.4} />;
                            }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                  {chartData.length < 2 && (
                    <p className="text-xs text-subtle text-center py-2">First time logging this exercise — come back next session to see your progress.</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // ── Overview screen ──────────────────────────────────────────────────────
  if (phase === "overview") {
    return (
      <div className="h-dvh flex flex-col max-w-lg mx-auto">
        <div className="flex items-center gap-3 p-4" style={{ borderBottom: "1px solid color-mix(in srgb, var(--fg) 8%, transparent)" }}>
          <button onClick={() => router.push("/")} className="text-subtle hover:text-fg transition-colors cursor-pointer">
            <ArrowLeft size={20} />
          </button>
          <div>
            <p className="font-display font-semibold text-xs tracking-widest text-muted uppercase">Week {week}</p>
            <h1 className="font-display text-lg font-bold text-fg">{DAY_LABELS[workoutDay.dayType]}</h1>
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3">
          <p className="font-display font-semibold text-xs tracking-widest text-muted uppercase">
            {resolvedExercises.length} exercises
          </p>
          <div className="space-y-2">
            {resolvedExercises.map((ex, i) => (
              <div key={i} className="glass gloss rounded-xl px-4 py-3 flex items-center gap-3">
                <span className="w-7 h-7 rounded-lg flex items-center justify-center font-display text-xs font-bold text-muted shrink-0"
                  style={{ background: "color-mix(in srgb, var(--fg) 8%, transparent)" }}>
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-display font-semibold text-fg truncate">{ex.name}</p>
                  <p className="text-xs text-muted">
                    {ex.earlySetCount + ex.lastSetCount} sets · {ex.repRange[0]}–{ex.repRange[1]} reps
                  </p>
                </div>
                <span className="text-xs text-subtle capitalize shrink-0">{ex.muscleGroup}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="p-4" style={{ borderTop: "1px solid color-mix(in srgb, var(--fg) 8%, transparent)" }}>
          <button
            onClick={() => setPhase("warmup")}
            className="gloss w-full flex items-center justify-center gap-2 text-primary-fg font-display font-bold text-lg py-4 rounded-2xl transition-opacity cursor-pointer hover:opacity-90"
            style={{
              background: "linear-gradient(170deg, color-mix(in srgb, var(--primary) 80%, white) 0%, var(--primary) 100%)",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.2), 0 4px 20px color-mix(in srgb, var(--primary) 35%, transparent)",
            }}
          >
            <Play size={20} fill="currentColor" />
            Begin Workout
          </button>
        </div>
      </div>
    );
  }

  // ── Active workout ───────────────────────────────────────────────────────
  const totalSets = totalSetsForExercise(currentExercise);
  const isLastSet = setIndex === totalSets - 1;
  const currentWarmupSteps = warmupSteps[currentExercise.warmupProtocol] ?? [];
  const hasWarmup = currentWarmupSteps.length > 0;
  const setsForExercise = sessionSets.filter((s) => s.exerciseId === currentExercise.id && s.setIndex >= 0);

  return (
    <div className="h-dvh flex flex-col max-w-lg mx-auto relative">
      {/* Exercise list overlay */}
      {showExerciseList && (
        <div className="absolute inset-0 z-20 flex flex-col" style={{ background: "var(--bg)" }}>
          <div className="flex items-center gap-3 p-4" style={{ borderBottom: "1px solid color-mix(in srgb, var(--fg) 8%, transparent)" }}>
            <button onClick={() => setShowExerciseList(false)} className="text-subtle hover:text-fg transition-colors cursor-pointer">
              <X size={20} />
            </button>
            <h2 className="font-display font-bold text-fg">Exercises</h2>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {resolvedExercises.map((ex, i) => {
              const exDone = isExerciseDone(i);
              const isCurrent = i === exerciseIndex;
              return (
                <button
                  key={i}
                  onClick={async () => { await advanceTo(i, -1); setPhase("warmup"); setShowExerciseList(false); }}
                  className={`w-full glass gloss flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-colors cursor-pointer ${
                    isCurrent ? "border-primary/30" : ""
                  }`}
                  style={isCurrent ? { borderColor: "color-mix(in srgb, var(--primary) 30%, transparent)" } : {}}
                >
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-display text-xs font-bold shrink-0 ${
                    exDone ? "bg-accent/20 text-accent" : isCurrent ? "bg-primary/20 text-primary" : "text-muted"
                  }`} style={!exDone && !isCurrent ? { background: "color-mix(in srgb, var(--fg) 8%, transparent)" } : {}}>
                    {exDone ? <CheckCircle2 size={14} /> : i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`font-display font-semibold truncate ${isCurrent ? "text-fg" : exDone ? "text-muted" : "text-fg"}`}>
                      {ex.name}
                    </p>
                    <p className="text-xs text-muted">{ex.earlySetCount + ex.lastSetCount} sets · {ex.repRange[0]}–{ex.repRange[1]} reps</p>
                  </div>
                  {exDone && <span className="text-xs text-accent shrink-0">Done</span>}
                  {isCurrent && !exDone && <span className="text-xs text-primary shrink-0">Now</span>}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: "1px solid color-mix(in srgb, var(--fg) 8%, transparent)" }}>
        <button onClick={() => setShowExerciseList(true)} className="text-subtle hover:text-fg transition-colors cursor-pointer">
          <List size={20} />
        </button>
        <div className="flex-1 min-w-0">
          <p className="font-display text-xs font-semibold tracking-widest text-muted uppercase">
            Week {week} · {DAY_LABELS[workoutDay.dayType]}
          </p>
          <p className="text-xs text-muted">
            Exercise {exerciseIndex + 1} of {resolvedExercises.length}
          </p>
        </div>
        {/* Progress dots */}
        <div className="flex gap-1 items-center">
          {resolvedExercises.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                isExerciseDone(i)
                  ? "bg-primary w-4"
                  : i === exerciseIndex
                  ? "w-4"
                  : "w-1.5"
              }`}
              style={i === exerciseIndex && !isExerciseDone(i)
                ? { background: "color-mix(in srgb, var(--primary) 50%, transparent)" }
                : !isExerciseDone(i)
                ? { background: "color-mix(in srgb, var(--fg) 15%, transparent)" }
                : {}
              }
            />
          ))}
        </div>
        {/* Back / discard */}
        {confirmDiscard ? (
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={async () => {
                if (session) await deleteWorkoutSession(session.id);
                clearBanner();
                router.push("/");
              }}
              className="text-xs font-display font-semibold text-danger cursor-pointer"
            >
              Discard
            </button>
            <button onClick={() => setConfirmDiscard(false)} className="text-muted hover:text-fg cursor-pointer">
              <X size={16} />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => router.push("/")}
              className="text-subtle hover:text-fg transition-colors cursor-pointer"
              title="Go home"
            >
              <ArrowLeft size={20} />
            </button>
            <button
              onClick={() => setConfirmDiscard(true)}
              className="text-xs text-subtle hover:text-danger transition-colors cursor-pointer font-display"
              title="Discard workout"
            >
              Discard
            </button>
          </div>
        )}
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-5">
        {/* Exercise name */}
        <div className="space-y-1">
          <div className="flex items-start gap-2">
            <h2 className="font-display text-4xl font-bold text-fg leading-tight flex-1">{currentExercise.name}</h2>
            <button
              onClick={() => setShowNotes(true)}
              className="mt-1 shrink-0 transition-colors cursor-pointer"
              style={{ color: prefs.exerciseNotes?.[currentExercise.id] ? "var(--primary)" : "var(--subtle)" }}
            >
              <Info size={20} />
            </button>
          </div>
          <div className="flex items-center gap-2">
            {(() => {
              const origEx = workoutDay.exercises[exerciseIndex];
              const idx = useAlternate[currentExercise.id] ?? 0;
              const nextIdx = (idx + 1) % 3;
              const names = [origEx.name, origEx.alternates[0], origEx.alternates[1]];
              return (
                <button
                  onClick={() => toggleAlternate(currentExercise.id)}
                  className="flex items-center gap-1.5 text-xs text-subtle hover:text-primary transition-colors cursor-pointer"
                >
                  <Repeat2 size={13} />
                  Swap to {names[nextIdx]}
                </button>
              );
            })()}
          </div>
        </div>

        {/* Form note */}
        {currentExercise.formNote && (
          <p className="text-sm text-muted glass rounded-xl px-4 py-3 leading-relaxed">
            {currentExercise.formNote}
          </p>
        )}

        {/* User's personal note */}
        {prefs.exerciseNotes?.[currentExercise.id] && (
          <button
            onClick={() => setShowNotes(true)}
            className="w-full text-left rounded-xl px-4 py-3 space-y-0.5 cursor-pointer transition-opacity hover:opacity-80"
            style={{ background: "color-mix(in srgb, var(--primary) 8%, transparent)", border: "1px solid color-mix(in srgb, var(--primary) 20%, transparent)" }}
          >
            <p className="text-xs font-display font-semibold text-primary uppercase tracking-widest">My notes</p>
            <p className="text-sm text-fg leading-relaxed">{prefs.exerciseNotes[currentExercise.id]}</p>
          </button>
        )}

        {currentExercise.youtubeUrl && (
          <a
            href={currentExercise.youtubeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-subtle hover:text-danger transition-colors"
          >
            <ExternalLink size={13} />
            Watch tutorial
          </a>
        )}

        {/* Sets progress — glass tiles */}
        <div className="space-y-2">
          <span className="text-xs font-display font-semibold uppercase tracking-widest text-muted">Sets</span>
          <div className="flex gap-2">
            {Array.from({ length: totalSets }).map((_, i) => {
              const logged = setsForExercise[i];
              const isCurrent = i === setIndex && phase === "sets";
              return logged ? (
                <button
                  key={i}
                  onClick={() => setViewingSet(logged)}
                  className="flex-1 h-12 rounded-xl flex flex-col items-center justify-center font-display font-bold text-sm transition-opacity glass cursor-pointer hover:opacity-80 active:scale-95"
                  style={{ background: "color-mix(in srgb, var(--accent) 15%, transparent)", borderColor: "color-mix(in srgb, var(--accent) 30%, transparent)", color: "var(--accent)" }}
                >
                  <span className="text-base leading-none">{logged.reps}</span>
                  <span className="text-[10px] font-normal opacity-70">reps</span>
                </button>
              ) : (
                <div
                  key={i}
                  className="flex-1 h-12 rounded-xl flex items-center justify-center font-display font-bold text-sm glass"
                  style={
                    isCurrent
                      ? { borderColor: "color-mix(in srgb, var(--fg) 20%, transparent)", color: "var(--fg)" }
                      : { color: "var(--subtle)" }
                  }
                >
                  {i + 1}
                </div>
              );
            })}
          </div>
        </div>

        {/* Phase content */}
        {phase === "warmup" && hasWarmup ? (
          <WarmupChecklist
            key={`warmup-${exerciseIndex}`}
            steps={currentWarmupSteps}
            onComplete={handleWarmupComplete}
            onSkip={handleWarmupComplete}
            prevWorkingWeightKg={prevSets.length > 0 ? prevSets[prevSets.length - 1].weight : undefined}
            unit={prefs.unit}
          />
        ) : phase === "sets" || (phase === "warmup" && !hasWarmup) ? (
          <SetLogger
            key={`${currentExercise.id}-${setIndex}`}
            exercise={currentExercise}
            setIndex={setIndex}
            isLastSet={isLastSet}
            previousSets={prevSets}
            unit={prefs.unit}
            onLog={handleSetLogged}
          />
        ) : null}

        {/* Skip exercise */}
        <button
          onClick={async () => {
            if (exerciseIndex + 1 < resolvedExercises.length) {
              await advanceTo(exerciseIndex + 1, 0);
              setPhase("warmup");
            } else {
              if (session) await completeSession(session.id);
              setDone(true);
            }
          }}
          className="w-full flex items-center justify-center gap-1.5 text-sm text-subtle hover:text-muted py-2 transition-colors cursor-pointer"
        >
          Skip exercise
          <ChevronRight size={14} />
        </button>
      </div>

      {showNotes && currentExercise && (
        <ExerciseNotesSheet
          exercise={currentExercise}
          existingNote={prefs.exerciseNotes?.[currentExercise.id] ?? ""}
          onClose={() => setShowNotes(false)}
          onSave={handleSaveNote}
        />
      )}

      {viewingSet && (
        <SetDetailSheet
          set={viewingSet}
          exercise={currentExercise}
          unit={prefs.unit}
          onClose={() => setViewingSet(null)}
          onSave={handleEditSet}
        />
      )}
    </div>
  );
}

export default function WorkoutPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-bg text-muted text-sm">
        Loading…
      </div>
    }>
      <WorkoutContent />
    </Suspense>
  );
}
