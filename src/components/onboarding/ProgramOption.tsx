import type { LucideIcon } from "lucide-react";

interface Props {
  title: string;
  detail: string;
  selected: boolean;
  onSelect: () => void;
  icon?: LucideIcon;
}

/** One choice on the program step, as a radio card. */
export default function ProgramOption({ title, detail, selected, onSelect, icon: Icon }: Props) {
  return (
    <button
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={`w-full text-left rounded-2xl p-4 flex items-center gap-3 border transition-colors cursor-pointer ${
        selected ? "border-primary bg-primary/10" : "border-border bg-surface hover:border-muted"
      }`}
    >
      {Icon && <Icon size={20} className={selected ? "text-primary" : "text-muted"} />}
      <div className="flex-1 min-w-0">
        <p className="font-display font-bold text-base text-fg leading-tight">{title}</p>
        <p className="text-xs text-muted mt-0.5 line-clamp-2">{detail}</p>
      </div>
      <span
        aria-hidden
        className={`w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center ${selected ? "border-primary" : "border-border"}`}
      >
        {selected && <span className="w-2.5 h-2.5 rounded-full bg-primary" />}
      </span>
    </button>
  );
}
