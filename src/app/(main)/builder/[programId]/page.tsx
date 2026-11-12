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
import { ArrowLeft, Globe, Lock, Pencil, Users, Plus } from "lucide-react";
import WeekCard from "@/components/builder/WeekCard";
import DayTypeModal from "@/components/builder/DayTypeModal";
import AddExerciseModal from "@/components/builder/AddExerciseModal";
import ExerciseEditModal from "@/components/builder/ExerciseEditModal";
import ProgramEditModal from "@/components/builder/ProgramEditModal";
import type { ExerciseInfo } from "@/components/builder/constants";

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
      {[1, 2, 3].map((i) => <div key={i} className="h-14 bg-zinc-800 rounded-2xl animate-pulse" />)}
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

  const load = useCallback(async () => {
    const user = await getSignedInUser();
    if (!user) { router.replace("/auth"); return; }
    setUserId(user.id);
    const [data, exercises] = await Promise.all([getBuilderProgram(programId), getAllExercises()]);
    setProgram(data);
    setAllExercises(exercises);
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
    await toggleProgramPublic(program.id, next);
  }

  // ── Week actions ─────────────────────────────────────────────────────────────

  async function handleAddWeek() {
    if (!program) return;
    const newTotal = program.totalWeeks + 1;
    await addProgramWeek(program.id, newTotal);
    setProgram((p) => p ? { ...p, totalWeeks: newTotal } : p);
    setExpandedWeeks((prev) => new Set([...prev, newTotal]));
  }

  async function handleDuplicateWeek(week: number) {
    if (!program || duplicatingWeek !== null) return;
    setDuplicatingWeek(week);
    const maxW = Math.max(program.totalWeeks, ...program.days.map((d) => d.week), 0);
    const targetWeek = maxW + 1;
    const newTotal = Math.max(program.totalWeeks, targetWeek);
    const newDays = await duplicateProgramWeek(program.id, week, targetWeek, newTotal);
    setProgram((p) => p ? { ...p, totalWeeks: newTotal, days: [...p.days, ...newDays] } : p);
    setExpandedWeeks((prev) => new Set([...prev, targetWeek]));
    setDuplicatingWeek(null);
  }

  async function handleDeleteWeek(week: number) {
    if (!program) return;
    setDeletingKey(`week:${week}`);
    await deleteProgramWeek(program.id, week);
    setProgram((p) => {
      if (!p) return p;
      const remaining = p.days.filter((d) => d.week !== week);
      const maxRemaining = remaining.length > 0 ? Math.max(...remaining.map((d) => d.week)) : 0;
      const newTotal = week === p.totalWeeks ? Math.max(week - 1, maxRemaining) : p.totalWeeks;
      return { ...p, days: remaining, totalWeeks: newTotal };
    });
    setDeletingKey(null);
    setConfirmDelete(null);
  }

  // ── Day actions ──────────────────────────────────────────────────────────────

  async function handleAddDay(week: number, dayType: string) {
    if (!program) return;
    const daysInWeek = program.days.filter((d) => d.week === week);
    const newDay = await addProgramDay(program.id, week, daysInWeek.length, dayType);
    setProgram((p) => p ? { ...p, days: [...p.days, newDay] } : p);
    setAddingDayToWeek(null);
  }

  async function handleDeleteDay(pdId: string) {
    setDeletingKey(`day:${pdId}`);
    await deleteProgramDay(pdId);
    setProgram((p) => p ? { ...p, days: p.days.filter((d) => d.pdId !== pdId) } : p);
    setDeletingKey(null);
    setConfirmDelete(null);
  }

  // ── Exercise actions ─────────────────────────────────────────────────────────

  async function handleSaveExercise(pdeId: string, fields: Partial<BuilderExercise>) {
    await updateProgramDayExercise(pdeId, {
      exerciseId: fields.exerciseId,
      repRangeMin: fields.repRangeMin,
      repRangeMax: fields.repRangeMax,
      earlySetCount: fields.earlySetCount,
      lastSetCount: fields.lastSetCount,
      earlySetRpeMin: fields.earlySetRpeMin,
      earlySetRpeMax: fields.earlySetRpeMax,
      lastSetTarget: fields.lastSetTarget,
    });
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
    const newEx = await addExerciseToDay(pdId, exerciseId, exInfo.name, exInfo.warmupProtocol, day.exercises.length);
    setProgram((p) => {
      if (!p) return p;
      return { ...p, days: p.days.map((d) => d.pdId === pdId ? { ...d, exercises: [...d.exercises, newEx] } : d) };
    });
    setAddingExerciseToDayId(null);
    setEditingExercise(newEx);
  }

  async function handleDeleteExercise(pdeId: string) {
    setDeletingKey(`ex:${pdeId}`);
    await deleteProgramDayExercise(pdeId);
    setProgram((p) => {
      if (!p) return p;
      return { ...p, days: p.days.map((d) => ({ ...d, exercises: d.exercises.filter((ex) => ex.pdeId !== pdeId) })) };
    });
    setDeletingKey(null);
    setConfirmDelete(null);
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  if (loading) return <PageSkeleton />;

  if (!program) {
    return <div className="max-w-2xl mx-auto p-4 md:p-8 text-center text-zinc-500 py-16">Program not found.</div>;
  }

  const maxWeek = Math.max(program.totalWeeks, program.days.length > 0 ? Math.max(...program.days.map((d) => d.week)) : 0, 0);
  const weeks = maxWeek > 0 ? Array.from({ length: maxWeek }, (_, i) => i + 1) : [];

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-8 pb-16 space-y-6">

      {/* Header */}
      <div className="flex items-start gap-3">
        <button onClick={() => router.push("/builder")} className="mt-0.5 text-zinc-400 hover:text-zinc-100 transition-colors shrink-0">
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-lg font-bold text-zinc-100 truncate">{program.name}</h1>
            {isOwner && (
              <button onClick={() => setEditingProgram(true)} className="text-zinc-600 hover:text-orange-400 transition-colors">
                <Pencil size={14} />
              </button>
            )}
          </div>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            {program.category && (
              <span className="text-xs bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full">{program.category}</span>
            )}
            <span className="text-xs text-zinc-500">{program.totalWeeks} {program.totalWeeks === 1 ? "week" : "weeks"}</span>
            <span className="flex items-center gap-1 text-xs text-zinc-500">
              <Users size={11} /> {program.userCount} {program.userCount === 1 ? "user" : "users"}
            </span>
          </div>
          {program.description && <p className="text-sm text-zinc-500 mt-1">{program.description}</p>}
        </div>
        {isOwner && (
          <button
            onClick={handleTogglePublic}
            className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-colors shrink-0 ${
              program.isPublic ? "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20" : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
            }`}
          >
            {program.isPublic ? <Globe size={13} /> : <Lock size={13} />}
            {program.isPublic ? "Public" : "Private"}
          </button>
        )}
      </div>

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
            className="w-full flex items-center justify-center gap-2 py-3 text-sm text-zinc-600 hover:text-orange-400 transition-colors border border-dashed border-zinc-800 hover:border-orange-500/40 rounded-2xl"
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
            await updateProgram(program.id, fields);
            setProgram((p) => p ? { ...p, ...fields } : p);
            setEditingProgram(false);
          }}
          onClose={() => setEditingProgram(false)}
        />
      )}
    </div>
  );
}
