"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ACTIVE_PROGRAM_NAME } from "@/lib/program-db";
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
import { ChevronLeft, ChevronRight, Dumbbell } from "lucide-react";
import BackToProfile from "@/components/widgets/BackToProfile";

const samePosition = (a: WorkoutPosition | null | undefined, b: WorkoutPosition) =>
  !!a && a.week === b.week && a.dayIndex === b.dayIndex;

export default function MyProgram() {
  const router = useRouter();
  const { program } = useProgramContext();
  const { overview, failed } = useProgramOverview();
  /** The week being browsed; until one is picked, the next workout's week. */
  const [pickedWeek, setPickedWeek] = useState<number | null>(null);
  const [choosing, setChoosing] = useState<WorkoutPosition | null>(null);

  if (failed) return <FullScreenMessage message="Couldn't load your program. Check your connection and try again." />;
  if (!overview) return <FullScreenMessage message="Loading…" />;

  // Derived from the program's real schedule — it can have any number of weeks and days, done in any order.
  const { unfinished, completed } = overview;
  const run = programRun(completed, program);
  const nextSession = unfinished?.position ?? run.next;
  const sessionAt = latestSessionBySlot(completed);
  const totalWeeks = program.length;
  const dayAt = (p: WorkoutPosition) => program.find((w) => w.week === p.week)?.days[p.dayIndex];
  const nextDay = nextSession ? dayAt(nextSession) : null;
  const totalSessions = getTotalSessions(program);
  const progressPct = totalSessions ? Math.round((run.doneCount / totalSessions) * 100) : 0;

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

      {/* Header */}
      <div className="flex items-center gap-2 pt-2">
        <BackToProfile />
        <div className="w-9 h-9 glass gloss rounded-xl flex items-center justify-center">
          <Dumbbell className="text-primary" size={20} />
        </div>
        <h1 className="font-display font-bold text-base tracking-wide text-fg leading-tight">{ACTIVE_PROGRAM_NAME}</h1>
      </div>

      {/* Program progress */}
      <div className="glass gloss rounded-2xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <span className="font-display font-semibold text-xs uppercase tracking-widest text-muted">Program Progress</span>
          <span className="font-display font-bold text-sm text-fg">
            {run.doneCount}<span className="text-muted font-normal"> / {totalSessions}</span>
          </span>
        </div>
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "color-mix(in srgb, var(--fg) 10%, transparent)" }}>
          <div
            className="h-full bg-primary rounded-full transition-all duration-500"
            style={{ width: `${progressPct}%`, boxShadow: "0 0 8px var(--primary)" }}
          />
        </div>
        <div className="flex justify-between text-xs text-subtle">
          <span>Week {weekNumbers[0] ?? 1}</span>
          <span className="text-muted font-display font-semibold">{progressPct}% complete</span>
          <span>Week {weekNumbers.at(-1) ?? totalWeeks}</span>
        </div>
      </div>

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
        <div className="flex items-center justify-between px-1">
          <button
            onClick={() => setPickedWeek(weekNumbers[weekPos - 1])}
            disabled={weekPos <= 0}
            aria-label="Previous week"
            className="p-1 text-muted hover:text-fg disabled:opacity-30 disabled:cursor-default cursor-pointer"
          >
            <ChevronLeft size={18} />
          </button>
          <h3 className="font-display font-bold text-xs uppercase tracking-widest text-muted">
            Week {shownWeek} Overview
          </h3>
          <button
            onClick={() => setPickedWeek(weekNumbers[weekPos + 1])}
            disabled={weekPos < 0 || weekPos >= weekNumbers.length - 1}
            aria-label="Next week"
            className="p-1 text-muted hover:text-fg disabled:opacity-30 disabled:cursor-default cursor-pointer"
          >
            <ChevronRight size={18} />
          </button>
        </div>
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
