"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getSessionNumber, getTotalSessions, programRun } from "@/lib/program-data";
import { useProgramContext } from "@/context/ProgramContext";
import { useProgramOverview } from "@/hooks/useProgramOverview";
import type { WorkoutPosition } from "@/lib/types";
import { latestSessionBySlot, startWorkoutHref, workoutDetailHref } from "@/lib/workout-history";
import { settleUnfinishedWorkout, type UnfinishedChoice } from "@/lib/unfinished-workout";
import { dayLabel } from "@/lib/day-types";
import NextWorkoutCard from "@/components/widgets/NextWorkoutCard";
import WeekDayTile, { type DayStatus } from "@/components/program/WeekDayTile";
import StartWorkoutSheet from "@/components/program/StartWorkoutSheet";
import OverlayPresence from "@/components/widgets/OverlayPresence";
import FullScreenMessage from "@/components/widgets/FullScreenMessage";
import WeekSwitcher from "@/components/widgets/WeekSwitcher";
import ProgramPageHeader from "@/components/program/ProgramPageHeader";
import ProgramProgressCard from "@/components/program/ProgramProgressCard";
import ChooseProgramCard from "@/components/widgets/ChooseProgramCard";

const samePosition = (a: WorkoutPosition | null | undefined, b: WorkoutPosition) =>
  !!a && a.week === b.week && a.dayIndex === b.dayIndex;

export default function MyProgram() {
  const router = useRouter();
  const { program, programId, programName, ready } = useProgramContext();
  const { overview, failed } = useProgramOverview();
  /** The week being browsed; until one is picked, the next workout's week. */
  const [pickedWeek, setPickedWeek] = useState<number | null>(null);
  const [choosing, setChoosing] = useState<WorkoutPosition | null>(null);

  if (failed) return <FullScreenMessage message="Couldn't load your program. Check your connection and try again." />;
  if (!overview) return <FullScreenMessage message="Loading…" />;
  if (ready && !programId) {
    return (
      <div className="main-min-viewport max-w-lg md:max-w-2xl mx-auto flex flex-col p-4 md:p-8 gap-4">
        <ProgramPageHeader name="My program" />
        <ChooseProgramCard />
      </div>
    );
  }

  // Derived from the program's real schedule — it can have any number of weeks and days, done in any order.
  const { unfinished, completed } = overview;
  const run = programRun(completed, program);
  const nextSession = unfinished?.position ?? run.next;
  const sessionAt = latestSessionBySlot(completed);
  const totalWeeks = program.length;
  const dayAt = (p: WorkoutPosition) => program.find((w) => w.week === p.week)?.days[p.dayIndex];
  const nextDay = nextSession ? dayAt(nextSession) : null;
  const totalSessions = getTotalSessions(program);

  const weekNumbers = program.map((w) => w.week).sort((a, b) => a - b);
  const shownWeek = pickedWeek ?? nextSession?.week ?? weekNumbers[0] ?? 1;
  const weekPos = weekNumbers.indexOf(shownWeek);
  const weekDays = program.find((w) => w.week === shownWeek)?.days ?? [];
  const choosingDay = choosing ? dayAt(choosing) : null;

  function statusOf(position: WorkoutPosition): DayStatus {
    if (samePosition(unfinished?.position, position)) return "in-progress";
    if (samePosition(nextSession, position)) return "next";
    return run.isDone(position) ? "done" : "todo";
  }

  async function start(position: WorkoutPosition, choice: UnfinishedChoice | null) {
    if (unfinished && choice) await settleUnfinishedWorkout(unfinished.sessionId, choice);
    router.push(startWorkoutHref(position));
  }

  return (
    <div className="main-min-viewport max-w-lg md:max-w-2xl mx-auto flex flex-col p-4 md:p-8 gap-4">

      <ProgramPageHeader name={programName ?? "My program"} />

      <ProgramProgressCard
        doneCount={run.doneCount}
        totalSessions={totalSessions}
        firstWeek={weekNumbers[0] ?? 1}
        lastWeek={weekNumbers.at(-1) ?? totalWeeks}
      />

      {nextSession && nextDay && (
        <NextWorkoutCard
          week={nextSession.week}
          totalWeeks={totalWeeks}
          sessionNumber={getSessionNumber(nextSession, program)}
          day={nextDay}
          isResume={!!unfinished}
          onStart={() => router.push(startWorkoutHref(nextSession))}
        />
      )}

      {/* Week overview — any day not done can be chosen */}
      <div className="space-y-3">
        <WeekSwitcher
          label={`Week ${shownWeek} Overview`}
          headingAs="h3"
          canGoBack={weekPos > 0}
          canGoForward={weekPos >= 0 && weekPos < weekNumbers.length - 1}
          onBack={() => setPickedWeek(weekNumbers[weekPos - 1])}
          onForward={() => setPickedWeek(weekNumbers[weekPos + 1])}
        />
        <div className="grid grid-cols-2 gap-2.5">
          {weekDays.map((day, i) => {
            if (!day) return null;
            const position = { week: shownWeek, dayIndex: i };
            const status = statusOf(position);
            const sessionId = status === "done" ? sessionAt(position) : undefined;
            return (
              <WeekDayTile
                key={i}
                day={day}
                number={i + 1}
                status={status}
                href={sessionId && workoutDetailHref(sessionId)}
                onSelect={status === "done" ? undefined
                  : status === "in-progress" ? () => router.push(startWorkoutHref(position))
                  : () => setChoosing(position)}
              />
            );
          })}
        </div>
      </div>

      <OverlayPresence>
        {choosing && choosingDay && (
          <StartWorkoutSheet
            week={choosing.week}
            day={choosingDay}
            unfinished={unfinished ? { label: dayLabel(unfinished.dayType), setCount: unfinished.setCount } : null}
            onStart={(choice) => start(choosing, choice)}
            onClose={() => setChoosing(null)}
          />
        )}
      </OverlayPresence>
    </div>
  );
}
