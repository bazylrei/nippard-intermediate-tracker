import { ChevronRight } from "lucide-react";

export default function SkipExerciseButton({ onSkip }: { onSkip: () => void }) {
  return (
    <button
      onClick={onSkip}
      className="w-full flex items-center justify-center gap-1.5 text-sm text-subtle hover:text-muted py-2 transition-colors cursor-pointer"
    >
      Skip exercise
      <ChevronRight size={14} />
    </button>
  );
}
