"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { requireSignedInUser } from "@/lib/require-user";
import { getBuilderProgram } from "@/lib/db";
import { canEditProgram } from "@/lib/program-access";
import { lastWeek } from "@/lib/program-structure";
import type { BuilderProgram } from "@/lib/types";
import ProgramSummary from "@/components/programs/ProgramSummary";
import DayPreviewCard from "@/components/programs/DayPreviewCard";
import FullScreenMessage from "@/components/FullScreenMessage";
import { ChevronLeft, ChevronRight } from "lucide-react";

type Loaded = { program: BuilderProgram | null; userId: string };

export default function ProgramPreviewPage() {
  const { programId } = useParams<{ programId: string }>();
  const router = useRouter();
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [week, setWeek] = useState(1);

  useEffect(() => {
    async function load() {
      const user = await requireSignedInUser(router);
      if (!user) return;
      try {
        setLoaded({ program: await getBuilderProgram(programId), userId: user.id });
      } catch (error) {
        console.error(error);
        setLoadFailed(true);
      }
    }
    void load();
  }, [programId, router]);

  if (loadFailed) return <FullScreenMessage message="Couldn't load this program. Check your connection and try again." />;
  if (!loaded) return <FullScreenMessage message="Loading…" />;
  const { program, userId } = loaded;
  if (!program) return <FullScreenMessage message="Program not found." />;

  const finalWeek = lastWeek(program);
  const shownWeek = Math.min(Math.max(week, 1), Math.max(finalWeek, 1));
  const days = program.days.filter((d) => d.week === shownWeek).sort((a, b) => a.dayIndex - b.dayIndex);

  return (
    <div className="min-h-screen max-w-lg md:max-w-2xl mx-auto flex flex-col p-4 md:p-8 gap-4 pb-16">
      <ProgramSummary program={program} canEdit={canEditProgram(program, userId)} />

      {finalWeek === 0 ? (
        <p className="text-center py-12 text-sm text-subtle">This program has no workouts yet.</p>
      ) : (
        <>
          <div className="flex items-center justify-between px-1">
            <button
              onClick={() => setWeek(shownWeek - 1)}
              disabled={shownWeek <= 1}
              aria-label="Previous week"
              className="p-1 text-muted hover:text-fg disabled:opacity-30 disabled:cursor-default cursor-pointer"
            >
              <ChevronLeft size={18} />
            </button>
            <h2 className="font-display font-bold text-xs uppercase tracking-widest text-muted">
              Week {shownWeek} of {finalWeek}
            </h2>
            <button
              onClick={() => setWeek(shownWeek + 1)}
              disabled={shownWeek >= finalWeek}
              aria-label="Next week"
              className="p-1 text-muted hover:text-fg disabled:opacity-30 disabled:cursor-default cursor-pointer"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          {days.length === 0 ? (
            <p className="text-center py-8 text-sm text-subtle">No workouts in this week.</p>
          ) : (
            <div className="space-y-3">
              {days.map((day) => <DayPreviewCard key={day.pdId} day={day} />)}
            </div>
          )}
        </>
      )}
    </div>
  );
}
