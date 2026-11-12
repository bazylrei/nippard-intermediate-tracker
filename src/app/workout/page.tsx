"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase";
import {
  updateSessionProgress,
  completeSession,
  logSet,
  getSessionSets,
  deleteWorkoutSession,
  updateSetLog,
  saveExerciseNote,
} from "@/lib/db";
import { useProgramContext } from "@/context/ProgramContext";
import type { WorkoutSession, SetLog, UserPreferences, Exercise } from "@/lib/types";
import { cacheGet, cacheSet } from "@/lib/cache";
import {
  resolveExercises, totalSetsForExercise, loggedWorkingSets, isExerciseComplete, writeBanner, clearBanner,
} from "@/lib/workout-helpers";
import { bootstrapWorkout, type WorkoutPhase } from "@/lib/workout-init";
import FullScreenMessage from "@/components/workout/FullScreenMessage";
import { usePrevSets, usePostHistory } from "@/hooks/useWorkoutHistory";
import { useRestTimer } from "@/context/RestTimerContext";
import SetLogger from "@/components/SetLogger";
import WarmupChecklist from "@/components/WarmupChecklist";
import SetDetailSheet from "@/components/SetDetailSheet";
import ExerciseNotesSheet from "@/components/ExerciseNotesSheet";
import WorkoutDoneScreen from "@/components/workout/WorkoutDoneScreen";
import WorkoutOverview from "@/components/workout/WorkoutOverview";
import ExerciseListOverlay from "@/components/workout/ExerciseListOverlay";
import WorkoutHeader from "@/components/workout/WorkoutHeader";
import ExerciseInfo from "@/components/workout/ExerciseInfo";
import SetTiles from "@/components/workout/SetTiles";
import { ChevronRight } from "lucide-react";
import { Suspense } from "react";

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
  const [phase, setPhase] = useState<WorkoutPhase>("overview");
  const [sessionSets, setSessionSets] = useState<SetLog[]>([]);
  const { start: startRestTimer } = useRestTimer();
  const [useAlternate, setUseAlternate] = useState<Record<string, number>>(cachedPrefs?.alternateSelections ?? {});
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showExerciseList, setShowExerciseList] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [viewingSet, setViewingSet] = useState<SetLog | null>(null);
  const [showNotes, setShowNotes] = useState(false);

  const week = parseInt(searchParams.get("week") ?? "1");
  const dayIndex = parseInt(searchParams.get("day") ?? "0");
  const workoutDay = useMemo(() => getWorkoutDay(week, dayIndex), [week, dayIndex, getWorkoutDay]);

  const resolvedExercises = useMemo(
    () => resolveExercises(workoutDay?.exercises ?? [], useAlternate),
    [workoutDay, useAlternate],
  );

  const currentExercise: Exercise | undefined = resolvedExercises[exerciseIndex];

  const { prevSets, loadPrevSets } = usePrevSets(userId, currentExercise?.id);
  const postHistory = usePostHistory(done, userId, resolvedExercises);

  useEffect(() => {
    if (!programReady) return;

    async function init() {
      setDone(false);
      setLoading(true);
      setSessionSets([]);
      const boot = await bootstrapWorkout({ week, dayIndex, programId, workoutDay });
      if (!boot) { router.replace("/auth"); return; }
      setUserId(boot.userId);
      setPrefs(boot.prefs);
      setUseAlternate(boot.prefs.alternateSelections);
      setSession(boot.session);
      setSessionSets(boot.sessionSets);
      setExerciseIndex(boot.exerciseIndex);
      setSetIndex(boot.setIndex);
      setPhase(boot.phase);
      const targetEx = workoutDay?.exercises[boot.session.currentExerciseIndex ?? 0];
      if (targetEx) await loadPrevSets(boot.userId, targetEx.id);
      setLoading(false);
    }
    init();
  }, [week, dayIndex, router, workoutDay, loadPrevSets, programReady, programId]);

  async function advanceTo(exIdx: number, sIdx: number) {
    if (!session) return;
    setExerciseIndex(exIdx);
    setSetIndex(sIdx);
    await updateSessionProgress(session.id, exIdx, sIdx);
    writeBanner(exIdx, resolvedExercises, week, dayIndex, session.dayType);
  }

  function isExerciseDone(exIdx: number): boolean {
    const ex = resolvedExercises[exIdx];
    return !!ex && isExerciseComplete(ex, sessionSets);
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
      const allDone = resolvedExercises.every((ex) => isExerciseComplete(ex, updated));
      if (allDone) {
        await completeSession(session.id);
        clearBanner();
        setDone(true);
      } else {
        const nextIdx = resolvedExercises.findIndex((ex, i) => i !== exerciseIndex && !isExerciseComplete(ex, updated));
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
    if (session) setSessionSets(await getSessionSets(session.id));
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
      await createClient().from("user_preferences").upsert(
        { user_id: userId, alternate_selections: next },
        { onConflict: "user_id" }
      );
    }
  }

  if (loading) return <FullScreenMessage message="Loading workout…" />;
  if (!workoutDay || !currentExercise) return <FullScreenMessage message="Invalid workout." />;

  // ── Done screen ──────────────────────────────────────────────────────────
  if (done) {
    return (
      <WorkoutDoneScreen
        week={week}
        dayType={workoutDay.dayType}
        exercises={resolvedExercises}
        sessionSets={sessionSets}
        postHistory={postHistory}
        unit={prefs.unit}
        onHome={() => router.push("/")}
        onProgress={() => router.push("/progress")}
      />
    );
  }

  // ── Overview screen ──────────────────────────────────────────────────────
  if (phase === "overview") {
    return (
      <WorkoutOverview
        week={week}
        dayType={workoutDay.dayType}
        exercises={resolvedExercises}
        onBack={() => router.push("/")}
        onBegin={() => setPhase("warmup")}
      />
    );
  }

  // ── Active workout ───────────────────────────────────────────────────────
  const totalSets = totalSetsForExercise(currentExercise);
  const isLastSet = setIndex === totalSets - 1;
  const currentWarmupSteps = warmupSteps[currentExercise.warmupProtocol] ?? [];
  const hasWarmup = currentWarmupSteps.length > 0;
  const setsForExercise = loggedWorkingSets(sessionSets, currentExercise.id);

  return (
    <div className="h-dvh flex flex-col max-w-lg mx-auto relative">
      {/* Exercise list overlay */}
      {showExerciseList && (
        <ExerciseListOverlay
          exercises={resolvedExercises}
          currentIndex={exerciseIndex}
          isDone={isExerciseDone}
          onSelect={async (i) => { await advanceTo(i, -1); setPhase("warmup"); setShowExerciseList(false); }}
          onClose={() => setShowExerciseList(false)}
        />
      )}

      {/* Header */}
      <WorkoutHeader
        week={week}
        dayType={workoutDay.dayType}
        exerciseIndex={exerciseIndex}
        exerciseCount={resolvedExercises.length}
        isDone={isExerciseDone}
        confirmDiscard={confirmDiscard}
        onOpenList={() => setShowExerciseList(true)}
        onAskDiscard={() => setConfirmDiscard(true)}
        onCancelDiscard={() => setConfirmDiscard(false)}
        onDiscard={async () => {
          if (session) await deleteWorkoutSession(session.id);
          clearBanner();
          router.push("/");
        }}
        onHome={() => router.push("/")}
      />

      <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-5">
        <ExerciseInfo
          exercise={currentExercise}
          originalExercise={workoutDay.exercises[exerciseIndex]}
          alternateIndex={useAlternate[currentExercise.id] ?? 0}
          note={prefs.exerciseNotes?.[currentExercise.id]}
          onSwap={() => toggleAlternate(currentExercise.id)}
          onOpenNotes={() => setShowNotes(true)}
        />

        <SetTiles
          totalSets={totalSets}
          loggedSets={setsForExercise}
          currentSetIndex={setIndex}
          isSetsPhase={phase === "sets"}
          onViewSet={setViewingSet}
        />

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

      {showNotes && (
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
