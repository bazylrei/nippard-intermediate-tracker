"use client";

import type { Exercise, SetLog } from "@/lib/types";
import { totalSetsForExercise } from "@/lib/workout-helpers";
import SetLogger from "@/components/SetLogger";
import SetCarousel from "./SetCarousel";
import { LoggedSetCard, UpcomingSetCard } from "./SetCards";

interface Props {
  exercise: Exercise;
  currentSetIndex: number;
  loggedSets: SetLog[];
  previousSets: SetLog[];
  unit: "kg" | "lbs";
  onLog: (weight: number, reps: number, rpe: number | null, failureHit: boolean | null) => void;
  onView: (set: SetLog) => void;
}

/** An exercise's working sets as carousel slides: logged sets, the set being logged now, and those still to come. */
export default function ExerciseSetCarousel({ exercise, currentSetIndex, loggedSets, previousSets, unit, onLog, onView }: Props) {
  const totalSets = totalSetsForExercise(exercise);

  function renderSlide(index: number) {
    const logged = loggedSets[index];
    if (logged) {
      return (
        <LoggedSetCard
          set={logged}
          setNumber={index + 1}
          unit={unit}
          weightPerSide={exercise.weightPerSide}
          onView={() => onView(logged)}
        />
      );
    }
    const isLastSet = index === totalSets - 1;
    if (index === currentSetIndex) {
      return (
        <SetLogger
          exercise={exercise}
          setIndex={index}
          isLastSet={isLastSet}
          previousSets={previousSets}
          unit={unit}
          onLog={onLog}
        />
      );
    }
    return (
      <UpcomingSetCard
        setNumber={index + 1}
        repRange={exercise.repRange}
        targetRpe={isLastSet ? exercise.lastSetRpe : exercise.earlySetRpe}
      />
    );
  }

  return (
    <SetCarousel
      count={totalSets}
      activeIndex={currentSetIndex}
      slideLabel={(i) => `Set ${i + 1} of ${totalSets}`}
      renderSlide={renderSlide}
    />
  );
}
