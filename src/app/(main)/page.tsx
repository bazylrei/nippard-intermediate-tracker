"use client";

import { useRouter } from "next/navigation";
import { useProgramContext } from "@/context/ProgramContext";
import { useHomeFeed } from "@/hooks/useHomeFeed";
import NextWorkoutCard from "@/components/home/NextWorkoutCard";
import WorkoutFeedCard from "@/components/home/WorkoutFeedCard";

export default function Home() {
  const router = useRouter();
  const { program } = useProgramContext();
  const { feed } = useHomeFeed();

  if (!feed) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted text-sm font-display">
        Loading…
      </div>
    );
  }

  const { nextSession, hasResume, items } = feed;
  const nextDay = program.find((w) => w.week === nextSession.week)?.days[nextSession.dayIndex];

  return (
    <div className="min-h-screen max-w-lg md:max-w-2xl mx-auto flex flex-col p-4 md:p-8 gap-4">
      <h1 className="font-display font-bold text-xl text-fg pt-2">Home</h1>

      {nextDay && (
        <NextWorkoutCard
          week={nextSession.week}
          dayIndex={nextSession.dayIndex}
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
          {items.map((item) => <WorkoutFeedCard key={item.session.id} item={item} />)}
        </div>
      )}
    </div>
  );
}
