"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useProgramContext } from "@/context/ProgramContext";
import { useHomeFeed } from "@/hooks/useHomeFeed";
import FullScreenMessage from "@/components/widgets/FullScreenMessage";
import NextWorkoutCard from "@/components/widgets/NextWorkoutCard";
import { startWorkoutHref } from "@/lib/workout-history";
import CompletedWorkoutCell from "@/components/workouts/CompletedWorkoutCell";
import { getSessionNumber } from "@/lib/program-data";
import { useWeighIn } from "@/hooks/useWeighIn";
import WeighInCard from "@/components/widgets/WeighInCard";

export default function Home() {
  const router = useRouter();
  const { program } = useProgramContext();
  const { feed, failed } = useHomeFeed();
  const weighIn = useWeighIn();

  if (failed) return <FullScreenMessage message="Couldn't load your activity. Check your connection and try again." />;
  if (!feed) return <FullScreenMessage message="Loading…" />;

  const { nextSession, hasResume, items } = feed;
  const nextDay = nextSession && program.find((w) => w.week === nextSession.week)?.days[nextSession.dayIndex];

  return (
    <div className="main-min-viewport max-w-lg md:max-w-2xl mx-auto flex flex-col p-4 md:p-8 gap-4">
      <h1 className="font-display font-bold text-xl text-fg pt-2">Home</h1>

      {weighIn.due && <WeighInCard unit={weighIn.unit} onSave={weighIn.save} onDismiss={weighIn.skip} />}

      {nextSession && nextDay && (
        <NextWorkoutCard
          week={nextSession.week}
          totalWeeks={program.length}
          sessionNumber={getSessionNumber(nextSession, program)}
          day={nextDay}
          isResume={hasResume}
          onStart={() => router.push(startWorkoutHref(nextSession))}
        />
      )}
      {nextSession && nextDay && (
        <Link href="/program" className="-mt-2 text-center text-sm text-muted hover:text-fg py-1">
          Choose a different workout
        </Link>
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
