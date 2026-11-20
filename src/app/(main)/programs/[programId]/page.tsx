"use client";

import { Suspense, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { requireSignedInUser } from "@/lib/require-user";
import { getBuilderProgram } from "@/lib/db";
import { canEditProgram } from "@/lib/program-access";
import { lastWeek } from "@/lib/program-structure";
import type { BuilderProgram } from "@/lib/types";
import ProgramSummary from "@/components/programs/ProgramSummary";
import DayPreviewCard from "@/components/programs/DayPreviewCard";
import FullScreenMessage from "@/components/widgets/FullScreenMessage";
import WeekSwitcher from "@/components/widgets/WeekSwitcher";
import SaveErrorAlert from "@/components/widgets/SaveErrorAlert";
import FollowProgramControl from "@/components/programs/FollowProgramControl";
import { useProgramContext } from "@/context/ProgramContext";
import { useSaveError } from "@/hooks/useSaveError";

type Loaded = { program: BuilderProgram | null; userId: string };

/** useParams needs a Suspense boundary to prerender. */
export default function ProgramPreviewPage() {
  return (
    <Suspense fallback={<FullScreenMessage message="Loading…" />}>
      <ProgramPreview />
    </Suspense>
  );
}

function ProgramPreview() {
  const { programId } = useParams<{ programId: string }>();
  const router = useRouter();
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [week, setWeek] = useState(1);
  const { programId: followedId, followProgram } = useProgramContext();
  const saveError = useSaveError();

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
  /** Follows this program and opens it on My program, ready for its next workout. */
  async function follow() {
    if (await saveError.attempt(() => followProgram(programId), "Couldn't switch programs. Try again.")) router.push("/program");
  }

  async function stopFollowing() {
    await saveError.attempt(() => followProgram(null), "Couldn't stop following. Try again.");
  }

  const days = program.days.filter((d) => d.week === shownWeek).sort((a, b) => a.dayIndex - b.dayIndex);

  return (
    <div className="main-min-viewport max-w-lg md:max-w-2xl mx-auto flex flex-col p-4 md:p-8 gap-4 pb-16">
      <ProgramSummary program={program} canEdit={canEditProgram(program, userId)} />

      {saveError.message && <SaveErrorAlert message={saveError.message} onDismiss={saveError.clear} />}
      {finalWeek > 0 && (
        <FollowProgramControl isCurrent={followedId === programId} onFollow={follow} onStopFollowing={stopFollowing} />
      )}

      {finalWeek === 0 ? (
        <p className="text-center py-12 text-sm text-subtle">This program has no workouts yet.</p>
      ) : (
        <>
          <WeekSwitcher
            label={`Week ${shownWeek} of ${finalWeek}`}
            canGoBack={shownWeek > 1}
            canGoForward={shownWeek < finalWeek}
            onBack={() => setWeek(shownWeek - 1)}
            onForward={() => setWeek(shownWeek + 1)}
          />

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
