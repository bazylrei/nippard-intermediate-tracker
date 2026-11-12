"use client";

import { Suspense, useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { updateSessionProgress, completeSession, logSetAndAdvance, deleteWorkoutSession, updateSetLog } from "@/lib/db";
import { useProgramContext } from "@/context/ProgramContext";
import type { WorkoutSession, SetLog, Exercise } from "@/lib/types";
import {
  resolveExercises, totalSetsForExercise, loggedWorkingSets, isExerciseComplete, writeBanner, clearBanner,
  planAfterSet,
} from "@/lib/workout-helpers";
import { bootstrapWorkout, type WorkoutPhase } from "@/lib/workout-init";
import FullScreenMessage from "@/components/FullScreenMessage";
import { usePostHistory } from "@/hooks/useWorkoutHistory";
import { useWorkoutPrefs } from "@/hooks/useWorkoutPrefs";
import { useSaveError } from "@/hooks/useSaveError";
import SaveErrorAlert from "@/components/SaveErrorAlert";
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
import SkipExerciseButton from "@/components/workout/SkipExerciseButton";
import { useWorkoutRoute } from "@/hooks/useWorkoutRoute";
import { SIGN_IN_PATH } from "@/lib/require-user";

const PROGRESS_SAVE_FAILED = "Couldn't save your place in the workout. It will be saved with your next set.";

function WorkoutContent() {
  const router = useRouter();
  const { week, dayIndex, workoutDay } = useWorkoutRoute();
  const { warmupSteps, programId, ready: programReady, failed: programFailed } = useProgramContext();
  const [userId, setUserId] = useState<string | null>(null);
  const [session, setSession] = useState<WorkoutSession | null>(null);
  const { prefs, setPrefs, toggleAlternate, saveNote } = useWorkoutPrefs(userId);
  const useAlternate = prefs.alternateSelections;
  const [exerciseIndex, setExerciseIndex] = useState(0);
  const [setIndex, setSetIndex] = useState(0);
  const [phase, setPhase] = useState<WorkoutPhase>("overview");
  const [sessionSets, setSessionSets] = useState<SetLog[]>([]);
  const { start: startRestTimer } = useRestTimer();
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [showExerciseList, setShowExerciseList] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [viewingSet, setViewingSet] = useState<SetLog | null>(null);
  const [showNotes, setShowNotes] = useState(false);
  const [prevSetsByExercise, setPrevSetsByExercise] = useState<Record<string, SetLog[]>>({});
  const saveError = useSaveError();


  const resolvedExercises = useMemo(
    () => resolveExercises(workoutDay?.exercises ?? [], useAlternate),
    [workoutDay, useAlternate],
  );

  const currentExercise: Exercise | undefined = resolvedExercises[exerciseIndex];

  const prevSets = (currentExercise && prevSetsByExercise[currentExercise.id]) || [];
  const postHistory = usePostHistory(done, userId, resolvedExercises);

  useEffect(() => {
    if (!programReady) return;

    async function init() {
      setDone(false);
      setLoadFailed(false);
      setSessionSets([]);
      // Never create a session for a day that doesn't exist — the page shows "Invalid workout".
      if (!workoutDay) { setLoading(false); return; }
      setLoading(true);
      let boot;
      try {
        boot = await bootstrapWorkout({ week, dayIndex, programId, workoutDay });
      } catch (error) {
        console.error(error);
        setLoadFailed(true);
        setLoading(false);
        return;
      }
      if (!boot) { router.replace(SIGN_IN_PATH); return; }
      setUserId(boot.userId);
      setPrefs(boot.prefs);
      setSession(boot.session);
      setSessionSets(boot.sessionSets);
      setExerciseIndex(boot.exerciseIndex);
      setSetIndex(boot.setIndex);
      setPhase(boot.phase);
      setPrevSetsByExercise(boot.prevSetsByExercise);
      setLoading(false);
    }
    init();
  }, [week, dayIndex, router, workoutDay, programReady, programId, setPrefs]);

  /** Navigation is instant; if saving the resume point fails, the next logged set saves it anyway. */
  function saveProgress(exIdx: number, sIdx: number) {
    if (!session) return;
    void saveError.attempt(() => updateSessionProgress(session.id, exIdx, sIdx), PROGRESS_SAVE_FAILED);
  }

  function advanceTo(exIdx: number, sIdx: number) {
    if (!session) return;
    setExerciseIndex(exIdx);
    setSetIndex(sIdx);
    writeBanner(exIdx, resolvedExercises, week, dayIndex, session.dayType);
    saveProgress(exIdx, sIdx);
  }

  async function handleSkipExercise() {
    if (exerciseIndex + 1 < resolvedExercises.length) {
      advanceTo(exerciseIndex + 1, 0);
      setPhase("warmup");
      return;
    }
    if (session && !(await saveError.attempt(() => completeSession(session.id), "Couldn't finish the workout. Try again."))) return;
    clearBanner();
    setDone(true);
  }

  async function handleDiscard() {
    if (session && !(await saveError.attempt(() => deleteWorkoutSession(session.id), "Couldn't discard the workout. Try again."))) {
      setConfirmDiscard(false);
      return;
    }
    clearBanner();
    router.push("/");
  }

  function isExerciseDone(exIdx: number): boolean {
    const ex = resolvedExercises[exIdx];
    return !!ex && isExerciseComplete(ex, sessionSets);
  }

  /**
   * Optimistic: the UI advances and the rest timer starts immediately; the set
   * and the new session position are saved in one atomic call. On failure the
   * UI rolls back so what's on screen never claims a set that wasn't saved.
   */
  async function handleSetLogged(weight: number, reps: number, rpe: number | null, failureHit: boolean | null) {
    if (!session || !currentExercise || !userId) return;
    const isLastSet = setIndex === totalSetsForExercise(currentExercise) - 1;
    const newSet: SetLog = {
      id: crypto.randomUUID(), sessionId: session.id, userId, exerciseId: currentExercise.id,
      setIndex, isLastSet, weight, reps, rpe, failureHit, loggedAt: new Date().toISOString(),
    };
    const updated = [...sessionSets, newSet];
    const step = planAfterSet(resolvedExercises, updated, exerciseIndex, setIndex);
    const previous = { sessionSets, exerciseIndex, setIndex, phase };

    saveError.clear();
    setSessionSets(updated);
    const [restMin, restMax] = currentExercise.restSeconds;
    startRestTimer(Math.round((restMin + restMax) / 2));
    if (step.kind === "complete") {
      clearBanner();
      setDone(true);
    } else {
      setExerciseIndex(step.exerciseIndex);
      setSetIndex(step.setIndex);
      if (step.kind === "nextExercise") setPhase("warmup");
      writeBanner(step.exerciseIndex, resolvedExercises, week, dayIndex, session.dayType);
    }

    try {
      await logSetAndAdvance({
        ...newSet,
        nextExerciseIndex: step.exerciseIndex,
        nextSetIndex: step.setIndex,
        completeSession: step.kind === "complete",
      });
    } catch (err) {
      setSessionSets(previous.sessionSets);
      setExerciseIndex(previous.exerciseIndex);
      setSetIndex(previous.setIndex);
      setPhase(previous.phase);
      setDone(false);
      writeBanner(previous.exerciseIndex, resolvedExercises, week, dayIndex, session.dayType);
      saveError.report("Couldn't save that set. Check your connection and log it again.", err);
    }
  }

  async function handleEditSet(setId: string, weightKg: number, reps: number, rpe: number | null) {
    await updateSetLog(setId, weightKg, reps, rpe);
    setSessionSets((prev) => prev.map((s) => s.id === setId ? { ...s, weight: weightKg, reps, rpe } : s));
    setViewingSet((prev) => prev ? { ...prev, weight: weightKg, reps, rpe } : null);
  }

  function handleWarmupComplete() {
    setSetIndex(0);
    setPhase("sets");
    saveProgress(exerciseIndex, 0);
  }

  if (programFailed) return <FullScreenMessage message="Couldn't load your program. Check your connection and try again." />;
  if (loadFailed) return <FullScreenMessage message="Couldn't start the workout. Check your connection and try again." />;
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
          onSelect={(i) => { advanceTo(i, -1); setPhase("warmup"); setShowExerciseList(false); }}
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
        onDiscard={handleDiscard}
        onHome={() => router.push("/")}
      />

      <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-5">
        {saveError.message && <SaveErrorAlert message={saveError.message} onDismiss={saveError.clear} />}

        <ExerciseInfo
          exercise={currentExercise}
          originalExercise={workoutDay.exercises[exerciseIndex]}
          alternateIndex={useAlternate[currentExercise.id] ?? 0}
          note={prefs.exerciseNotes?.[currentExercise.id]}
          onSwap={() => saveError.attempt(() => toggleAlternate(currentExercise.id), "Couldn't save the exercise swap.")}
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

        <SkipExerciseButton onSkip={handleSkipExercise} />
      </div>

      {showNotes && (
        <ExerciseNotesSheet
          exercise={currentExercise}
          existingNote={prefs.exerciseNotes?.[currentExercise.id] ?? ""}
          onClose={() => setShowNotes(false)}
          onSave={(note) => saveNote(currentExercise.id, note)}
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
    <Suspense fallback={<FullScreenMessage message="Loading…" />}>
      <WorkoutContent />
    </Suspense>
  );
}
