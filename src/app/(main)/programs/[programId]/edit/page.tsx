"use client";

import { useEffect, useState, Suspense } from "react";
import { useParams, useRouter } from "next/navigation";
import { useProgramEditor } from "@/hooks/useProgramEditor";
import type { BuilderExercise } from "@/lib/types";
import { Plus } from "lucide-react";
import WeekCard from "@/components/builder/WeekCard";
import ProgramEditorHeader from "@/components/builder/ProgramEditorHeader";
import DayTypeModal from "@/components/builder/DayTypeModal";
import AddExerciseModal from "@/components/builder/AddExerciseModal";
import ExerciseEditModal from "@/components/builder/ExerciseEditModal";
import ProgramEditModal from "@/components/builder/ProgramEditModal";
import OverlayPresence from "@/components/OverlayPresence";
import SaveErrorAlert from "@/components/SaveErrorAlert";
import { lastWeek } from "@/lib/program-structure";
import { programHref } from "@/lib/program-routes";

export default function ProgramEditorPageWrapper() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <ProgramEditorPage />
    </Suspense>
  );
}

function PageSkeleton() {
  return (
    <div className="max-w-2xl mx-auto p-4 md:p-8 space-y-3">
      {[1, 2, 3].map((i) => <div key={i} className="h-14 bg-elevated rounded-2xl animate-pulse" />)}
    </div>
  );
}

function ProgramEditorPage() {
  const { programId } = useParams<{ programId: string }>();
  const router = useRouter();
  const { status, program, allExercises, canEdit, saveError, deletingKey, duplicatingWeek, actions } = useProgramEditor(programId);
  const [expandedWeeks, setExpandedWeeks] = useState<Set<number>>(new Set([1]));

  // Modals
  const [editingExercise, setEditingExercise] = useState<BuilderExercise | null>(null);
  const [editingProgram, setEditingProgram] = useState(false);
  const [addingDayToWeek, setAddingDayToWeek] = useState<number | null>(null);
  const [addingExerciseToDayId, setAddingExerciseToDayId] = useState<string | null>(null);

  // Inline confirmation of a delete — key format: "week:N", "day:pdId", "ex:pdeId"
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  // Editing is for those who can edit; everyone else gets the preview.
  const loadedWithoutEditRights = status === "ready" && !canEdit;
  useEffect(() => {
    if (loadedWithoutEditRights) router.replace(programHref(programId));
  }, [loadedWithoutEditRights, programId, router]);

  const expandWeek = (week: number | null) => {
    if (week !== null) setExpandedWeeks((prev) => new Set([...prev, week]));
  };

  function toggleWeek(week: number) {
    setExpandedWeeks((prev) => {
      const next = new Set(prev);
      if (next.has(week)) { next.delete(week); } else { next.add(week); }
      return next;
    });
  }

  // Each handler runs the action, then does the page's own follow-up (close a sheet, expand a week).
  const handleAddWeek = async () => expandWeek(await actions.addWeek());
  const handleDuplicateWeek = async (week: number) => expandWeek(await actions.duplicateWeek(week));

  async function handleDelete(action: () => Promise<boolean>) {
    await action();
    setConfirmDelete(null);
  }

  async function handleAddDay(week: number, dayType: string) {
    await actions.addDay(week, dayType);
    setAddingDayToWeek(null);
  }

  async function handleSaveExercise(pdeId: string, fields: Partial<BuilderExercise>) {
    if (await actions.saveExercise(pdeId, fields)) setEditingExercise(null);
  }

  async function handleAddExerciseToDay(pdId: string, exerciseId: string) {
    const created = await actions.addExercise(pdId, exerciseId);
    setAddingExerciseToDayId(null);
    if (created) setEditingExercise(created);
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  if (status === "loading") return <PageSkeleton />;

  if (status === "failed") {
    return <div className="max-w-2xl mx-auto p-4 md:p-8 text-center text-subtle py-16">Couldn&apos;t load this program. Check your connection and try again.</div>;
  }

  if (status === "not-found" || !program) {
    return <div className="max-w-2xl mx-auto p-4 md:p-8 text-center text-subtle py-16">Program not found.</div>;
  }

  if (!canEdit) return <PageSkeleton />; // on its way to the preview

  const maxWeek = lastWeek(program);
  const weeks = maxWeek > 0 ? Array.from({ length: maxWeek }, (_, i) => i + 1) : [];

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-8 pb-16 space-y-6">

      <ProgramEditorHeader
        program={program}
        isOwner={canEdit}
        onBack={() => router.push(programHref(program.id))}
        onEdit={() => setEditingProgram(true)}
        onTogglePublic={actions.togglePublic}
      />

      {saveError.message && <SaveErrorAlert message={saveError.message} onDismiss={saveError.clear} />}

      {/* Weeks */}
      <div className="space-y-3">
        {weeks.map((week) => (
          <WeekCard
            key={week}
            week={week}
            days={program.days.filter((d) => d.week === week).sort((a, b) => a.dayIndex - b.dayIndex)}
            expanded={expandedWeeks.has(week)}
            isOwner={canEdit}
            confirmDelete={confirmDelete}
            deletingKey={deletingKey}
            duplicatingWeek={duplicatingWeek}
            duplicateTargetWeek={maxWeek + 1}
            onToggle={() => toggleWeek(week)}
            onAskDelete={setConfirmDelete}
            onCancelDelete={() => setConfirmDelete(null)}
            onDeleteWeek={() => handleDelete(() => actions.deleteWeek(week))}
            onDeleteDay={(pdId) => handleDelete(() => actions.deleteDay(pdId))}
            onDeleteExercise={(pdeId) => handleDelete(() => actions.deleteExercise(pdeId))}
            onDuplicate={() => handleDuplicateWeek(week)}
            onEditExercise={setEditingExercise}
            onAddExercise={setAddingExerciseToDayId}
            onAddDay={() => setAddingDayToWeek(week)}
          />
        ))}


        {/* Add week */}
        {canEdit && (
          <button
            onClick={handleAddWeek}
            className="w-full flex items-center justify-center gap-2 py-3 text-sm text-subtle hover:text-primary transition-colors border border-dashed border-border hover:border-primary/40 rounded-2xl"
          >
            <Plus size={14} /> Add week
          </button>
        )}
      </div>

      {/* ── Modals ── */}
      <OverlayPresence>
        {editingExercise && (
          <ExerciseEditModal
            exercise={editingExercise}
            allExercises={allExercises}
            onSave={(fields) => handleSaveExercise(editingExercise.pdeId, fields)}
            onClose={() => setEditingExercise(null)}
          />
        )}
      </OverlayPresence>
      <OverlayPresence>
        {addingExerciseToDayId && (
          <AddExerciseModal
            allExercises={allExercises}
            onAdd={(exerciseId) => handleAddExerciseToDay(addingExerciseToDayId, exerciseId)}
            onClose={() => setAddingExerciseToDayId(null)}
          />
        )}
      </OverlayPresence>
      <OverlayPresence>
        {addingDayToWeek !== null && (
          <DayTypeModal onSelect={(dayType) => handleAddDay(addingDayToWeek, dayType)} onClose={() => setAddingDayToWeek(null)} />
        )}
      </OverlayPresence>
      <OverlayPresence>
        {editingProgram && (
          <ProgramEditModal
            program={program}
            onSave={async (fields) => {
              await actions.updateDetails(fields);
              setEditingProgram(false);
            }}
            onClose={() => setEditingProgram(false)}
          />
        )}
      </OverlayPresence>
    </div>
  );
}
