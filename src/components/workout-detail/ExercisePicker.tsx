import { useState } from "react";
import type { ExerciseOption } from "@/hooks/useExerciseCatalog";

const MAX_RESULTS = 25;

interface Props {
  options: ExerciseOption[];
  /** Highlighted as the current choice, if any. */
  selectedId?: string;
  onPick: (option: ExerciseOption) => void;
}

/** Search box + filtered exercise list. */
export default function ExercisePicker({ options, selectedId, onPick }: Props) {
  const [query, setQuery] = useState("");
  const matches = options
    .filter((e) => e.name.toLowerCase().includes(query.toLowerCase()))
    .slice(0, MAX_RESULTS);

  return (
    <div className="space-y-1">
      <input
        autoFocus
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search exercise…"
        aria-label="Search exercise"
        className="w-full text-xs bg-elevated border border-border rounded-xl px-3 py-2 text-fg focus:outline-none focus:border-primary"
      />
      <div className="bg-elevated border border-border rounded-xl overflow-hidden max-h-36 overflow-y-auto">
        {matches.length === 0 ? (
          <p className="text-xs text-muted px-3 py-2">No matches</p>
        ) : matches.map((e) => (
          <button
            key={e.id}
            onClick={() => onPick(e)}
            className={`w-full text-left px-3 py-1.5 text-xs transition-colors cursor-pointer ${
              e.id === selectedId ? "text-primary bg-primary/10" : "text-fg hover:bg-border"
            }`}
          >
            {e.name}
          </button>
        ))}
      </div>
    </div>
  );
}
