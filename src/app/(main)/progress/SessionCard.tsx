"use client";

import { useState } from "react";
import {
  getSessionSets, updateSetLog, deleteWorkoutSession, deleteSetLog,
  deleteExerciseSetsFromSession, updateExerciseIdForSets,
} from "@/lib/db";
import type { WorkoutSession, SetLog } from "@/lib/types";
import { DAY_LABELS } from "@/lib/program-data";
import AddExerciseForm from "./AddExerciseForm";
import { ChevronDown, Pencil, Check, X, Trash2, Plus } from "lucide-react";

function formatDate(iso: string): string {
  const [, m, d] = iso.split("-");
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${months[parseInt(m) - 1]} ${parseInt(d)}`;
}

interface Props {
  session: WorkoutSession;
  exerciseName: Record<string, string>;
  allExercises: { id: string; name: string; muscleGroup: string }[];
  userId: string | null;
  onDelete: () => void;
}

export default function SessionCard({ session, exerciseName, allExercises, userId, onDelete }: Props) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [sets, setSets] = useState<SetLog[] | undefined>(undefined);
  const [editingSetId, setEditingSetId] = useState<string | null>(null);
  const [editWeight, setEditWeight] = useState("");
  const [editReps, setEditReps] = useState("");
  const [confirmDeleteSession, setConfirmDeleteSession] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDeleteSetId, setConfirmDeleteSetId] = useState<string | null>(null);
  const [confirmDeleteExKey, setConfirmDeleteExKey] = useState<string | null>(null);
  const [deletingItem, setDeletingItem] = useState(false);
  const [editExKey, setEditExKey] = useState<string | null>(null);
  const [editExSearch, setEditExSearch] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);

  async function toggle() {
    setEditingSetId(null);
    setConfirmDeleteSession(false);
    setConfirmDeleteSetId(null);
    setConfirmDeleteExKey(null);
    setEditExKey(null);
    setEditExSearch("");
    setShowAddForm(false);
    if (!isExpanded && sets === undefined) {
      const loaded = await getSessionSets(session.id);
      setSets(loaded);
    }
    setIsExpanded((prev) => !prev);
  }

  async function saveEdit(setId: string) {
    const w = parseFloat(editWeight);
    const r = parseInt(editReps, 10);
    if (isNaN(w) || isNaN(r) || w < 0 || r <= 0) return;
    await updateSetLog(setId, w, r, null);
    setSets((prev) => prev?.map((s) => s.id === setId ? { ...s, weight: w, reps: r } : s));
    setEditingSetId(null);
  }

  async function handleDeleteSession() {
    setDeleting(true);
    await deleteWorkoutSession(session.id);
    onDelete();
    setDeleting(false);
  }

  async function handleDeleteSet(setId: string) {
    setDeletingItem(true);
    await deleteSetLog(setId);
    setSets((prev) => prev?.filter((s) => s.id !== setId));
    setConfirmDeleteSetId(null);
    setDeletingItem(false);
  }

  async function handleDeleteExercise(exerciseId: string) {
    setDeletingItem(true);
    await deleteExerciseSetsFromSession(session.id, exerciseId);
    setSets((prev) => prev?.filter((s) => s.exerciseId !== exerciseId));
    setConfirmDeleteExKey(null);
    setDeletingItem(false);
  }

  async function handleEditExercise(oldExId: string, newExId: string) {
    if (!newExId || newExId === oldExId) { setEditExKey(null); setEditExSearch(""); return; }
    await updateExerciseIdForSets(session.id, oldExId, newExId);
    setSets((prev) => prev?.map((s) => s.exerciseId === oldExId ? { ...s, exerciseId: newExId } : s));
    setEditExKey(null);
    setEditExSearch("");
  }

  const workingSets = (sets ?? []).filter((s) => s.setIndex >= 0);
  const exerciseOrder: string[] = [];
  const setsByExercise: Record<string, SetLog[]> = {};
  for (const s of workingSets) {
    if (!setsByExercise[s.exerciseId]) { exerciseOrder.push(s.exerciseId); setsByExercise[s.exerciseId] = []; }
    setsByExercise[s.exerciseId].push(s);
  }

  return (
    <div className="bg-surface border border-border rounded-2xl overflow-hidden">
      <div className="flex items-center px-4 py-3.5">
        <button onClick={toggle} className="flex-1 flex items-center justify-between text-left cursor-pointer">
          <div>
            <p className="font-display font-semibold text-sm text-fg">
              {DAY_LABELS[session.dayType] ?? session.dayType}
              <span className="text-muted font-normal ml-2">· Week {session.week}</span>
            </p>
            <p className="text-xs text-muted mt-0.5">
              {session.completedAt ? formatDate(session.completedAt.split("T")[0]) : ""}
            </p>
          </div>
          <ChevronDown size={16} className={`text-muted transition-transform shrink-0 ml-2 ${isExpanded ? "rotate-180" : ""}`} />
        </button>

        {confirmDeleteSession ? (
          <div className="flex items-center gap-2 ml-3 shrink-0">
            <button onClick={handleDeleteSession} disabled={deleting} className="text-xs font-display font-semibold text-danger hover:opacity-80 transition-opacity disabled:opacity-50 cursor-pointer">
              {deleting ? "Deleting…" : "Confirm"}
            </button>
            <button onClick={() => setConfirmDeleteSession(false)} className="text-muted hover:text-fg transition-colors cursor-pointer"><X size={14} /></button>
          </div>
        ) : (
          <button onClick={(e) => { e.stopPropagation(); setConfirmDeleteSession(true); }} className="ml-3 shrink-0 text-subtle hover:text-danger transition-colors p-1 cursor-pointer">
            <Trash2 size={15} />
          </button>
        )}
      </div>

      {isExpanded && (
        <div className="border-t border-border px-4 py-3 space-y-4">
          {sets === undefined ? (
            <p className="text-xs text-muted py-2">Loading…</p>
          ) : exerciseOrder.length === 0 ? (
            <p className="text-xs text-muted py-2">No sets logged.</p>
          ) : exerciseOrder.map((exId) => {
            const exKey = `${session.id}:${exId}`;
            const isEditingEx = editExKey === exKey;
            const filteredEx = allExercises.filter((e) => e.name.toLowerCase().includes(editExSearch.toLowerCase())).slice(0, 25);
            return (
              <div key={exId}>
                {isEditingEx ? (
                  <div className="mb-2 space-y-1">
                    <div className="flex items-center gap-2">
                      <input autoFocus type="text" value={editExSearch} onChange={(e) => setEditExSearch(e.target.value)} placeholder="Search exercise…" className="flex-1 text-xs bg-elevated border border-primary/50 rounded-lg px-2 py-1.5 text-fg focus:outline-none focus:border-primary" />
                      <button onClick={() => { setEditExKey(null); setEditExSearch(""); }} className="text-muted hover:text-fg cursor-pointer"><X size={14} /></button>
                    </div>
                    <div className="bg-elevated border border-border rounded-xl overflow-hidden max-h-36 overflow-y-auto">
                      {filteredEx.length === 0 ? <p className="text-xs text-muted px-3 py-2">No matches</p> : filteredEx.map((e) => (
                        <button key={e.id} onClick={() => handleEditExercise(exId, e.id)} className={`w-full text-left px-3 py-1.5 text-xs transition-colors cursor-pointer ${e.id === exId ? "text-primary bg-primary/10" : "text-fg hover:bg-border"}`}>{e.name}</button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-display font-semibold text-muted uppercase tracking-wider">{exerciseName[exId] ?? exId}</p>
                    <div className="flex items-center gap-0.5 shrink-0 ml-2">
                      {confirmDeleteExKey === exKey ? (
                        <>
                          <button onClick={() => handleDeleteExercise(exId)} disabled={deletingItem} className="text-xs font-display font-semibold text-danger hover:opacity-80 transition-opacity disabled:opacity-50 mr-1 cursor-pointer">{deletingItem ? "…" : "Remove"}</button>
                          <button onClick={() => setConfirmDeleteExKey(null)} className="text-muted hover:text-fg cursor-pointer"><X size={12} /></button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => { setEditExKey(exKey); setEditExSearch(""); setConfirmDeleteExKey(null); }} className="text-subtle hover:text-primary transition-colors p-0.5 cursor-pointer" title="Change exercise"><Pencil size={12} /></button>
                          <button onClick={() => setConfirmDeleteExKey(exKey)} className="text-subtle hover:text-danger transition-colors p-0.5 cursor-pointer"><Trash2 size={12} /></button>
                        </>
                      )}
                    </div>
                  </div>
                )}
                <div className="space-y-1">
                  {setsByExercise[exId].map((set) => {
                    if (editingSetId === set.id) return (
                      <div key={set.id} className="flex items-center gap-2 bg-elevated border border-border rounded-xl px-3 py-2">
                        <input type="number" value={editWeight} onChange={(e) => setEditWeight(e.target.value)} step="any" min="0" className="w-20 bg-surface border border-border rounded-lg px-2 py-1 text-fg text-sm text-center focus:outline-none focus:border-primary" placeholder="kg" />
                        <span className="text-muted text-xs">kg ×</span>
                        <input type="number" value={editReps} onChange={(e) => setEditReps(e.target.value)} min="1" className="w-16 bg-surface border border-border rounded-lg px-2 py-1 text-fg text-sm text-center focus:outline-none focus:border-primary" placeholder="reps" />
                        <span className="text-muted text-xs flex-1">reps</span>
                        <button onClick={() => saveEdit(set.id)} className="text-accent hover:opacity-80 transition-opacity cursor-pointer"><Check size={16} /></button>
                        <button onClick={() => setEditingSetId(null)} className="text-muted hover:text-fg transition-colors cursor-pointer"><X size={16} /></button>
                      </div>
                    );
                    if (confirmDeleteSetId === set.id) return (
                      <div key={set.id} className="flex items-center justify-between px-1 py-1">
                        <span className="text-xs text-muted">{set.weight}kg × {set.reps} reps</span>
                        <div className="flex items-center gap-2 shrink-0">
                          <button onClick={() => handleDeleteSet(set.id)} disabled={deletingItem} className="text-xs font-display font-semibold text-danger hover:opacity-80 transition-opacity disabled:opacity-50 cursor-pointer">{deletingItem ? "…" : "Delete"}</button>
                          <button onClick={() => setConfirmDeleteSetId(null)} className="text-muted hover:text-fg cursor-pointer"><X size={14} /></button>
                        </div>
                      </div>
                    );
                    return (
                      <div key={set.id} className="flex items-center justify-between px-1 py-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs px-1.5 py-0.5 rounded-md font-display font-semibold bg-elevated text-muted">{set.setIndex + 1}</span>
                          <span className="text-sm text-fg font-medium">{set.weight}kg × {set.reps} reps</span>
                          {set.rpe && <span className="text-xs text-subtle">@ RPE {set.rpe}</span>}
                        </div>
                        <div className="flex items-center gap-0.5">
                          <button onClick={() => { setEditingSetId(set.id); setEditWeight(String(set.weight)); setEditReps(String(set.reps)); }} className="text-subtle hover:text-primary transition-colors p-1 cursor-pointer"><Pencil size={13} /></button>
                          <button onClick={() => setConfirmDeleteSetId(set.id)} className="text-subtle hover:text-danger transition-colors p-1 cursor-pointer"><Trash2 size={13} /></button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {showAddForm && userId ? (
            <AddExerciseForm
              sessionId={session.id}
              allExercises={allExercises}
              userId={userId}
              onSave={(newSets) => { setSets((prev) => [...(prev ?? []), ...newSets]); setShowAddForm(false); }}
              onCancel={() => setShowAddForm(false)}
            />
          ) : (
            <button onClick={() => setShowAddForm(true)} className="mt-2 text-xs text-subtle hover:text-primary transition-colors flex items-center gap-1 cursor-pointer">
              <Plus size={12} /> Add exercise
            </button>
          )}
        </div>
      )}
    </div>
  );
}
