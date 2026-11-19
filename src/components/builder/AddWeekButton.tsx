import { Plus } from "lucide-react";

export default function AddWeekButton({ onAdd }: { onAdd: () => void }) {
  return (
    <button
      onClick={onAdd}
      className="w-full flex items-center justify-center gap-2 py-3 text-sm text-subtle hover:text-primary transition-colors border border-dashed border-border hover:border-primary/40 rounded-2xl"
    >
      <Plus size={14} /> Add week
    </button>
  );
}
