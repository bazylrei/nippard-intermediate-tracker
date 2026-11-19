import { TrendingUp, BarChart3 } from "lucide-react";

export type ProgressTab = "exercise" | "volume";

const TABS = [
  { key: "exercise", label: "Exercise", icon: TrendingUp },
  { key: "volume",   label: "Volume",   icon: BarChart3  },
] as const satisfies readonly { key: ProgressTab; label: string; icon: unknown }[];

export const isProgressTab = (v: string | null): v is ProgressTab => TABS.some((t) => t.key === v);

/** Segment control switching between the Progress screen's tabs. */
export default function ProgressTabBar({ tab, onSelect }: { tab: ProgressTab; onSelect: (tab: ProgressTab) => void }) {
  return (
    <div className="px-4 py-3 border-b border-border">
      <div className="flex bg-elevated rounded-xl p-1 gap-1">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => onSelect(key)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-display font-semibold transition-all cursor-pointer ${
              tab === key ? "bg-primary text-primary-fg shadow-sm" : "text-muted hover:text-fg"
            }`}
          >
            <Icon size={13} />
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
