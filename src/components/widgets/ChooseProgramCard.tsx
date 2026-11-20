import Link from "next/link";
import { LibraryBig, Plus } from "lucide-react";
import { NEW_PROGRAM_HREF, PROGRAMS_PATH } from "@/lib/program-routes";

interface Props {
  heading?: string;
  message?: string;
}

/** For someone following no program: pick a ready-made one or build their own. */
export default function ChooseProgramCard({
  heading = "Choose a program",
  message = "Follow a ready-made program or build your own. You can switch any time.",
}: Props) {
  return (
    <div className="glass gloss rounded-2xl p-5 space-y-4">
      <div className="space-y-1">
        <span className="font-display font-bold text-xs uppercase tracking-widest text-primary">No program yet</span>
        <h2 className="font-display font-bold text-2xl text-fg leading-tight">{heading}</h2>
        <p className="text-sm text-muted">{message}</p>
      </div>
      <div className="space-y-2">
        <Link
          href={PROGRAMS_PATH}
          className="btn-primary gloss w-full flex items-center justify-center gap-2 font-display font-bold text-base py-3.5 rounded-2xl"
        >
          <LibraryBig size={16} />
          Browse programs
        </Link>
        <Link
          href={NEW_PROGRAM_HREF}
          className="w-full flex items-center justify-center gap-2 bg-surface border border-border text-fg font-display font-semibold text-sm py-3 rounded-2xl hover:border-primary transition-colors"
        >
          <Plus size={14} />
          Create your own
        </Link>
      </div>
    </div>
  );
}
