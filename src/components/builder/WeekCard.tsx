"use client";

import type { BuilderDay, BuilderExercise } from "@/lib/types";
import { ChevronDown, ChevronRight, Pencil, X, Plus, Copy, Trash2 } from "lucide-react";
import { DAY_TYPE_LABELS, FAILURE_TECHNIQUES, WARMUP_PROTOCOLS } from "./constants";

interface Props {
  week: number;
  days: BuilderDay[];
  expanded: boolean;
  isOwner: boolean;
  confirmDelete: string | null;
  deletingKey: string | null;
  duplicatingWeek: number | null;
  duplicateTargetWeek: number;
  onToggle: () => void;
  onAskDelete: (key: string) => void;
  onCancelDelete: () => void;
  onDeleteWeek: () => void;
  onDeleteDay: (pdId: string) => void;
  onDeleteExercise: (pdeId: string) => void;
  onDuplicate: () => void;
  onEditExercise: (ex: BuilderExercise) => void;
  onAddExercise: (pdId: string) => void;
  onAddDay: () => void;
}

export default function WeekCard({
  week, days: daysInWeek, expanded, isOwner, confirmDelete, deletingKey, duplicatingWeek, duplicateTargetWeek,
  onToggle, onAskDelete, onCancelDelete, onDeleteWeek, onDeleteDay, onDeleteExercise,
  onDuplicate, onEditExercise, onAddExercise, onAddDay,
}: Props) {
  const weekKey = `week:${week}`;
  const isConfirmingDelete = confirmDelete === weekKey;
  const isDuplicating = duplicatingWeek === week;

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">

      {/* Week header */}
      <div className="flex items-center gap-1 px-4 py-3">
        <button
          onClick={() => onToggle()}
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
                onClick={() => onDeleteWeek()}
                disabled={deletingKey === weekKey}
                className="text-xs font-medium text-red-400 hover:text-red-300 disabled:opacity-50"
              >
                {deletingKey === weekKey ? "…" : "Delete"}
              </button>
              <button onClick={() => onCancelDelete()} className="text-zinc-600 hover:text-zinc-400">
                <X size={14} />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-0.5 shrink-0">
              <button
                onClick={() => onDuplicate()}
                disabled={isDuplicating || duplicatingWeek !== null}
                title="Duplicate week to end"
                className="text-zinc-600 hover:text-orange-400 transition-colors p-1.5 disabled:opacity-40"
              >
                {isDuplicating ? <span className="text-xs">…</span> : <Copy size={14} />}
              </button>
              <button
                onClick={() => onAskDelete(weekKey)}
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
                          onClick={() => onDeleteDay(day.pdId)}
                          disabled={deletingKey === dayKey}
                          className="text-xs font-medium text-red-400 hover:text-red-300 disabled:opacity-50"
                        >
                          {deletingKey === dayKey ? "…" : "Delete"}
                        </button>
                        <button onClick={() => onCancelDelete()} className="text-zinc-600 hover:text-zinc-400">
                          <X size={13} />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => onAskDelete(dayKey)}
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
                              onClick={() => onDeleteExercise(ex.pdeId)}
                              disabled={deletingKey === exKey}
                              className="text-xs font-medium text-red-400 hover:text-red-300 disabled:opacity-50"
                            >
                              {deletingKey === exKey ? "…" : "Delete"}
                            </button>
                            <button onClick={() => onCancelDelete()} className="text-zinc-600 hover:text-zinc-400">
                              <X size={13} />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-0.5 shrink-0">
                            <button
                              onClick={() => onEditExercise(ex)}
                              className="text-zinc-600 hover:text-orange-400 transition-colors p-1 rounded-lg"
                            >
                              <Pencil size={13} />
                            </button>
                            <button
                              onClick={() => onAskDelete(exKey)}
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
                    onClick={() => onAddExercise(day.pdId)}
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
                onClick={() => onAddDay()}
                className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-orange-400 transition-colors"
              >
                <Plus size={12} /> Add day
              </button>
              <button
                onClick={() => onDuplicate()}
                disabled={duplicatingWeek !== null}
                className="flex items-center gap-1.5 text-xs text-zinc-600 hover:text-orange-400 transition-colors disabled:opacity-40"
              >
                <Copy size={12} />
                {duplicatingWeek === week ? "Duplicating…" : `Duplicate to Week ${duplicateTargetWeek}`}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
