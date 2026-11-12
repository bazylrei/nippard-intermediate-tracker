"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { requireSignedInUser } from "@/lib/require-user";
import { getPrograms, toggleProgramPublic } from "@/lib/db";
import type { ProgramRow } from "@/lib/types";
import SaveErrorAlert from "@/components/SaveErrorAlert";
import { useSaveError } from "@/hooks/useSaveError";
import { Globe, Lock, Users, ChevronRight, Wrench } from "lucide-react";

export default function BuilderPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [programs, setPrograms] = useState<ProgramRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const saveError = useSaveError();

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
      setLoading(false);
    }
    load();
  }, [router]);

  async function handleTogglePublic(program: ProgramRow) {
    const next = !program.isPublic;
    const setPublic = (isPublic: boolean) =>
      setPrograms((prev) => prev.map((p) => p.id === program.id ? { ...p, isPublic } : p));
    setPublic(next);
    const ok = await saveError.attempt(() => toggleProgramPublic(program.id, next), "Couldn't change who can see this program. Try again.");
    if (!ok) setPublic(!next);
  }

  const myPrograms = programs.filter((p) => p.createdBy === userId);
  const publicPrograms = programs.filter((p) => p.createdBy !== userId);

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto p-4 md:p-8">
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-elevated rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-8 space-y-8">
      <div className="flex items-center gap-3">
        <Wrench size={22} className="text-primary" />
        <h1 className="text-xl font-bold text-fg">Program Builder</h1>
      </div>

      {saveError.message && <SaveErrorAlert message={saveError.message} onDismiss={saveError.clear} />}

      {loadFailed && (
        <p className="text-center py-16 text-sm text-subtle">Couldn&apos;t load programs. Check your connection and try again.</p>
      )}

      {myPrograms.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold text-subtle uppercase tracking-widest mb-3">My Programs</h2>
          <div className="space-y-2">
            {myPrograms.map((p) => (
              <ProgramCard
                key={p.id}
                program={p}
                isOwner
                onTogglePublic={() => handleTogglePublic(p)}
                onEdit={() => router.push(`/builder/${p.id}`)}
              />
            ))}
          </div>
        </section>
      )}

      {publicPrograms.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold text-subtle uppercase tracking-widest mb-3">Community Programs</h2>
          <div className="space-y-2">
            {publicPrograms.map((p) => (
              <ProgramCard
                key={p.id}
                program={p}
                isOwner={false}
                onEdit={() => router.push(`/builder/${p.id}`)}
              />
            ))}
          </div>
        </section>
      )}

      {!loadFailed && programs.length === 0 && (
        <div className="text-center py-16 text-subtle">
          <Wrench size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">No programs found.</p>
        </div>
      )}
    </div>
  );
}

function ProgramCard({
  program,
  isOwner,
  onTogglePublic,
  onEdit,
}: {
  program: ProgramRow;
  isOwner: boolean;
  onTogglePublic?: () => void;
  onEdit: () => void;
}) {
  return (
    <div className="bg-surface border border-border rounded-2xl p-4 flex items-center gap-4">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-fg text-sm truncate">{program.name}</span>
          {program.category && (
            <span className="text-xs bg-elevated text-muted px-2 py-0.5 rounded-full">{program.category}</span>
          )}
        </div>
        {program.description && (
          <p className="text-xs text-subtle mt-0.5 line-clamp-1">{program.description}</p>
        )}
        <div className="flex items-center gap-3 mt-1.5">
          <span className="text-xs text-subtle">{program.totalWeeks} weeks</span>
          <span className="flex items-center gap-1 text-xs text-subtle">
            <Users size={11} />
            {program.userCount} {program.userCount === 1 ? "user" : "users"}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {isOwner && onTogglePublic && (
          <button
            onClick={onTogglePublic}
            className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg transition-colors ${
              program.isPublic
                ? "bg-accent/10 text-accent hover:bg-accent/20"
                : "bg-elevated text-muted hover:bg-border"
            }`}
            title={program.isPublic ? "Make private" : "Make public"}
          >
            {program.isPublic ? <Globe size={13} /> : <Lock size={13} />}
            {program.isPublic ? "Public" : "Private"}
          </button>
        )}
        {!isOwner && (
          <span className="flex items-center gap-1 text-xs text-subtle">
            {program.isPublic ? <Globe size={12} /> : <Lock size={12} />}
          </span>
        )}
        <button
          onClick={onEdit}
          className="flex items-center gap-1 text-xs text-muted hover:text-primary transition-colors px-2 py-1.5 rounded-lg hover:bg-elevated"
        >
          {isOwner ? "Edit" : "View"}
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}
