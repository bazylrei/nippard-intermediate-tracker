import { Search } from "lucide-react";

export default function ExerciseSearchBox({ value, onChange }: { value: string; onChange: (query: string) => void }) {
  return (
    <div className="relative">
      <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-subtle" />
      <input
        type="search"
        aria-label="Search exercises"
        placeholder="Search exercises…"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl pl-9 pr-3 py-2.5 text-sm text-fg bg-elevated border border-border focus:outline-none focus:border-primary"
      />
    </div>
  );
}
