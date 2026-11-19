import { ChevronLeft, ChevronRight } from "lucide-react";
import SectionHeading from "./SectionHeading";

interface Props {
  /** The title between the arrows, e.g. "Week 3 of 12". */
  label: string;
  headingAs?: "h2" | "h3";
  canGoBack: boolean;
  canGoForward: boolean;
  onBack: () => void;
  onForward: () => void;
}

const ARROW = "p-1 text-muted hover:text-fg disabled:opacity-30 disabled:cursor-default cursor-pointer";

/** Previous / next arrows around a week title, for browsing a program week by week. */
export default function WeekSwitcher({ label, headingAs, canGoBack, canGoForward, onBack, onForward }: Props) {
  return (
    <div className="flex items-center justify-between px-1">
      <button onClick={onBack} disabled={!canGoBack} aria-label="Previous week" className={ARROW}>
        <ChevronLeft size={18} />
      </button>
      <SectionHeading as={headingAs}>{label}</SectionHeading>
      <button onClick={onForward} disabled={!canGoForward} aria-label="Next week" className={ARROW}>
        <ChevronRight size={18} />
      </button>
    </div>
  );
}
