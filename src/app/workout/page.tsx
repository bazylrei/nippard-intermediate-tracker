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
  deleteSetLog,
  getLastSessionSetsForExercise,
  getPreferences,
} from "@/lib/db";
import { DAY_LABELS } from "@/lib/program-data";
import { useProgramContext } from "@/context/ProgramContext";
import type { WorkoutSession, SetLog, UserPreferences, Exercise } from "@/lib/types";
import { cacheGet, cacheSet } from "@/lib/cache";
import SetLogger from "@/components/SetLogger";
import WarmupChecklist from "@/components/WarmupChecklist";
import RestTimer from "@/components/RestTimer";
import { ArrowLeft, ChevronRight, Repeat2, Trophy, List, X, Play, CheckCircle2, ExternalLink } from "lucide-react";
import { Suspense } from "react";

type Phase = "overview" | "warmup" | "sets" | "rest";

function WorkoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { getWorkoutDay, warmupSteps, programId, ready: programReady } = useProgramContext();
  const [userId, setUserId] = useState<string | null>(null);
  const [session, setSession] = useState<WorkoutSession | null>(null);
  const cachedPrefs = cacheGet<UserPreferences>("prefs");
  const [prefs, setPrefs] = useState<UserPreferences>(cachedPrefs ?? { unit: "kg", alternateSelections: {} });
  const [exerciseIndex, setExerciseIndex] = useState(0);
  const [setIndex, setSetIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("overview");
  const [sessionSets, setSessionSets] = useState<SetLog[]>([]);
  const [prevSets, setPrevSets] = useState<SetLog[]>([]);
  const [showRestTimer, setShowRestTimer] = useState(false);
  const [restDuration, setRestDuration] = useState(120);
  const [useAlternate, setUseAlternate] = useState<Record<string, number>>(cachedPrefs?.alternateSelections ?? {});
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showExerciseList, setShowExerciseList] = useState(false);

  const week = parseInt(searchParams.get("week") ?? "1");
  const dayIndex = parseInt(searchParams.get("day") ?? "0");
  const workoutDay = useMemo(() => getWorkoutDay(week, dayIndex), [week, dayIndex, getWorkoutDay]);

  const resolvedExercises = workoutDay?.exercises.map((ex) => {
    const idx = useAlternate[ex.id] ?? 0;
    if (idx === 1) return { ...ex, name: ex.alternates[0] };
    if (idx === 2) return { ...ex, name: ex.alternates[1] };
    return ex;
  }) ?? [];

  const currentExercise: Exercise | undefined = resolvedExercises[exerciseIndex];

  const loadPrevSets = useCallback(async (uid: string, exId: string) => {
    const sets = await getLastSessionSetsForExercise(uid, exId);
    setPrevSets(sets);
  }, []);

  useEffect(() => {
    if (!programReady) return;
    setDone(false);
    setLoading(true);
    setSessionSets([]);

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

      const targetEx = workoutDay?.exercises[sess.currentExerciseIndex ?? 0];
      if (targetEx) await loadPrevSets(user.id, targetEx.id);

      setLoading(false);
    }
    init();
  }, [week, dayIndex, router, workoutDay, loadPrevSets, programReady]);

  useEffect(() => {
    if (!userId || !currentExercise) return;
    loadPrevSets(userId, currentExercise.id);
  }, [exerciseIndex, userId, currentExercise?.id, loadPrevSets]);

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

  async function handleGoBack() {
    if (!session) return;
    const workingSets = sessionSets.filter((s) => s.setIndex >= 0);
    if (workingSets.length === 0) return;
    const lastSet = workingSets[workingSets.length - 1];
    await deleteSetLog(lastSet.id);
    const updated = await getSessionSets(session.id);
    setSessionSets(updated);
    const exIdx = resolvedExercises.findIndex((ex) => ex.id === lastSet.exerciseId);
    if (exIdx === -1) return;
    await advanceTo(exIdx, lastSet.setIndex);
    setPhase("sets");
  }

  function handleWarmupComplete() { setPhase("sets"); }
  function handleRestDone() { setShowRestTimer(false); }

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
        <div className="text-muted text-sm">Loading workout...</div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg">
        <div className="text-muted text-sm">Loading workout...</div>
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
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 gap-8 text-center bg-bg">
        <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center">
          <Trophy size={48} className="text-primary" />
        </div>
        <div>
          <h1 className="font-display text-5xl font-bold text-fg leading-tight">Workout Complete!</h1>
          <p className="text-muted mt-2">
            Week {week} · {DAY_LABELS[workoutDay.dayType]} · {resolvedExercises.length} exercises
          </p>
        </div>
        <div className="flex flex-col gap-3 w-full max-w-xs">
          <button
            onClick={() => router.push("/progress")}
            className="bg-primary hover:opacity-90 text-primary-fg font-display font-bold text-lg py-4 rounded-2xl transition-opacity cursor-pointer"
          >
            View Progress
          </button>
          <button
            onClick={() => router.push("/")}
            className="bg-surface border border-border hover:bg-elevated text-fg font-medium py-4 rounded-2xl transition-colors cursor-pointer"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // ── Overview screen ──────────────────────────────────────────────────────
  if (phase === "overview") {
    return (
      <div className="h-dvh flex flex-col max-w-lg mx-auto bg-bg">
        <div className="flex items-center gap-3 p-4 border-b border-border">
          <button
            onClick={() => router.push("/")}
            className="text-subtle hover:text-fg transition-colors cursor-pointer"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <p className="font-display font-semibold text-xs tracking-widest text-muted uppercase">Week {week}</p>
            <h1 className="font-display text-lg font-bold text-fg">{DAY_LABELS[workoutDay.dayType]}</h1>
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3">
          <p className="font-display font-semibold text-xs tracking-widest text-muted uppercase">
            Today&apos;s Workout — {resolvedExercises.length} exercises
          </p>
          <div className="space-y-2">
            {resolvedExercises.map((ex, i) => (
              <div key={i} className="bg-surface border border-border rounded-xl px-4 py-3 flex items-center gap-3">
                <span className="w-7 h-7 rounded-lg bg-elevated flex items-center justify-center font-display text-xs font-bold text-muted shrink-0">
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

        <div className="p-4 border-t border-border">
          <button
            onClick={() => setPhase("warmup")}
            className="w-full flex items-center justify-center gap-2 bg-primary hover:opacity-90 text-primary-fg font-display font-bold text-lg py-4 rounded-2xl transition-opacity cursor-pointer"
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
    <div className="h-dvh flex flex-col max-w-lg mx-auto relative bg-bg">
      {/* Exercise list overlay */}
      {showExerciseList && (
        <div className="absolute inset-0 z-20 bg-bg flex flex-col">
          <div className="flex items-center gap-3 p-4 border-b border-border">
            <button
              onClick={() => setShowExerciseList(false)}
              className="text-subtle hover:text-fg transition-colors cursor-pointer"
            >
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
                  onClick={() => {
                    advanceTo(i, 0);
                    setPhase("warmup");
                    setShowExerciseList(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-colors cursor-pointer ${
                    isCurrent
                      ? "bg-primary/10 border border-primary/20"
                      : "bg-surface border border-border hover:bg-elevated"
                  }`}
                >
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-display text-xs font-bold shrink-0 ${
                    exDone
                      ? "bg-accent/20 text-accent"
                      : isCurrent
                      ? "bg-primary/20 text-primary"
                      : "bg-elevated text-muted"
                  }`}>
                    {exDone ? <CheckCircle2 size={14} /> : i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`font-display font-semibold truncate ${
                      isCurrent ? "text-fg" : exDone ? "text-muted" : "text-fg"
                    }`}>
                      {ex.name}
                    </p>
                    <p className="text-xs text-muted">
                      {ex.earlySetCount + ex.lastSetCount} sets · {ex.repRange[0]}–{ex.repRange[1]} reps
                    </p>
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
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
        <button
          onClick={() => setShowExerciseList(true)}
          className="text-subtle hover:text-fg transition-colors cursor-pointer"
        >
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
                  ? "bg-primary/50 w-4"
                  : "bg-border w-1.5"
              }`}
            />
          ))}
        </div>
        <button
          onClick={() => router.push("/")}
          className="text-subtle hover:text-fg transition-colors cursor-pointer"
        >
          <ArrowLeft size={20} />
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-5">
        {/* Exercise name */}
        <div className="space-y-1">
          <h2 className="font-display text-4xl font-bold text-fg leading-tight">{currentExercise.name}</h2>
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
          <p className="text-sm text-muted bg-surface border border-border rounded-xl px-4 py-3 leading-relaxed">
            {currentExercise.formNote}
          </p>
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

        {/* Sets progress */}
        <div className="space-y-2">
          <div className="flex gap-1.5">
            {Array.from({ length: totalSets }).map((_, i) => {
              const logged = setsForExercise[i];
              const isLast = i === totalSets - 1;
              return (
                <div
                  key={i}
                  className={`flex-1 h-10 rounded-lg flex items-center justify-center font-display font-bold text-sm transition-colors ${
                    logged
                      ? isLast
                        ? "bg-primary/15 text-primary border border-primary/30"
                        : "bg-accent/10 text-accent border border-accent/25"
                      : i === setIndex && phase === "sets"
                      ? isLast
                        ? "bg-primary/20 border border-primary text-primary"
                        : "bg-elevated border border-border text-fg"
                      : "bg-surface border border-border text-subtle"
                  }`}
                >
                  {logged ? logged.reps : isLast ? "●" : i + 1}
                </div>
              );
            })}
          </div>
          {sessionSets.filter((s) => s.setIndex >= 0).length > 0 && (
            <button
              onClick={handleGoBack}
              className="text-xs text-subtle hover:text-muted transition-colors cursor-pointer"
            >
              ← Undo last set
            </button>
          )}
        </div>

        {/* Phase content */}
        {phase === "warmup" && hasWarmup ? (
          <WarmupChecklist
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
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-bg text-muted text-sm">
        Loading...
      </div>
    }>
      <WorkoutContent />
    </Suspense>
  );
}
