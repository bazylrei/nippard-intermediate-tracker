/* eslint-disable max-lines */
"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import {
  getBuilderProgram, updateProgramDayExercise, updateProgram, toggleProgramPublic,
  getAllExercises, addProgramWeek, addProgramDay, addExerciseToDay, duplicateProgramWeek,
  deleteProgramDayExercise, deleteProgramDay, deleteProgramWeek,
} from "@/lib/db";
import type { BuilderProgram, BuilderExercise } from "@/lib/types";
import {
  ArrowLeft, ChevronDown, ChevronRight, Globe, Lock, Pencil, Check, X,
  Users, Plus, Copy, Trash2,
} from "lucide-react";

type ExerciseInfo = { id: string; name: string; muscleGroup: string; warmupProtocol: string };

const DAY_TYPE_PRESETS = [
  { value: "push",           label: "Push" },
  { value: "pull",           label: "Pull" },
  { value: "legs",           label: "Legs" },
  { value: "upper-a",        label: "Upper A" },
  { value: "upper-b",        label: "Upper B" },
  { value: "lower-a",        label: "Lower A" },
  { value: "lower-b",        label: "Lower B" },
  { value: "full-body",      label: "Full Body" },
  { value: "back-biceps",    label: "Back & Biceps" },
  { value: "chest-triceps",  label: "Chest & Triceps" },
  { value: "shoulders-arms", label: "Shoulders & Arms" },
  { value: "cardio",         label: "Cardio" },
];

const DAY_TYPE_LABELS: Record<string, string> = Object.fromEntries(
  DAY_TYPE_PRESETS.map((p) => [p.value, p.label])
);

const FAILURE_TECHNIQUES = [
  { value: "failure",        label: "Failure" },
  { value: "failure+llps",   label: "Failure + LLPS" },
  { value: "myo-reps",       label: "Myo-Reps" },
  { value: "static-stretch", label: "Static Stretch" },
  { value: "rpe",            label: "RPE Target" },
];

