import Link from "next/link";
import { ChevronRight, Globe, Lock, Users } from "lucide-react";
import { programHref } from "@/lib/program-routes";
import type { ProgramRow } from "@/lib/types";

/** One program in the list; opens its preview. `isCurrent` marks the one the user follows. */
export default function ProgramCard({ program, isCurrent = false }: { program: ProgramRow; isCurrent?: boolean }) {
  const VisibilityIcon = program.isPublic ? Globe : Lock;
  return (
    <Link
      href={programHref(program.id)}
      className="glass gloss rounded-2xl p-4 flex items-center gap-3 transition-opacity hover:opacity-80"
    >
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-2 min-w-0">
          <p className="font-display font-bold text-base text-fg leading-tight truncate">{program.name}</p>
          {isCurrent && (
            <span className="shrink-0 text-[10px] font-display font-bold uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded-full">
              Current
            </span>
          )}
        </div>
        {program.description && <p className="text-xs text-muted line-clamp-1">{program.description}</p>}
        <div className="flex items-center gap-3 text-xs text-subtle flex-wrap">
          {program.category && (
            <span className="bg-elevated text-muted px-2 py-0.5 rounded-full">{program.category}</span>
          )}
          <span>{program.totalWeeks} {program.totalWeeks === 1 ? "week" : "weeks"}</span>
          <span className="flex items-center gap-1">
            <Users size={11} />
            {program.userCount} {program.userCount === 1 ? "user" : "users"}
          </span>
          <span className="flex items-center gap-1">
            <VisibilityIcon size={11} />
            {program.isPublic ? "Public" : "Private"}
          </span>
        </div>
      </div>
      <ChevronRight size={16} className="text-subtle shrink-0" />
    </Link>
  );
}
