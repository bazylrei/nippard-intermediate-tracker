import { useState } from "react";
import { Trash2 } from "lucide-react";

/** "Delete exercise", which asks to confirm before calling `onDelete`. */
export default function DeleteExerciseControl({ name, onDelete }: { name: string; onDelete: () => void }) {
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <button onClick={() => setConfirming(true)} className="flex items-center justify-center gap-2 py-3 text-sm font-medium text-danger cursor-pointer">
        <Trash2 size={16} /> Delete exercise
      </button>
    );
  }
  return (
    <div className="glass gloss rounded-2xl p-4 space-y-3">
      <p className="text-sm text-fg">Delete “{name}”? This can&apos;t be undone.</p>
      <div className="flex gap-2">
        <button onClick={() => { setConfirming(false); onDelete(); }} className="flex-1 rounded-xl py-2 text-sm font-semibold bg-danger/10 text-danger cursor-pointer">Delete</button>
        <button onClick={() => setConfirming(false)} className="flex-1 rounded-xl py-2 text-sm font-semibold bg-elevated text-fg cursor-pointer">Cancel</button>
      </div>
    </div>
  );
}