const WARMUP_PROTOCOLS = [
  { value: "none",  label: "None" },
  { value: "1-set", label: "1 set" },
  { value: "2-set", label: "2 sets" },
  { value: "3-set", label: "3 sets" },
  { value: "4-set", label: "4 sets" },
];

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
    const sb = createClient();
    const { data: { user } } = await sb.auth.getUser();
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
        {weeks.map((week) => {
          const daysInWeek = program.days.filter((d) => d.week === week).sort((a, b) => a.dayIndex - b.dayIndex);
          const expanded = expandedWeeks.has(week);
          const weekKey = `week:${week}`;
          const isConfirmingDelete = confirmDelete === weekKey;
          const isDuplicating = duplicatingWeek === week;

          return (
            <div key={week} className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">

              {/* Week header */}
              <div className="flex items-center gap-1 px-4 py-3">
                <button
                  onClick={() => toggleWeek(week)}
                  className="flex-1 flex items-center gap-2 text-sm font-semibold text-zinc-200 text-left"
                >
                  {expanded
                    ? <ChevronDown size={15} className="text-zinc-500 shrink-0" />
                    : <ChevronRight size={15} className="text-zinc-500 shrink-0" />
                  }
                  Week {week}
                  <span className="text-xs font-normal text-zinc-600 ml-1">
                    {daysInWeek.length} {daysInWeek.length === 1 ? "day" : "days"}
                  </span>
                </button>

                {isOwner && (
                  isConfirmingDelete ? (
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-zinc-500">Delete week?</span>
                      <button
                        onClick={() => handleDeleteWeek(week)}
                        disabled={deletingKey === weekKey}
                        className="text-xs font-medium text-red-400 hover:text-red-300 disabled:opacity-50"
                      >
                        {deletingKey === weekKey ? "…" : "Delete"}
                      </button>
                      <button onClick={() => setConfirmDelete(null)} className="text-zinc-600 hover:text-zinc-400">
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-0.5 shrink-0">
                      <button
                        onClick={() => handleDuplicateWeek(week)}
                        disabled={isDuplicating || duplicatingWeek !== null}
                        title="Duplicate week to end"
                        className="text-zinc-600 hover:text-orange-400 transition-colors p-1.5 disabled:opacity-40"
                      >
                        {isDuplicating ? <span className="text-xs">…</span> : <Copy size={14} />}
                      </button>
                      <button
                        onClick={() => setConfirmDelete(weekKey)}
                        className="text-zinc-700 hover:text-red-400 transition-colors p-1.5"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )
                )}
              </div>

              {/* Week body */}
              {expanded && (
                <div className="border-t border-zinc-800">
                  {daysInWeek.length === 0 && (
                    <p className="px-4 py-4 text-xs text-zinc-600 italic">No days yet — add one below.</p>
                  )}

                  {daysInWeek.map((day, dayIdx) => {
                    const dayKey = `day:${day.pdId}`;
                    const isConfirmingDay = confirmDelete === dayKey;
                    return (
                      <div key={day.pdId} className={dayIdx > 0 ? "border-t border-zinc-800/60" : ""}>

                        {/* Day header */}
                        <div className="flex items-center gap-2 px-4 py-2.5 bg-zinc-800/40">
                          <span className="flex-1 text-xs font-semibold text-zinc-400 uppercase tracking-wide">
                            Day {day.dayIndex + 1}
                            {(DAY_TYPE_LABELS[day.dayType] ?? day.dayType) && (
                              <span className="ml-1.5 text-zinc-500 normal-case tracking-normal font-normal">
                                — {DAY_TYPE_LABELS[day.dayType] ?? day.dayType}
                              </span>
                            )}
                          </span>

                          {isOwner && (
                            isConfirmingDay ? (
                              <div className="flex items-center gap-2 shrink-0">
                                <span className="text-xs text-zinc-500">Delete day?</span>
                                <button
                                  onClick={() => handleDeleteDay(day.pdId)}
                                  disabled={deletingKey === dayKey}
                                  className="text-xs font-medium text-red-400 hover:text-red-300 disabled:opacity-50"
                                >
                                  {deletingKey === dayKey ? "…" : "Delete"}
                                </button>
                                <button onClick={() => setConfirmDelete(null)} className="text-zinc-600 hover:text-zinc-400">
                                  <X size={13} />
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setConfirmDelete(dayKey)}
                                className="text-zinc-700 hover:text-red-400 transition-colors p-1 shrink-0"
                              >
                                <Trash2 size={13} />
                              </button>
                            )
                          )}
                        </div>

                        {/* Exercises */}
                        {day.exercises.map((ex) => {
                          const exKey = `ex:${ex.pdeId}`;
                          const isConfirmingEx = confirmDelete === exKey;
                          return (
                            <div key={ex.pdeId} className="flex items-center gap-3 px-4 py-2.5 hover:bg-zinc-800/20 transition-colors">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm text-zinc-200 font-medium truncate">{ex.name}</p>
                                <p className="text-xs text-zinc-600 mt-0.5">
                                  {ex.earlySetCount + ex.lastSetCount} sets · {ex.repRangeMin}–{ex.repRangeMax} reps
                                  {" · "}
                                  {WARMUP_PROTOCOLS.find((w) => w.value === ex.warmupProtocol)?.label ?? ex.warmupProtocol} warmup
                                  {" · "}
                                  {FAILURE_TECHNIQUES.find((f) => f.value === ex.lastSetTarget)?.label ?? ex.lastSetTarget}
                                </p>
                              </div>

                              {isOwner && (
                                isConfirmingEx ? (
                                  <div className="flex items-center gap-2 shrink-0">
                                    <button
                                      onClick={() => handleDeleteExercise(ex.pdeId)}
                                      disabled={deletingKey === exKey}
                                      className="text-xs font-medium text-red-400 hover:text-red-300 disabled:opacity-50"
                                    >
                                      {deletingKey === exKey ? "…" : "Delete"}
                                    </button>
                                    <button onClick={() => setConfirmDelete(null)} className="text-zinc-600 hover:text-zinc-400">
                                      <X size={13} />
                                    </button>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-0.5 shrink-0">
                                    <button
                                      onClick={() => setEditingExercise(ex)}
                                      className="text-zinc-600 hover:text-orange-400 transition-colors p-1 rounded-lg"
                                    >
                                      <Pencil size={13} />
                                    </button>
                                    <button
                                      onClick={() => setConfirmDelete(exKey)}
                                      className="text-zinc-700 hover:text-red-400 transition-colors p-1"
                                    >
                                      <Trash2 size={13} />
                                    </button>
                                  </div>
                                )
                              )}
                            </div>
                          );
                        })}

                        {/* Add exercise */}
                        {isOwner && (
                          <button
                            onClick={() => setAddingExerciseToDayId(day.pdId)}
                            className="flex items-center gap-1.5 w-full px-4 py-2 text-xs text-zinc-600 hover:text-orange-400 transition-colors"
                          >
                            <Plus size={11} /> Add exercise
                          </button>
                        )}
                      </div>
                    );
                  })}

                  {/* Add day + duplicate */}
                  {isOwner && (
                    <div className="border-t border-zinc-800 flex items-center justify-between px-4 py-2.5">
                      <button
                        onClick={() => setAddingDayToWeek(week)}
                        className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-orange-400 transition-colors"
                      >
                        <Plus size={12} /> Add day
                      </button>
                      <button
                        onClick={() => handleDuplicateWeek(week)}
                        disabled={duplicatingWeek !== null}
                        className="flex items-center gap-1.5 text-xs text-zinc-600 hover:text-orange-400 transition-colors disabled:opacity-40"
                      >
                        <Copy size={12} />
                        {duplicatingWeek === week ? "Duplicating…" : `Duplicate to Week ${Math.max(program.totalWeeks, ...program.days.map((d) => d.week), 0) + 1}`}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

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

// ── DayTypeModal ──────────────────────────────────────────────────────────────

function DayTypeModal({ onSelect, onClose }: { onSelect: (type: string) => void; onClose: () => void }) {
  const [custom, setCustom] = useState("");
  const [showCustom, setShowCustom] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/60 p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-sm p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-zinc-100 text-sm">Choose day type</h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300"><X size={18} /></button>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {DAY_TYPE_PRESETS.map((preset) => (
            <button
              key={preset.value}
              onClick={() => onSelect(preset.value)}
              className="py-2.5 px-2 rounded-xl text-sm bg-zinc-800 text-zinc-300 hover:bg-orange-500/15 hover:text-orange-400 transition-colors leading-tight"
            >
              {preset.label}
            </button>
          ))}
          <button
            onClick={() => setShowCustom(true)}
            className="py-2.5 px-2 rounded-xl text-sm bg-zinc-800 text-zinc-500 hover:bg-zinc-700 transition-colors"
          >
            Custom…
          </button>
        </div>

        {showCustom && (
          <div className="flex gap-2 pt-1">
            <input
              autoFocus
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && custom.trim()) onSelect(custom.trim()); }}
              placeholder="e.g. Arms, Glutes, HIIT"
              className="flex-1 bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-orange-500"
            />
            <button
              onClick={() => custom.trim() && onSelect(custom.trim())}
              disabled={!custom.trim()}
              className="px-4 py-2 rounded-xl text-sm font-medium bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-40 transition-colors"
            >
              Add
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── AddExerciseModal ──────────────────────────────────────────────────────────

function AddExerciseModal({
  allExercises,
  onAdd,
  onClose,
}: {
  allExercises: ExerciseInfo[];
  onAdd: (exerciseId: string) => Promise<void>;
  onClose: () => void;
}) {
  const [search, setSearch] = useState("");
  const [adding, setAdding] = useState(false);

  const filtered = search.trim()
    ? allExercises.filter((e) => e.name.toLowerCase().includes(search.toLowerCase()))
    : allExercises;

  const grouped = filtered.reduce<Record<string, ExerciseInfo[]>>((acc, ex) => {
    if (!acc[ex.muscleGroup]) acc[ex.muscleGroup] = [];
    acc[ex.muscleGroup].push(ex);
    return acc;
  }, {});

  async function handlePick(exerciseId: string) {
    setAdding(true);
    await onAdd(exerciseId);
    setAdding(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/60 p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-sm p-5 space-y-3 max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between shrink-0">
          <h2 className="font-semibold text-zinc-100 text-sm">Add Exercise</h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300"><X size={18} /></button>
        </div>
        <input
          autoFocus
          placeholder="Search exercises…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          autoCorrect="off"
          autoCapitalize="off"
          className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-orange-500 shrink-0"
        />
        <div className="overflow-y-auto flex-1 -mx-1 px-1">
          {Object.entries(grouped).map(([group, exs]) => (
            <div key={group}>
              <p className="sticky top-0 bg-zinc-900 text-xs text-zinc-500 font-semibold uppercase tracking-wide px-1 py-1.5">
                {group}
              </p>
              {exs.map((ex) => (
                <button
                  key={ex.id}
                  onClick={() => handlePick(ex.id)}
                  disabled={adding}
                  className="w-full text-left px-2 py-2 rounded-lg text-sm text-zinc-200 hover:bg-zinc-800 transition-colors disabled:opacity-50"
                >
                  {ex.name}
                </button>
              ))}
            </div>
          ))}
          {filtered.length === 0 && (
            <p className="text-xs text-zinc-600 text-center py-6">No exercises match.</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ── ExerciseEditModal ─────────────────────────────────────────────────────────

function ExerciseEditModal({
  exercise,
  allExercises,
  onSave,
  onClose,
}: {
  exercise: BuilderExercise;
  allExercises: ExerciseInfo[];
  onSave: (fields: Partial<BuilderExercise>) => Promise<void>;
  onClose: () => void;
}) {
  const [exerciseId, setExerciseId] = useState(exercise.exerciseId);
  const [search, setSearch] = useState("");
  const [showPicker, setShowPicker] = useState(false);
  const [repMin, setRepMin] = useState(String(exercise.repRangeMin));
  const [repMax, setRepMax] = useState(String(exercise.repRangeMax));
  const [earlySets, setEarlySets] = useState(String(exercise.earlySetCount));
  const [lastSets, setLastSets] = useState(String(exercise.lastSetCount));
  const [lastSetTarget, setLastSetTarget] = useState(exercise.lastSetTarget);
  const [saving, setSaving] = useState(false);

  const selectedName = allExercises.find((e) => e.id === exerciseId)?.name ?? exercise.name;

  const filtered = search.trim()
    ? allExercises.filter((e) => e.name.toLowerCase().includes(search.toLowerCase()))
    : allExercises;

  const grouped = filtered.reduce<Record<string, ExerciseInfo[]>>((acc, ex) => {
    if (!acc[ex.muscleGroup]) acc[ex.muscleGroup] = [];
    acc[ex.muscleGroup].push(ex);
    return acc;
  }, {});

  async function handleSave() {
    setSaving(true);
    await onSave({
      exerciseId,
      repRangeMin: parseInt(repMin) || exercise.repRangeMin,
      repRangeMax: parseInt(repMax) || exercise.repRangeMax,
      earlySetCount: parseInt(earlySets),
      lastSetCount: Math.max(1, parseInt(lastSets) || 1),
      lastSetTarget,
    });
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/60 p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-sm p-5 space-y-4 max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between shrink-0">
          <h2 className="font-semibold text-zinc-100 text-sm">Edit Exercise Slot</h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300"><X size={18} /></button>
        </div>

        {/* Exercise picker toggle */}
        <div className="shrink-0 space-y-1.5">
          <span className="text-xs text-zinc-500">Exercise</span>
          <button
            onClick={() => setShowPicker((v) => !v)}
            className="w-full flex items-center justify-between bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 text-sm text-zinc-100 hover:border-orange-500 transition-colors"
          >
            <span className="truncate">{selectedName}</span>
            <ChevronDown size={14} className={`text-zinc-500 transition-transform shrink-0 ml-2 ${showPicker ? "rotate-180" : ""}`} />
          </button>
        </div>

        {showPicker ? (
          <div className="flex flex-col min-h-0 flex-1">
            <input
              autoFocus
              placeholder="Search exercises…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoCorrect="off"
              autoCapitalize="off"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-orange-500 mb-2 shrink-0"
            />
            <div className="overflow-y-auto flex-1 -mx-1 px-1">
              {Object.entries(grouped).map(([group, exs]) => (
                <div key={group}>
                  <p className="sticky top-0 bg-zinc-900 text-xs text-zinc-500 font-semibold uppercase tracking-wide px-1 py-1.5">
                    {group}
                  </p>
                  {exs.map((ex) => (
                    <button
                      key={ex.id}
                      onClick={() => { setExerciseId(ex.id); setShowPicker(false); setSearch(""); }}
                      className={`w-full text-left px-2 py-2 rounded-lg text-sm transition-colors ${
                        ex.id === exerciseId ? "bg-orange-500/10 text-orange-400" : "text-zinc-200 hover:bg-zinc-800"
                      }`}
                    >
                      {ex.name}
                    </button>
                  ))}
                </div>
              ))}
              {filtered.length === 0 && <p className="text-xs text-zinc-600 text-center py-4">No matches.</p>}
            </div>
          </div>
        ) : (
          <div className="space-y-4 flex-1 overflow-y-auto">
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Rep min",      value: repMin,    set: setRepMin },
                { label: "Rep max",      value: repMax,    set: setRepMax },
                { label: "Working sets", value: earlySets, set: setEarlySets },
                { label: "Last sets",    value: lastSets,  set: setLastSets },
              ].map(({ label, value, set }) => (
                <label key={label} className="space-y-1">
                  <span className="text-xs text-zinc-500">{label}</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    value={value}
                    onChange={(e) => set(e.target.value)}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-orange-500"
                  />
                </label>
              ))}
            </div>

            <label className="block space-y-1">
              <span className="text-xs text-zinc-500">Last set technique</span>
              <select
                value={lastSetTarget}
                onChange={(e) => setLastSetTarget(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-orange-500"
              >
                {FAILURE_TECHNIQUES.map((f) => (
                  <option key={f.value} value={f.value}>{f.label}</option>
                ))}
              </select>
            </label>

            <div className="flex gap-2 pt-1">
              <button
                onClick={onClose}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-zinc-800 text-zinc-400 hover:bg-zinc-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-orange-500 text-white hover:bg-orange-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving ? "Saving…" : <><Check size={15} /> Save</>}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── ProgramEditModal ──────────────────────────────────────────────────────────

function ProgramEditModal({
  program,
  onSave,
  onClose,
}: {
  program: BuilderProgram;
  onSave: (fields: { name: string; description: string; category: string }) => Promise<void>;
  onClose: () => void;
}) {
  const [name, setName] = useState(program.name);
  const [description, setDescription] = useState(program.description ?? "");
  const [category, setCategory] = useState(program.category ?? "");
  const [saving, setSaving] = useState(false);

  const CATEGORIES = ["Strength", "Hypertrophy", "Powerlifting", "Conditioning", "Other"];

  async function handleSave() {
    if (!name.trim()) return;
    setSaving(true);
    await onSave({ name: name.trim(), description, category });
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/60 p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-sm space-y-4 p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-zinc-100 text-sm">Edit Program</h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300"><X size={18} /></button>
        </div>

        <label className="block space-y-1">
          <span className="text-xs text-zinc-500">Name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoCorrect="off"
            className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-orange-500"
          />
        </label>

        <label className="block space-y-1">
          <span className="text-xs text-zinc-500">Description</span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-orange-500 resize-none"
          />
        </label>

        <label className="block space-y-1">
          <span className="text-xs text-zinc-500">Category</span>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-orange-500"
          >
            <option value="">— None —</option>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>

        <div className="flex gap-2 pt-1">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-zinc-800 text-zinc-400 hover:bg-zinc-700 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !name.trim()}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-orange-500 text-white hover:bg-orange-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {saving ? "Saving…" : <><Check size={15} /> Save</>}
          </button>
        </div>
      </div>
    </div>
  );
}
