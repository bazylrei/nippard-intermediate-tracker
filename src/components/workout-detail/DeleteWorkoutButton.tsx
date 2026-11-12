"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";

interface Props {
  /** Resolves true when the workout is gone. */
  onDelete: () => Promise<boolean>;
}

export default function DeleteWorkoutButton({ onDelete }: Props) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  async function confirm() {
    setBusy(true);
    const ok = await onDelete();
    setBusy(false);
    if (!ok) setConfirming(false);
  }

  if (!confirming) return (
    <button onClick={() => setConfirming(true)} className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl text-sm font-display font-semibold text-danger border border-danger/30 hover:bg-danger/10 transition-colors cursor-pointer">
      <Trash2 size={15} /> Delete workout
    </button>
  );

  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-danger/40 bg-danger/10 px-4 py-3">
      <span className="text-sm text-danger">Delete this workout and all its sets?</span>
      <div className="flex items-center gap-3 shrink-0">
        <button onClick={confirm} disabled={busy} className="text-sm font-display font-semibold text-danger disabled:opacity-50 cursor-pointer">
          {busy ? "Deleting…" : "Delete"}
        </button>
        <button onClick={() => setConfirming(false)} className="text-sm text-muted hover:text-fg cursor-pointer">Cancel</button>
      </div>
    </div>
  );
}
