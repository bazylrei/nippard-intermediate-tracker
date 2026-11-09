"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase";
import {
  createSession,
  getIncompleteSession,
  updateSessionProgress,
  completeSession,
  logSet,
  getSessionSets,
  getLastSessionSetsForExercise,
  getPreferences,
} from "@/lib/db";
import { getWorkoutDay, DAY_LABELS, WARMUP_PROTOCOLS } from "@/lib/program-data";
import type { WorkoutSession, SetLog, UserPreferences, Exercise } from "@/lib/types";
import SetLogger from "@/components/SetLogger";
import WarmupChecklist from "@/components/WarmupChecklist";
import RestTimer from "@/components/RestTimer";
import { ArrowLeft, ChevronRight, Repeat2, Trophy, List, X, Play, CheckCircle2 } from "lucide-react";
import { Suspense } from "react";

type Phase = "overview" | "warmup" | "sets" | "rest";

function WorkoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [userId, setUserId] = useState<string | null>(null);
  const [session, setSession] = useState<WorkoutSession | null>(null);
  const [prefs, setPrefs] = useState<UserPreferences>({ unit: "kg", alternateSelections: {} });
  const [exerciseIndex, setExerciseIndex] = useState(0);
  const [setIndex, setSetIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("overview");
  const [sessionSets, setSessionSets] = useState<SetLog[]>([]);
  const [prevSets, setPrevSets] = useState<SetLog[]>([]);
  const [showRestTimer, setShowRestTimer] = useState(false);
  const [restDuration, setRestDuration] = useState(120);
  const [useAlternate, setUseAlternate] = useState<Record<string, boolean>>({});
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showExerciseList, setShowExerciseList] = useState(false);

  const week = parseInt(searchParams.get("week") ?? "1");
  const dayIndex = parseInt(searchParams.get("day") ?? "0");
  const workoutDay = getWorkoutDay(week, dayIndex);

  const resolvedExercises = workoutDay?.exercises.map((ex) =>
    useAlternate[ex.id] ? { ...ex, name: ex.alternateName } : ex
  ) ?? [];

  const currentExercise: Exercise | undefined = resolvedExercises[exerciseIndex];

  const loadPrevSets = useCallback(async (uid: string, exId: string) => {
    const sets = await getLastSessionSetsForExercise(uid, exId);
    setPrevSets(sets);
  }, []);

  useEffect(() => {
    async function init() {
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

      let sess: WorkoutSession;
      if (existing && existing.week === week && existing.dayIndex === dayIndex) {
        sess = existing;
        const sets = await getSessionSets(existing.id);
        setSessionSets(sets);
        setExerciseIndex(existing.currentExerciseIndex);
        setSetIndex(existing.currentSetIndex);
        setPhase(existing.currentSetIndex === -1 ? "warmup" : "sets");
      } else {
        const dayType = workoutDay?.dayType ?? "upper-a";
        sess = await createSession(user.id, week, dayIndex, dayType);
        setPhase("overview");
      }
      setSession(sess);

      const targetEx = workoutDay?.exercises[sess.currentExerciseIndex ?? 0];
      if (targetEx) await loadPrevSets(user.id, targetEx.id);

      setLoading(false);
    }
    init();
  }, [week, dayIndex, router, workoutDay, loadPrevSets]);

  useEffect(() => {
    if (!userId || !currentExercise) return;
    loadPrevSets(userId, currentExercise.id);
  }, [exerciseIndex, userId, currentExercise, loadPrevSets]);

  async function advanceTo(exIdx: number, sIdx: number) {
    if (!session) return;
    setExerciseIndex(exIdx);
    setSetIndex(sIdx);
    await updateSessionProgress(session.id, exIdx, sIdx);
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

  async function handleSetLogged(
    weight: number,
    reps: number,
    rpe: number | null,
    failureHit: boolean | null
  ) {
    if (!session || !currentExercise || !userId) return;
    const totalSets = totalSetsForExercise(currentExercise);
    const isLastSet = setIndex === totalSets - 1;

    await logSet({
      sessionId: session.id,
      userId,
      exerciseId: currentExercise.id,
      setIndex,
      isLastSet,
      weight,
      reps,
      rpe,
      failureHit,
    });

    const updated = await getSessionSets(session.id);
    setSessionSets(updated);

    const [restMin, restMax] = currentExercise.restSeconds;
    const mid = Math.round((restMin + restMax) / 2);
    setRestDuration(mid);
    setShowRestTimer(true);

    if (isLastSet) {
      if (exerciseIndex + 1 < resolvedExercises.length) {
        await advanceTo(exerciseIndex + 1, 0);
        setPhase("warmup");
      } else {
        await completeSession(session.id);
        setDone(true);
      }
    } else {
      await advanceTo(exerciseIndex, setIndex + 1);
    }
  }

  function handleWarmupComplete() {
    setPhase("sets");
  }

  function handleRestDone() {
    setShowRestTimer(false);
  }

  async function toggleAlternate(exId: string) {
    const next = { ...useAlternate, [exId]: !useAlternate[exId] };
    setUseAlternate(next);
    if (userId) {
      const sb = createClient();
      await sb.from("user_preferences").upsert(
        { user_id: userId, alternate_selections: next },
        { onConflict: "user_id" }
      );
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-zinc-500">Loading workout...</div>
      </div>
    );
  }

  if (!workoutDay || !currentExercise) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-zinc-500">Invalid workout.</div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 gap-6 text-center">
        <Trophy size={64} className="text-orange-400" />
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Workout Complete!</h1>
          <p className="text-zinc-400 mt-1">
            Week {week}, {DAY_LABELS[workoutDay.dayType]} — {resolvedExercises.length} exercises done
          </p>
        </div>
        <div className="flex flex-col gap-3 w-full max-w-xs">
          <button
            onClick={() => router.push("/progress")}
            className="bg-orange-500 hover:bg-orange-400 text-white font-semibold py-3 rounded-xl transition-colors"
          >
            View Progress
          </button>
          <button
            onClick={() => router.push("/")}
            className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-medium py-3 rounded-xl transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // ── Overview screen ──────────────────────────────────────────────────────────
  if (phase === "overview") {
    return (
      <div className="min-h-screen flex flex-col max-w-lg mx-auto">
        <div className="flex items-center gap-3 p-4 border-b border-zinc-800">
          <button onClick={() => router.push("/")} className="text-zinc-500 hover:text-zinc-200 transition-colors">
            <ArrowLeft size={20} />
          </button>
          <div>
            <p className="text-xs text-zinc-500">Week {week}</p>
            <h1 className="text-sm font-semibold text-zinc-200">{DAY_LABELS[workoutDay.dayType]}</h1>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <h2 className="text-lg font-bold text-zinc-100">Today&apos;s Workout</h2>
          <div className="space-y-2">
            {resolvedExercises.map((ex, i) => (
              <div key={i} className="bg-zinc-900 rounded-xl px-4 py-3 flex items-center gap-3">
                <span className="w-7 h-7 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-bold text-zinc-400 shrink-0">
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-zinc-200 truncate">{ex.name}</p>
                  <p className="text-xs text-zinc-500">
                    {ex.earlySetCount + ex.lastSetCount} sets · {ex.repRange[0]}–{ex.repRange[1]} reps
                  </p>
                </div>
                <span className="text-xs text-zinc-600 capitalize shrink-0">{ex.muscleGroup}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="p-4 border-t border-zinc-800">
          <button
            onClick={() => setPhase("warmup")}
            className="w-full flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-400 text-white font-semibold py-4 rounded-xl transition-colors"
          >
            <Play size={18} fill="currentColor" />
            Begin Workout
          </button>
        </div>
      </div>
    );
  }

  // ── Active workout ───────────────────────────────────────────────────────────
  const totalSets = totalSetsForExercise(currentExercise);
  const isLastSet = setIndex === totalSets - 1;
  const warmupSteps = WARMUP_PROTOCOLS[currentExercise.warmupProtocol];
  const hasWarmup = warmupSteps.length > 0;
  const setsForExercise = sessionSets.filter((s) => s.exerciseId === currentExercise.id && s.setIndex >= 0);

  return (
    <div className="min-h-screen flex flex-col max-w-lg mx-auto relative">
      {/* Exercise list overlay */}
      {showExerciseList && (
        <div className="absolute inset-0 z-20 bg-zinc-950 flex flex-col">
          <div className="flex items-center gap-3 p-4 border-b border-zinc-800">
            <button onClick={() => setShowExerciseList(false)} className="text-zinc-500 hover:text-zinc-200 transition-colors">
              <X size={20} />
            </button>
            <h2 className="text-sm font-semibold text-zinc-200">Exercises</h2>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {resolvedExercises.map((ex, i) => {
              const done = isExerciseDone(i);
              const isCurrent = i === exerciseIndex;
              return (
                <button
                  key={i}
                  onClick={() => {
                    advanceTo(i, 0);
                    setPhase("warmup");
                    setShowExerciseList(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-colors ${
                    isCurrent
                      ? "bg-orange-500/10 border border-orange-500/20"
                      : "bg-zinc-900 hover:bg-zinc-800"
                  }`}
                >
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                    done
                      ? "bg-green-800/60 text-green-400"
                      : isCurrent
                      ? "bg-orange-500/20 text-orange-400"
                      : "bg-zinc-800 text-zinc-500"
                  }`}>
                    {done ? <CheckCircle2 size={14} /> : i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${
                      isCurrent ? "text-zinc-100" : done ? "text-zinc-500" : "text-zinc-300"
                    }`}>
                      {ex.name}
                    </p>
                    <p className="text-xs text-zinc-600">
                      {ex.earlySetCount + ex.lastSetCount} sets · {ex.repRange[0]}–{ex.repRange[1]} reps
                    </p>
                  </div>
                  {done && <span className="text-xs text-green-500 shrink-0">Done</span>}
                  {isCurrent && !done && <span className="text-xs text-orange-400 shrink-0">Current</span>}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-zinc-800">
        <button onClick={() => setShowExerciseList(true)} className="text-zinc-500 hover:text-zinc-200 transition-colors">
          <List size={20} />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-zinc-500">Week {week} · {DAY_LABELS[workoutDay.dayType]}</p>
          <p className="text-sm font-medium text-zinc-200 truncate">
            Exercise {exerciseIndex + 1} of {resolvedExercises.length}
          </p>
        </div>
        <div className="flex gap-1">
          {resolvedExercises.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 w-1.5 rounded-full ${
                isExerciseDone(i) ? "bg-orange-500" : i === exerciseIndex ? "bg-orange-400" : "bg-zinc-700"
              }`}
            />
          ))}
        </div>
        <button onClick={() => router.push("/")} className="text-zinc-500 hover:text-zinc-200 transition-colors">
          <ArrowLeft size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* Exercise name */}
        <div className="space-y-1">
          <h2 className="text-xl font-bold text-zinc-100">{currentExercise.name}</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => toggleAlternate(currentExercise.id)}
              className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-orange-400 transition-colors"
            >
              <Repeat2 size={13} />
              Swap to: {useAlternate[currentExercise.id] ? workoutDay.exercises[exerciseIndex].name : currentExercise.alternateName}
            </button>
          </div>
        </div>

        {/* Form note */}
        {currentExercise.formNote && (
          <p className="text-sm text-zinc-400 bg-zinc-900 rounded-xl px-4 py-3 leading-relaxed">
            {currentExercise.formNote}
          </p>
        )}

        {/* Sets progress */}
        <div className="flex gap-1.5">
          {Array.from({ length: totalSets }).map((_, i) => {
            const logged = setsForExercise[i];
            const isLast = i === totalSets - 1;
            return (
              <div
                key={i}
                className={`flex-1 h-8 rounded-lg flex items-center justify-center text-xs font-medium ${
                  logged
                    ? isLast ? "bg-orange-500/20 text-orange-400 border border-orange-500/40" : "bg-green-900/30 text-green-400 border border-green-700/40"
                    : i === setIndex && phase === "sets"
                    ? isLast ? "bg-orange-500/30 border border-orange-500 text-orange-300" : "bg-zinc-700 border border-zinc-500 text-zinc-200"
                    : "bg-zinc-900 border border-zinc-800 text-zinc-600"
                }`}
              >
                {logged ? `${logged.reps}r` : isLast ? "●" : i + 1}
              </div>
            );
          })}
        </div>

        {/* Phase content */}
        {phase === "warmup" && hasWarmup ? (
          <WarmupChecklist
            protocol={currentExercise.warmupProtocol}
            onComplete={handleWarmupComplete}
          />
        ) : phase === "sets" || (phase === "warmup" && !hasWarmup) ? (
          <SetLogger
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
          className="w-full flex items-center justify-center gap-1.5 text-sm text-zinc-600 hover:text-zinc-400 py-2 transition-colors"
        >
          Skip exercise
          <ChevronRight size={14} />
        </button>
      </div>

      {showRestTimer && (
        <RestTimer
          durationSeconds={restDuration}
          onComplete={handleRestDone}
          onSkip={handleRestDone}
        />
      )}
    </div>
  );
}

export default function WorkoutPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-zinc-500">Loading...</div>}>
      <WorkoutContent />
    </Suspense>
  );
}
