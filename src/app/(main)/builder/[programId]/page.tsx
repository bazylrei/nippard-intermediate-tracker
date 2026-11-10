"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import {
  getBuilderProgram, updateProgramDayExercise, updateProgram, toggleProgramPublic,
  getAllExercises, addProgramWeek, addProgramDay, addExerciseToDay, duplicateProgramWeek,
} from "@/lib/db";
import type { BuilderProgram, BuilderExercise, BuilderDay } from "@/lib/types";
import { ArrowLeft, ChevronDown, ChevronRight, Globe, Lock, Pencil, Check, X, Users, Plus, Copy } from "lucide-react";

type ExerciseInfo = { id: string; name: string; muscleGroup: string; warmupProtocol: string };

const DAY_TYPE_LABELS: Record<string, string> = {
  "upper-a":     "Upper A",
  "lower-a":     "Lower A",
  "back-biceps": "Back & Biceps",
  "push":        "Push",
  "lower-b":     "Lower B",
};

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
    <Suspense fallback={
      <div className="max-w-2xl mx-auto p-4 md:p-8">
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-16 bg-zinc-800 rounded-2xl" />)}
        </div>
      </div>
    }>
      <ProgramEditorPage />
    </Suspense>
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
  const [editingExercise, setEditingExercise] = useState<BuilderExercise | null>(null);
  const [editingProgram, setEditingProgram] = useState(false);
  const [addingDayToWeek, setAddingDayToWeek] = useState<number | null>(null);
  const [addDayType, setAddDayType] = useState("");
  const [addingExerciseToDayId, setAddingExerciseToDayId] = useState<string | null>(null);
  const [duplicatingWeek, setDuplicatingWeek] = useState<number | null>(null);

  const load = useCallback(async () => {
    const sb = createClient();
    const { data: { user } } = await sb.auth.getUser();
    if (!user) { router.replace("/auth"); return; }
    setUserId(user.id);
    const [data, exercises] = await Promise.all([
      getBuilderProgram(programId),
      getAllExercises(),
    ]);
    setProgram(data);
    setAllExercises(exercises);
    setLoading(false);
  }, [programId, router]);

  useEffect(() => { load(); }, [load]);

  const isOwner = !!userId && program?.createdBy === userId;

  function toggleWeek(week: number) {
    setExpandedWeeks((prev) => {
      const next = new Set(prev);
      if (next.has(week)) next.delete(week);
      else next.add(week);
      return next;
    });
  }

  async function handleTogglePublic() {
    if (!program) return;
    const next = !program.isPublic;
    setProgram((p) => p ? { ...p, isPublic: next } : p);
    await toggleProgramPublic(program.id, next);
  }

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
          exercises: day.exercises.map((ex) =>
            ex.pdeId === pdeId ? { ...ex, ...resolvedFields } : ex
          ),
        })),
      };
    });
    setEditingExercise(null);
  }

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

  async function handleAddDay(week: number, dayType: string) {
    if (!program || !dayType.trim()) return;
    const daysInWeek = program.days.filter((d) => d.week === week);
    const newDay = await addProgramDay(program.id, week, daysInWeek.length, dayType.trim());
    setProgram((p) => p ? { ...p, days: [...p.days, newDay] } : p);
    setAddingDayToWeek(null);
    setAddDayType("");
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
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto p-4 md:p-8">
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-16 bg-zinc-800 rounded-2xl" />)}
        </div>
      </div>
    );
  }

  if (!program) {
    return (
      <div className="max-w-2xl mx-auto p-4 md:p-8 text-center text-zinc-500 py-16">
        Program not found.
      </div>
    );
  }

  const maxWeek = Math.max(program.totalWeeks, program.days.length > 0 ? Math.max(...program.days.map((d) => d.week)) : 0, 0);
  const weeks = maxWeek > 0 ? Array.from({ length: maxWeek }, (_, i) => i + 1) : [];

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => router.push("/builder")} className="text-zinc-400 hover:text-zinc-100 transition-colors">
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-lg font-bold text-zinc-100 truncate">{program.name}</h1>
            {isOwner && (
              <button onClick={() => setEditingProgram(true)} className="text-zinc-500 hover:text-orange-400 transition-colors">
                <Pencil size={14} />
              </button>
            )}
          </div>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-xs text-zinc-500">{program.totalWeeks} weeks</span>
            <span className="flex items-center gap-1 text-xs text-zinc-500">
              <Users size={11} />
              {program.userCount} {program.userCount === 1 ? "user" : "users"}
            </span>
            {program.category && (
              <span className="text-xs bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full">{program.category}</span>
            )}
          </div>
        </div>
        {isOwner && (
          <button
            onClick={handleTogglePublic}
            className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-colors shrink-0 ${
              program.isPublic
                ? "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
            }`}
          >
            {program.isPublic ? <Globe size={13} /> : <Lock size={13} />}
            {program.isPublic ? "Public" : "Private"}
          </button>
        )}
      </div>

      {program.description && <p className="text-sm text-zinc-400">{program.description}</p>}

      {/* Week accordion */}
      <div className="space-y-2">
        {weeks.map((week) => {
          const daysInWeek = program.days.filter((d) => d.week === week).sort((a, b) => a.dayIndex - b.dayIndex);
          const expanded = expandedWeeks.has(week);
          return (
            <div key={week} className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
              <div className="flex items-center">
                <button
                  onClick={() => toggleWeek(week)}
                  className="flex-1 flex items-center justify-between px-4 py-3 text-sm font-semibold text-zinc-200 hover:bg-zinc-800/50 transition-colors"
                >
                  <span>Week {week}</span>
                  {expanded ? <ChevronDown size={16} className="text-zinc-500" /> : <ChevronRight size={16} className="text-zinc-500" />}
                </button>
                {isOwner && (
                  <button
                    onClick={() => handleDuplicateWeek(week)}
                    disabled={duplicatingWeek !== null}
                    className="px-3 py-3 text-zinc-600 hover:text-orange-400 transition-colors disabled:opacity-40"
                    title="Duplicate week to end"
                  >
                    {duplicatingWeek === week ? <span className="text-xs">…</span> : <Copy size={14} />}
                  </button>
                )}
              </div>

              {expanded && (
                <div className="border-t border-zinc-800">
                  {daysInWeek.map((day) => (
                    <DaySection
                      key={day.pdId}
                      day={day}
                      isOwner={isOwner}
                      onEditExercise={setEditingExercise}
                      onAddExercise={isOwner ? () => setAddingExerciseToDayId(day.pdId) : undefined}
                    />
                  ))}

                  {/* Add day */}
                  {isOwner && (
                    addingDayToWeek === week ? (
                      <div className="border-t border-zinc-800 px-4 py-3 flex items-center gap-2">
                        <input
                          autoFocus
                          value={addDayType}
                          onChange={(e) => setAddDayType(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleAddDay(week, addDayType);
                            if (e.key === "Escape") { setAddingDayToWeek(null); setAddDayType(""); }
                          }}
                          placeholder="Day name (e.g. Push, Pull, Legs)"
                          className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm text-zinc-100 focus:outline-none focus:border-orange-500"
                        />
                        <button
                          onClick={() => handleAddDay(week, addDayType)}
                          disabled={!addDayType.trim()}
                          className="text-xs font-medium text-orange-400 hover:text-orange-300 disabled:opacity-40 px-2 py-1.5"
                        >
                          Add
                        </button>
                        <button onClick={() => { setAddingDayToWeek(null); setAddDayType(""); }} className="text-zinc-500 hover:text-zinc-300">
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => { setAddingDayToWeek(week); setAddDayType(""); }}
                        className="border-t border-zinc-800 w-full flex items-center gap-1.5 px-4 py-2.5 text-xs text-zinc-600 hover:text-orange-400 transition-colors"
                      >
                        <Plus size={12} /> Add day
                      </button>
                    )
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
            className="w-full flex items-center justify-center gap-2 py-3 text-sm text-zinc-600 hover:text-orange-400 transition-colors border border-dashed border-zinc-800 hover:border-orange-500/50 rounded-2xl"
          >
            <Plus size={14} /> Add week
          </button>
        )}
      </div>

      {/* Exercise edit modal */}
      {editingExercise && (
        <ExerciseEditModal
          exercise={editingExercise}
          allExercises={allExercises}
          onSave={(fields) => handleSaveExercise(editingExercise.pdeId, fields)}
          onClose={() => setEditingExercise(null)}
        />
      )}

      {/* Add exercise modal */}
      {addingExerciseToDayId && (
        <AddExerciseModal
          allExercises={allExercises}
          onAdd={(exerciseId) => handleAddExerciseToDay(addingExerciseToDayId, exerciseId)}
          onClose={() => setAddingExerciseToDayId(null)}
        />
      )}

      {/* Program edit modal */}
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

function DaySection({
  day,
  isOwner,
  onEditExercise,
  onAddExercise,
}: {
  day: BuilderDay;
  isOwner: boolean;
  onEditExercise: (ex: BuilderExercise) => void;
  onAddExercise?: () => void;
}) {
  return (
    <div className="border-b border-zinc-800 last:border-0">
      <div className="px-4 py-2 bg-zinc-800/30">
        <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">
          Day {day.dayIndex + 1} — {DAY_TYPE_LABELS[day.dayType] ?? day.dayType}
        </span>
      </div>
      {day.exercises.map((ex) => (
        <div key={ex.pdeId} className="flex items-center gap-3 px-4 py-2.5 hover:bg-zinc-800/30 transition-colors">
          <div className="flex-1 min-w-0">
            <span className="text-sm text-zinc-200 font-medium">{ex.name}</span>
            <div className="flex flex-wrap gap-2 mt-0.5">
              <span className="text-xs text-zinc-500">
                {ex.earlySetCount + ex.lastSetCount} sets · {ex.repRangeMin}–{ex.repRangeMax} reps
              </span>
              <span className="text-xs text-zinc-600">
                {WARMUP_PROTOCOLS.find((w) => w.value === ex.warmupProtocol)?.label ?? ex.warmupProtocol} warmup
              </span>
              <span className="text-xs text-zinc-600">
                {FAILURE_TECHNIQUES.find((f) => f.value === ex.lastSetTarget)?.label ?? ex.lastSetTarget}
              </span>
            </div>
          </div>
          {isOwner && (
            <button
              onClick={() => onEditExercise(ex)}
              className="text-zinc-500 hover:text-orange-400 transition-colors p-1 rounded-lg hover:bg-zinc-800"
            >
              <Pencil size={14} />
            </button>
          )}
        </div>
      ))}
      {onAddExercise && (
        <button
          onClick={onAddExercise}
          className="flex items-center gap-1.5 w-full px-4 py-2 text-xs text-zinc-600 hover:text-orange-400 transition-colors"
        >
          <Plus size={11} /> Add exercise
        </button>
      )}
    </div>
  );
}

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
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-sm p-5 space-y-4 max-h-[80vh] flex flex-col">
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
              <div className="sticky top-0 bg-zinc-900 text-xs text-zinc-500 font-semibold uppercase tracking-wide px-1 py-1.5">
                {group}
              </div>
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
            <p className="text-xs text-zinc-600 text-center py-4">No exercises match.</p>
          )}
        </div>
      </div>
    </div>
  );
}

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

  const filtered = search.trim().length > 0
    ? allExercises.filter((e) => e.name.toLowerCase().includes(search.toLowerCase()))
    : allExercises;

  const grouped = filtered.reduce<Record<string, ExerciseInfo[]>>((acc, ex) => {
    const g = ex.muscleGroup;
    if (!acc[g]) acc[g] = [];
    acc[g].push(ex);
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
          <h2 className="font-semibold text-zinc-100 text-sm">Edit Slot</h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300">
            <X size={18} />
          </button>
        </div>

        <div className="shrink-0 space-y-1.5">
          <span className="text-xs text-zinc-500">Exercise</span>
          <button
            onClick={() => setShowPicker((v) => !v)}
            className="w-full flex items-center justify-between bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-zinc-100 hover:border-orange-500 transition-colors"
          >
            <span className="truncate">{selectedName}</span>
            <ChevronDown size={14} className={`text-zinc-500 transition-transform shrink-0 ml-2 ${showPicker ? "rotate-180" : ""}`} />
          </button>
        </div>

        {showPicker && (
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
                  <div className="sticky top-0 bg-zinc-900 text-xs text-zinc-500 font-semibold uppercase tracking-wide px-1 py-1.5">
                    {group}
                  </div>
                  {exs.map((ex) => (
                    <button
                      key={ex.id}
                      onClick={() => { setExerciseId(ex.id); setShowPicker(false); setSearch(""); }}
                      className={`w-full text-left px-2 py-2 rounded-lg text-sm transition-colors ${
                        ex.id === exerciseId
                          ? "bg-orange-500/10 text-orange-400"
                          : "text-zinc-200 hover:bg-zinc-800"
                      }`}
                    >
                      {ex.name}
                    </button>
                  ))}
                </div>
              ))}
              {filtered.length === 0 && (
                <p className="text-xs text-zinc-600 text-center py-4">No exercises match.</p>
              )}
            </div>
          </div>
        )}

        {!showPicker && (
          <div className="space-y-4 flex-1 overflow-y-auto">
            <div className="grid grid-cols-2 gap-3">
              <label className="space-y-1">
                <span className="text-xs text-zinc-500">Rep min</span>
                <input type="number" inputMode="numeric" value={repMin} onChange={(e) => setRepMin(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-orange-500" />
              </label>
              <label className="space-y-1">
                <span className="text-xs text-zinc-500">Rep max</span>
                <input type="number" inputMode="numeric" value={repMax} onChange={(e) => setRepMax(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-orange-500" />
              </label>
              <label className="space-y-1">
                <span className="text-xs text-zinc-500">Working sets</span>
                <input type="number" inputMode="numeric" value={earlySets} onChange={(e) => setEarlySets(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-orange-500" />
              </label>
              <label className="space-y-1">
                <span className="text-xs text-zinc-500">Last sets</span>
                <input type="number" inputMode="numeric" value={lastSets} onChange={(e) => setLastSets(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-orange-500" />
              </label>
            </div>

            <label className="block space-y-1">
              <span className="text-xs text-zinc-500">Last set technique</span>
              <select value={lastSetTarget} onChange={(e) => setLastSetTarget(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-orange-500">
                {FAILURE_TECHNIQUES.map((f) => (
                  <option key={f.value} value={f.value}>{f.label}</option>
                ))}
              </select>
            </label>

            <div className="flex gap-2 pt-1">
              <button onClick={onClose}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-zinc-800 text-zinc-400 hover:bg-zinc-700 transition-colors">
                Cancel
              </button>
              <button onClick={handleSave} disabled={saving}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-orange-500 text-white hover:bg-orange-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                {saving ? "Saving…" : <><Check size={15} /> Save</>}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

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
          <input value={name} onChange={(e) => setName(e.target.value)} autoCorrect="off"
            className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-orange-500" />
        </label>

        <label className="block space-y-1">
          <span className="text-xs text-zinc-500">Description</span>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-orange-500 resize-none" />
        </label>

        <label className="block space-y-1">
          <span className="text-xs text-zinc-500">Category</span>
          <select value={category} onChange={(e) => setCategory(e.target.value)}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-orange-500">
            <option value="">— None —</option>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>

        <div className="flex gap-2 pt-1">
          <button onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-zinc-800 text-zinc-400 hover:bg-zinc-700 transition-colors">
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving || !name.trim()}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-orange-500 text-white hover:bg-orange-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
            {saving ? "Saving…" : <><Check size={15} /> Save</>}
          </button>
        </div>
      </div>
    </div>
  );
}
