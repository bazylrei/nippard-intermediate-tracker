"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useParams, useRouter } from "next/navigation";
import { getSignedInUser } from "@/lib/auth";
import {
  getBuilderProgram, updateProgramDayExercise, updateProgram, toggleProgramPublic,
  getAllExercises, addProgramWeek, addProgramDay, addExerciseToDay, duplicateProgramWeek,
  deleteProgramDayExercise, deleteProgramDay, deleteProgramWeek,
} from "@/lib/db";
import type { BuilderProgram, BuilderExercise } from "@/lib/types";
import { Plus } from "lucide-react";
import WeekCard from "@/components/builder/WeekCard";
import ProgramEditorHeader from "@/components/builder/ProgramEditorHeader";
import DayTypeModal from "@/components/builder/DayTypeModal";
import AddExerciseModal from "@/components/builder/AddExerciseModal";
import ExerciseEditModal from "@/components/builder/ExerciseEditModal";
import ProgramEditModal from "@/components/builder/ProgramEditModal";
import type { ExerciseInfo } from "@/components/builder/constants";
import SaveErrorAlert from "@/components/workout/SaveErrorAlert";
import { useSaveError } from "@/hooks/useSaveError";
import { lastWeek, nextDayIndex } from "@/lib/program-structure";

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
  const [userId, setUserId] = useState<string | null>(null);
  const [program, setProgram] = useState<BuilderProgram | null>(null);
  const [allExercises, setAllExercises] = useState<ExerciseInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [expandedWeeks, setExpandedWeeks] = useState<Set<number>>(new Set([1]));

  // Modals
  const [editingExercise, setEditingExercise] = useState<BuilderExercise | null>(null);
  const [editingProgram, setEditingProgram] = useState(false);
  const [addingDayToWeek, setAddingDayToWeek] = useState<number | null>(null);
  const [addingExerciseToDayId, setAddingExerciseToDayId] = useState<string | null>(null);

  // Inline confirmations — key format: "week:N", "day:pdId", "ex:pdeId"
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [deletingKey, setDeletingKey] = useState<string | null>(null);
  const [duplicatingWeek, setDuplicatingWeek] = useState<number | null>(null);
  const saveError = useSaveError();
  const { attempt } = saveError;

  const load = useCallback(async () => {
    const user = await getSignedInUser();
    if (!user) { router.replace("/auth"); return; }
    setUserId(user.id);
    try {
      const [data, exercises] = await Promise.all([getBuilderProgram(programId), getAllExercises()]);
      setProgram(data);
      setAllExercises(exercises);
    } catch (error) {
      console.error(error);
      setLoadFailed(true);
    }
    setLoading(false);
  }, [programId, router]);

  useEffect(() => { async function run() { await load(); } void run(); }, [load]);

  const isOwner = !!userId && program?.createdBy === userId;

  function toggleWeek(week: number) {
    setExpandedWeeks((prev) => {
      const next = new Set(prev);
      if (next.has(week)) { next.delete(week); } else { next.add(week); }
      return next;
    });
  }

  // ── Program actions ──────────────────────────────────────────────────────────

  async function handleTogglePublic() {
    if (!program) return;
    const next = !program.isPublic;
    setProgram((p) => p ? { ...p, isPublic: next } : p);
    const ok = await attempt(() => toggleProgramPublic(program.id, next), "Couldn't change who can see this program. Try again.");
    if (!ok) setProgram((p) => p ? { ...p, isPublic: !next } : p);
  }

  // ── Week actions ─────────────────────────────────────────────────────────────

  async function handleAddWeek() {
    if (!program) return;
    const newTotal = program.totalWeeks + 1;
    if (!(await attempt(() => addProgramWeek(program.id, newTotal), "Couldn't add a week. Try again."))) return;
    setProgram((p) => p ? { ...p, totalWeeks: newTotal } : p);
    setExpandedWeeks((prev) => new Set([...prev, newTotal]));
  }

  async function handleDuplicateWeek(week: number) {
    if (!program || duplicatingWeek !== null) return;
    setDuplicatingWeek(week);
    const targetWeek = lastWeek(program) + 1;
    let newDays: BuilderProgram["days"] = [];
    const ok = await attempt(async () => {
      newDays = await duplicateProgramWeek(program.id, week, targetWeek, targetWeek);
    }, "Couldn't duplicate the week. Try again.");
    setDuplicatingWeek(null);
    if (!ok) return;
    setProgram((p) => p ? { ...p, totalWeeks: targetWeek, days: [...p.days, ...newDays] } : p);
    setExpandedWeeks((prev) => new Set([...prev, targetWeek]));
  }

  async function handleDeleteWeek(week: number) {
    if (!program) return;
    setDeletingKey(`week:${week}`);
    const ok = await attempt(() => deleteProgramWeek(program.id, week), "Couldn't delete the week. Try again.");
    setDeletingKey(null);
    setConfirmDelete(null);
    if (!ok) return;
    setProgram((p) => {
      if (!p) return p;
      const remaining = p.days.filter((d) => d.week !== week);
      const maxRemaining = remaining.length > 0 ? Math.max(...remaining.map((d) => d.week)) : 0;
      const newTotal = week === p.totalWeeks ? Math.max(week - 1, maxRemaining) : p.totalWeeks;
      return { ...p, days: remaining, totalWeeks: newTotal };
    });
  }

  // ── Day actions ──────────────────────────────────────────────────────────────

  async function handleAddDay(week: number, dayType: string) {
    if (!program) return;
    let newDay: BuilderProgram["days"][number] | null = null;
    const ok = await attempt(async () => {
      newDay = await addProgramDay(program.id, week, nextDayIndex(program.days, week), dayType);
    }, "Couldn't add the day. Try again.");
    setAddingDayToWeek(null);
    if (!ok || !newDay) return;
    const added = newDay;
    setProgram((p) => p ? { ...p, days: [...p.days, added] } : p);
  }

  async function handleDeleteDay(pdId: string) {
    setDeletingKey(`day:${pdId}`);
    const ok = await attempt(() => deleteProgramDay(pdId), "Couldn't delete the day. Try again.");
    setDeletingKey(null);
    setConfirmDelete(null);
    if (ok) setProgram((p) => p ? { ...p, days: p.days.filter((d) => d.pdId !== pdId) } : p);
  }

  // ── Exercise actions ─────────────────────────────────────────────────────────

  async function handleSaveExercise(pdeId: string, fields: Partial<BuilderExercise>) {
    const ok = await attempt(() => updateProgramDayExercise(pdeId, {
      exerciseId: fields.exerciseId,
      repRangeMin: fields.repRangeMin,
      repRangeMax: fields.repRangeMax,
      earlySetCount: fields.earlySetCount,
      lastSetCount: fields.lastSetCount,
      earlySetRpeMin: fields.earlySetRpeMin,
      earlySetRpeMax: fields.earlySetRpeMax,
      lastSetTarget: fields.lastSetTarget,
    }), "Couldn't save the exercise. Try again.");
    if (!ok) return;
    const resolvedFields = { ...fields };
    if (fields.exerciseId) {
      const found = allExercises.find((e) => e.id === fields.exerciseId);
      if (found) resolvedFields.name = found.name;
    }
    setProgram((p) => {
      if (!p) return p;
      return {
        ...p,
        days: p.days.map((day) => ({
          ...day,
          exercises: day.exercises.map((ex) => ex.pdeId === pdeId ? { ...ex, ...resolvedFields } : ex),
        })),
      };
    });
    setEditingExercise(null);
  }

  async function handleAddExerciseToDay(pdId: string, exerciseId: string) {
    if (!program) return;
    const day = program.days.find((d) => d.pdId === pdId);
    if (!day) return;
    const exInfo = allExercises.find((e) => e.id === exerciseId);
    if (!exInfo) return;
    let created: BuilderExercise | null = null;
    const ok = await attempt(async () => {
      created = await addExerciseToDay(pdId, exerciseId, exInfo.name, exInfo.warmupProtocol, day.exercises.length);
    }, "Couldn't add the exercise. Try again.");
    setAddingExerciseToDayId(null);
    if (!ok || !created) return;
    const newEx: BuilderExercise = created;
    setProgram((p) => {
      if (!p) return p;
      return { ...p, days: p.days.map((d) => d.pdId === pdId ? { ...d, exercises: [...d.exercises, newEx] } : d) };
    });
    setEditingExercise(newEx);
  }

  async function handleDeleteExercise(pdeId: string) {
    setDeletingKey(`ex:${pdeId}`);
    const ok = await attempt(() => deleteProgramDayExercise(pdeId), "Couldn't delete the exercise. Try again.");
    setDeletingKey(null);
    setConfirmDelete(null);
    if (!ok) return;
    setProgram((p) => {
      if (!p) return p;
      return { ...p, days: p.days.map((d) => ({ ...d, exercises: d.exercises.filter((ex) => ex.pdeId !== pdeId) })) };
    });
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  if (loading) return <PageSkeleton />;

  if (loadFailed) {
    return <div className="max-w-2xl mx-auto p-4 md:p-8 text-center text-subtle py-16">Couldn&apos;t load this program. Check your connection and try again.</div>;
  }

  if (!program) {
    return <div className="max-w-2xl mx-auto p-4 md:p-8 text-center text-subtle py-16">Program not found.</div>;
  }

  const maxWeek = lastWeek(program);
  const weeks = maxWeek > 0 ? Array.from({ length: maxWeek }, (_, i) => i + 1) : [];

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-8 pb-16 space-y-6">

      <ProgramEditorHeader
        program={program}
        isOwner={isOwner}
        onBack={() => router.push("/builder")}
        onEdit={() => setEditingProgram(true)}
        onTogglePublic={handleTogglePublic}
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
            isOwner={isOwner}
            confirmDelete={confirmDelete}
            deletingKey={deletingKey}
            duplicatingWeek={duplicatingWeek}
            duplicateTargetWeek={maxWeek + 1}
            onToggle={() => toggleWeek(week)}
            onAskDelete={setConfirmDelete}
            onCancelDelete={() => setConfirmDelete(null)}
            onDeleteWeek={() => handleDeleteWeek(week)}
            onDeleteDay={handleDeleteDay}
            onDeleteExercise={handleDeleteExercise}
            onDuplicate={() => handleDuplicateWeek(week)}
            onEditExercise={setEditingExercise}
            onAddExercise={setAddingExerciseToDayId}
            onAddDay={() => setAddingDayToWeek(week)}
          />
        ))}


        {/* Add week */}
        {isOwner && (
          <button
            onClick={handleAddWeek}
            className="w-full flex items-center justify-center gap-2 py-3 text-sm text-subtle hover:text-primary transition-colors border border-dashed border-border hover:border-primary/40 rounded-2xl"
          >
            <Plus size={14} /> Add week
          </button>
        )}
      </div>

      {/* ── Modals ── */}

      {editingExercise && (
        <ExerciseEditModal
          exercise={editingExercise}
          allExercises={allExercises}
          onSave={(fields) => handleSaveExercise(editingExercise.pdeId, fields)}
          onClose={() => setEditingExercise(null)}
        />
      )}

      {addingExerciseToDayId && (
        <AddExerciseModal
          allExercises={allExercises}
          onAdd={(exerciseId) => handleAddExerciseToDay(addingExerciseToDayId, exerciseId)}
          onClose={() => setAddingExerciseToDayId(null)}
        />
      )}

      {addingDayToWeek !== null && (
        <DayTypeModal
          onSelect={(dayType) => handleAddDay(addingDayToWeek, dayType)}
          onClose={() => setAddingDayToWeek(null)}
        />
      )}

      {editingProgram && (
        <ProgramEditModal
          program={program}
          onSave={async (fields) => {
            const ok = await attempt(() => updateProgram(program.id, fields), "Couldn't save the program details. Try again.");
            setEditingProgram(false);
            if (ok) setProgram((p) => p ? { ...p, ...fields } : p);
          }}
          onClose={() => setEditingProgram(false)}
        />
      )}
    </div>
  );
}
