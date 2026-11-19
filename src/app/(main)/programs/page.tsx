"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { requireSignedInUser } from "@/lib/require-user";
import { createProgram, getPrograms, type NewProgramFields } from "@/lib/db";
import { canEditProgram } from "@/lib/program-access";
import { editProgramHref } from "@/lib/program-routes";
import type { ProgramRow } from "@/lib/types";
import NewProgramSheet from "@/components/programs/NewProgramSheet";
import OverlayPresence from "@/components/widgets/OverlayPresence";
import ProgramGroup from "@/components/programs/ProgramGroup";
import ProgramsPageHeader from "@/components/programs/ProgramsPageHeader";

export default function ProgramsPage() {
  const router = useRouter();
  const [programs, setPrograms] = useState<ProgramRow[] | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [naming, setNaming] = useState(false);

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
          <NewProgramSheet onCreate={(id, fields) => handleCreate(userId, id, fields)} onClose={() => setNaming(false)} />
        )}
      </OverlayPresence>

      {mine.length > 0 && <ProgramGroup title="Created by me" programs={mine} />}
      {available.length > 0 && <ProgramGroup title="Available to me" programs={available} />}
    </div>
  );
}
