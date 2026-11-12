"use client";

import { useRouter } from "next/navigation";
import { useProgramContext } from "@/context/ProgramContext";
import { useHomeFeed } from "@/hooks/useHomeFeed";
import FullScreenMessage from "@/components/workout/FullScreenMessage";
import NextWorkoutCard from "@/components/home/NextWorkoutCard";
import CompletedWorkoutCell from "@/components/workouts/CompletedWorkoutCell";
import { getSessionNumber } from "@/lib/program-data";

export default function Home() {
  const router = useRouter();
  const { program } = useProgramContext();
  const { feed, failed } = useHomeFeed();

  if (failed) return <FullScreenMessage message="Couldn't load your activity. Check your connection and try again." />;
  if (!feed) return <FullScreenMessage message="Loading…" />;

  const { nextSession, hasResume, items } = feed;
  const nextDay = nextSession && program.find((w) => w.week === nextSession.week)?.days[nextSession.dayIndex];

  return (
    <div className="min-h-screen max-w-lg md:max-w-2xl mx-auto flex flex-col p-4 md:p-8 gap-4">
      <h1 className="font-display font-bold text-xl text-fg pt-2">Home</h1>

      {nextSession && nextDay && (
        <NextWorkoutCard
          week={nextSession.week}
          totalWeeks={program.length}
          sessionNumber={getSessionNumber(nextSession, program)}
          day={nextDay}
          isResume={hasResume}
          onStart={() => router.push(`/workout?week=${nextSession.week}&day=${nextSession.dayIndex}`)}
        />
      )}

      <h3 className="font-display font-bold text-xs uppercase tracking-widest text-muted px-1 pt-2">
        Recent activity
      </h3>
      {items.length === 0 ? (
        <p className="text-sm text-muted px-1">No workouts yet — your completed sessions will show up here.</p>
      ) : (
        <div className="space-y-2.5">
          {items.map((item) => <CompletedWorkoutCell key={item.session.id} item={item} />)}
        </div>
      )}
    </div>
  );
}
