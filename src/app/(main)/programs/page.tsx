"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { requireSignedInUser } from "@/lib/require-user";
import { createProgram, getPrograms, type NewProgramFields } from "@/lib/db";
import { canEditProgram } from "@/lib/program-access";
import { editProgramHref, PROGRAMS_PATH } from "@/lib/program-routes";
import { useProgramContext } from "@/context/ProgramContext";
import type { ProgramRow } from "@/lib/types";
import NewProgramSheet from "@/components/programs/NewProgramSheet";
import OverlayPresence from "@/components/widgets/OverlayPresence";
import ProgramGroup from "@/components/programs/ProgramGroup";
import ProgramsPageHeader from "@/components/programs/ProgramsPageHeader";

/** useSearchParams needs a Suspense boundary to prerender. */
export default function ProgramsPage() {
  return (
    <Suspense>
      <Programs />
    </Suspense>
  );
}

function Programs() {
  const router = useRouter();
  const { programId: currentId } = useProgramContext();
  // NEW_PROGRAM_HREF (?new=1) arrives with the "New program" sheet open.
  const openedToCreate = useSearchParams().get("new") === "1";
  const [programs, setPrograms] = useState<ProgramRow[] | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [naming, setNaming] = useState(openedToCreate);

  useEffect(() => {
    async function load() {
      const user = await requireSignedInUser(router);
      if (!user) return;
      setUserId(user.id);
      try {
        setPrograms(await getPrograms(user.id));
      } catch (error) {
        console.error(error);
        setLoadFailed(true);
      }
    }
    void load();
  }, [router]);

  function closeNaming() {
    setNaming(false);
    if (openedToCreate) router.replace(PROGRAMS_PATH, { scroll: false });
  }

  /** Creates the program, then opens it in the editor to build. Rejects (the sheet stays open) if saving fails. */
  async function handleCreate(owner: string, id: string, fields: NewProgramFields) {
    await createProgram(owner, id, fields);
    router.push(editProgramHref(id));
  }

  // The rest are readable by the user but not theirs: public today, subscribed ones later.
  const mine = (programs ?? []).filter((p) => canEditProgram(p, userId));
  const available = (programs ?? []).filter((p) => !canEditProgram(p, userId));

  return (
    <div className="main-min-viewport max-w-lg md:max-w-2xl mx-auto flex flex-col p-4 md:p-8 gap-6">
      <ProgramsPageHeader canCreate={!!userId} onNew={() => setNaming(true)} />

      {loadFailed && (
        <p className="text-center py-16 text-sm text-subtle">Couldn&apos;t load programs. Check your connection and try again.</p>
      )}

      {!loadFailed && programs === null && (
        <div className="animate-pulse space-y-3" aria-label="Loading programs">
          {[1, 2, 3].map((i) => <div key={i} className="h-24 bg-elevated rounded-2xl" />)}
        </div>
      )}

      {programs && programs.length === 0 && (
        <p className="text-center py-16 text-sm text-subtle">No programs yet.</p>
      )}

      <OverlayPresence>
        {naming && userId && (
          <NewProgramSheet onCreate={(id, fields) => handleCreate(userId, id, fields)} onClose={closeNaming} />
        )}
      </OverlayPresence>

      {mine.length > 0 && <ProgramGroup title="Created by me" programs={mine} currentId={currentId} />}
      {available.length > 0 && <ProgramGroup title="Available to me" programs={available} currentId={currentId} />}
    </div>
  );
}
