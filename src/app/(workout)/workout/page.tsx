"use client";

import { Suspense, useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { deleteWorkoutSession } from "@/lib/db";
import { useProgramContext } from "@/context/ProgramContext";
import type { WorkoutSession, SetLog, ExerciseRecord } from "@/lib/types";
import { resolveExercises, loggedWorkingSets, clearWorkoutInProgress, recordFor } from "@/lib/workout-helpers";
import { bootstrapWorkout } from "@/lib/workout-init";
import FullScreenMessage from "@/components/FullScreenMessage";
import { usePostHistory } from "@/hooks/useWorkoutHistory";
import { useWorkoutPrefs } from "@/hooks/useWorkoutPrefs";
import { useWorkoutProgress, START } from "@/hooks/useWorkoutProgress";
import { useExerciseTransition } from "@/hooks/useExerciseTransition";
import { useSaveError } from "@/hooks/useSaveError";
import SaveErrorAlert from "@/components/SaveErrorAlert";
import { useRestTimer } from "@/context/RestTimerContext";
import WarmupSlide from "@/components/workout/WarmupSlide";
import SetDetailSheet from "@/components/SetDetailSheet";
import ExerciseNotesSheet from "@/components/ExerciseNotesSheet";
import ExerciseSwapSheet from "@/components/workout/ExerciseSwapSheet";
import { useExerciseSwap } from "@/hooks/useExerciseSwap";
import WorkoutDoneScreen from "@/components/workout/WorkoutDoneScreen";
import WorkoutOverview from "@/components/workout/WorkoutOverview";
import ExerciseListOverlay from "@/components/workout/ExerciseListOverlay";
import WorkoutHeader from "@/components/workout/WorkoutHeader";
import ExerciseInfo from "@/components/workout/ExerciseInfo";
import FinishedExerciseNotice from "@/components/workout/FinishedExerciseNotice";
import ExerciseSetCarousel from "@/components/workout/ExerciseSetCarousel";
import SkipExerciseButton from "@/components/workout/SkipExerciseButton";
import { useWorkoutRoute } from "@/hooks/useWorkoutRoute";
import { SIGN_IN_PATH } from "@/lib/require-user";

function WorkoutContent() {
  const router = useRouter();
  const { week, dayIndex, workoutDay } = useWorkoutRoute();
  const { warmupSteps, programId, ready: programReady, failed: programFailed } = useProgramContext();
  const [userId, setUserId] = useState<string | null>(null);
  const [session, setSession] = useState<WorkoutSession | null>(null);
  const { prefs, setPrefs, setDefaultAlternate, saveNote } = useWorkoutPrefs(userId);
  const { choices, swapSheet, openSwap } = useExerciseSwap({ session, setSession, defaults: prefs.alternateSelections, setDefaultAlternate });
  const { start: startRestTimer } = useRestTimer();
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [showExerciseList, setShowExerciseList] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [viewingSet, setViewingSet] = useState<SetLog | null>(null);
  const [showNotes, setShowNotes] = useState(false);
  const [recordsByExercise, setRecordsByExercise] = useState<Record<string, ExerciseRecord>>({});
  const saveError = useSaveError();

  const resolvedExercises = useMemo(
    () => resolveExercises(workoutDay?.exercises ?? [], choices),
    [workoutDay, choices],
  );
  const progress = useWorkoutProgress({ session, userId, exercises: resolvedExercises, saveError, onRest: startRestTimer });
  const { exerciseIndex, phase, sessionSets, done, currentExercise, workingSetIndex, restore } = progress;
  const transition = useExerciseTransition(exerciseIndex, resolvedExercises, progress.isExerciseDone);

  const record = recordFor(recordsByExercise, currentExercise);
  const postWorkout = usePostHistory(done, userId, resolvedExercises);

  useEffect(() => {
    if (!programReady) return;

    async function init() {
      setLoadFailed(false);
      restore(START);
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
      restore(boot);
      setRecordsByExercise(boot.recordsByExercise);
      setLoading(false);
    }
    init();
  }, [week, dayIndex, router, workoutDay, programReady, programId, setPrefs, restore]);

  async function handleDiscard() {
    if (session && !(await saveError.attempt(() => deleteWorkoutSession(session.id), "Couldn't discard the workout. Try again."))) {
      setConfirmDiscard(false);
      return;
    }
    clearWorkoutInProgress();
    router.push("/");
  }

  async function handleEditSet(setId: string, weightKg: number, reps: number, rpe: number | null) {
    await progress.editSet(setId, weightKg, reps, rpe);
    setViewingSet((prev) => prev ? { ...prev, weight: weightKg, reps, rpe } : null);
  }

  if (programFailed) return <FullScreenMessage message="Couldn't load your program. Check your connection and try again." />;
  if (loadFailed) return <FullScreenMessage message="Couldn't start the workout. Check your connection and try again." />;
  if (loading) return <FullScreenMessage message="Loading workout…" />;
  if (!workoutDay || !currentExercise || !session) return <FullScreenMessage message="Invalid workout." />;

  // ── Done screen ──────────────────────────────────────────────────────────
  if (done) {
    return (
      <WorkoutDoneScreen
        week={week}
        dayType={workoutDay.dayType}
        exercises={resolvedExercises}
        sessionSets={sessionSets}
        postWorkout={postWorkout}
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
        onBegin={progress.begin}
      />
    );
  }

  // ── Active workout ───────────────────────────────────────────────────────
  const currentWarmupSteps = warmupSteps[currentExercise.warmupProtocol] ?? [];
  const hasWarmup = currentWarmupSteps.length > 0;
  const warmingUp = phase === "warmup" && hasWarmup;
  const setsForExercise = loggedWorkingSets(sessionSets, currentExercise.id);

  return (
    <div className="h-full flex flex-col max-w-lg mx-auto relative">
      {/* Exercise list overlay */}
      {showExerciseList && (
        <ExerciseListOverlay
          exercises={resolvedExercises}
          currentIndex={exerciseIndex}
          isDone={progress.isExerciseDone}
          onSelect={(i) => { progress.goToExercise(i); setShowExerciseList(false); }}
          onClose={() => setShowExerciseList(false)}
        />
      )}

      {/* Header */}
      <WorkoutHeader
        week={week}
        dayType={workoutDay.dayType}
        startedAt={session.startedAt}
        exerciseIndex={exerciseIndex}
        exerciseCount={resolvedExercises.length}
        isDone={progress.isExerciseDone}
        confirmDiscard={confirmDiscard}
        onOpenList={() => setShowExerciseList(true)}
        onAskDiscard={() => setConfirmDiscard(true)}
        onCancelDiscard={() => setConfirmDiscard(false)}
        onDiscard={handleDiscard}
      />

      <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-5">
        {saveError.message && <SaveErrorAlert message={saveError.message} onDismiss={saveError.clear} />}

        {/* Keyed by position so moving to another exercise replays the slide-in. */}
        <section
          key={exerciseIndex}
          aria-label={currentExercise.name}
          className={`space-y-5 ${transition.direction ? `exercise-enter-${transition.direction}` : ""}`}
        >
          {transition.finished && <FinishedExerciseNotice name={transition.finished.name} />}

          <ExerciseInfo
            exercise={currentExercise}
            originalExercise={workoutDay.exercises[exerciseIndex]}
            canSwap={setsForExercise.length === 0}
            note={prefs.exerciseNotes?.[currentExercise.id]}
            onOpenSwap={() => openSwap(workoutDay.exercises[exerciseIndex])}
            onOpenNotes={() => setShowNotes(true)}
          />

          <ExerciseSetCarousel
            key={currentExercise.id}
            exercise={currentExercise}
            currentSetIndex={warmingUp ? null : workingSetIndex}
            warmup={hasWarmup ? (
              <WarmupSlide
                steps={currentWarmupSteps}
                active={warmingUp}
                onComplete={progress.completeWarmup}
                prevWorkingWeightKg={record.lastSets.at(-1)?.weight}
                unit={prefs.unit}
              />
            ) : undefined}
            loggedSets={setsForExercise}
            record={record}
            unit={prefs.unit}
            onLog={progress.logSet}
            onView={setViewingSet}
          />
        </section>

        <SkipExerciseButton onSkip={progress.skipExercise} />
      </div>

      {swapSheet && <ExerciseSwapSheet {...swapSheet} />}

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
